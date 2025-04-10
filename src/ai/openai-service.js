/**
 * OpenAI Service for PDF processing and information extraction
 * This module handles the integration with OpenAI's API for OCR and text extraction
 */

import OpenAI from "openai";

// Remove static imports that cause build issues
// Import PDF.js dynamically only when needed in the browser

// Initialize OpenAI client
let openaiClient = null;

/**
 * Initialize the OpenAI client with the API key
 * @param {string} apiKey - The OpenAI API key
 */
export const initializeOpenAI = (apiKey) => {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }

  openaiClient = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true, // For client-side usage (better to use server-side in production)
  });

  return openaiClient;
};

/**
 * Get or initialize the OpenAI client
 * @param {string} apiKey - Optional API key if not already initialized
 * @returns {OpenAI} The OpenAI client
 */
export const getOpenAIClient = (apiKey) => {
  if (!openaiClient && apiKey) {
    return initializeOpenAI(apiKey);
  }

  if (!openaiClient) {
    throw new Error("OpenAI client not initialized");
  }

  return openaiClient;
};

/**
 * Process a PDF file and extract structured data from it
 * @param {File} pdfFile - The PDF file to process
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Extracted structured data
 */
export const processPdfInvoice = async (pdfFile, apiKey) => {
  try {
    const client = getOpenAIClient(apiKey);

    let imageData;

    // Different handling based on file type
    if (pdfFile.type === "application/pdf") {
      try {
        // Try converting PDF to image
        imageData = await convertPdfToImage(pdfFile);
      } catch (conversionError) {
        console.error("Error converting PDF to image:", conversionError);

        // Fallback to using the base64 of the PDF directly
        try {
          console.log("Attempting fallback: using PDF directly...");
          imageData = await fileToBase64(pdfFile);

          // Try to use the PDF as-is with GPT-4o
          const response = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `I'm providing a PDF invoice. Extract the following information from it: 
                    Date (as Invoice Date), 
                    Product Name (Material Description),
                    Quantity(Qty),
                    Truck Number(Vehicle Number),
                    Invoice Number. 
                    IMPORTANT: Return ONLY a valid JSON object with these fields: date, productName, quantity, truckNumber, invoiceNumber. Do not include any code, explanations, or regex in your response - just the JSON.`,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageData,
                    },
                  },
                ],
              },
            ],
            max_tokens: 1000,
          });

          // Parse fallback response
          const content = response.choices[0].message.content;
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extractedData = JSON.parse(jsonMatch[0]);
            return {
              success: true,
              data: extractedData,
              method: "fallback_direct",
            };
          }
        } catch (fallbackError) {
          console.error("Fallback method failed too:", fallbackError);
          // Continue to error handling below
        }

        // If we get here, both methods failed
        return {
          success: false,
          error:
            "Could not process the PDF. Please upload an image of your invoice instead.",
        };
      }
    } else if (
      pdfFile.type === "image/jpeg" ||
      pdfFile.type === "image/png" ||
      pdfFile.type === "image/gif"
    ) {
      // For images, just use the base64 directly
      imageData = await fileToBase64(pdfFile);
    } else {
      return {
        success: false,
        error:
          "Only PDF, JPEG, PNG and GIF formats are supported. Please upload your invoice in one of these formats.",
      };
    }

    // Use vision API for all files (PDFs are now converted to images)
    const response = await client.chat.completions.create({
      model: "gpt-4o", // Best model for image processing
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the following information from this invoice: 
              Date (as Invoice Date in pdf), 
              Product Name (Material Description in the pdf),
              Quantity(Qty in pdf),
              Truck Number(Vehicle Number in pdf),
              Invoice Number. 
              IMPORTANT: Return ONLY a valid JSON object with these fields: date, productName, quantity, truckNumber, invoiceNumber. Do not include any code, explanations, or regex in your response - just the JSON.`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    // Parse the response
    const content = response.choices[0].message.content;
    try {
      // Extract JSON from the response (handle cases where there might be text before/after the JSON)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log("jsonMatch", jsonMatch);
        const extractedData = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: extractedData,
        };
      } else {
        console.error("Failed to extract JSON from response:", content);
        return {
          success: false,
          error: "Failed to extract structured data from the document",
        };
      }
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      return {
        success: false,
        error: "Failed to parse extracted data",
      };
    }
  } catch (error) {
    console.error("Error processing file:", error);
    return {
      success: false,
      error: error.message || "Unknown error processing file",
    };
  }
};

/**
 * Convert PDF to image
 * @param {File} pdfFile - The PDF file to convert
 * @returns {Promise<string>} Base64 representation of the first page as an image
 */
const convertPdfToImage = async (pdfFile) => {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Need to set worker source before using PDF.js
    if (typeof window !== "undefined") {
      // We're in a browser environment - dynamically import PDF.js
      try {
        // Dynamic import to avoid SSR issues
        const pdfjs = await import("pdfjs-dist/webpack");

        // Set the worker source (only in browser)
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        }

        // Load PDF
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        // Get the first page
        const page = await pdf.getPage(1);

        // Scale the page to a reasonable size for OCR (too high resolution can cause issues)
        // Default is 1.5x scale which provides good quality while keeping size manageable
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        // Create a canvas to render the page
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render the page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Convert canvas to base64 (JPEG format for better compression, quality 0.8 for balance)
        const imageData = canvas.toDataURL("image/jpeg", 0.8);

        return imageData;
      } catch (pdfError) {
        console.error("PDF.js import/usage error:", pdfError);
        throw new Error(`PDF.js error: ${pdfError.message}`);
      }
    } else {
      throw new Error(
        "PDF conversion is only supported in browser environments"
      );
    }
  } catch (error) {
    console.error("PDF conversion error details:", error);
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
};

/**
 * Convert a file to base64 format
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 representation of the file
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the prefix (e.g., "data:application/pdf;base64,")
      const base64 = reader.result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};
