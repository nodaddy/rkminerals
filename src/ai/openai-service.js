/**
 * OpenAI Service for PDF processing and information extraction
 * This module handles the integration with OpenAI's API for OCR and text extraction
 */

import OpenAI from "openai";

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
 * Convert PDF to an image using pdf.js
 * @param {File} pdfFile - The PDF file to convert
 * @returns {Promise<string>} Base64 image data
 */
const convertPdfToImage = async (pdfFile) => {
  try {
    // Create a temporary URL for the PDF file
    const pdfUrl = URL.createObjectURL(pdfFile);

    // Load the PDF.js script dynamically
    if (!window.pdfjsLib) {
      // Load the PDF.js scripts dynamically
      const pdfjsScript = document.createElement("script");
      pdfjsScript.src =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
      document.head.appendChild(pdfjsScript);

      // Wait for the script to load
      await new Promise((resolve) => {
        pdfjsScript.onload = resolve;
      });
    }

    // Now pdfjsLib should be available globally
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

    // Load the PDF
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;

    // Get the first page
    const page = await pdf.getPage(1);

    // Set scale to balance size and quality (1.5 is a good starting point)
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // Create a canvas element
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render the PDF page to the canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Convert canvas to base64 image
    const base64 = canvas.toDataURL("image/jpeg", 0.92);

    // Clean up
    URL.revokeObjectURL(pdfUrl);

    return base64;
  } catch (error) {
    console.error("PDF conversion error:", error);
    throw error;
  }
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

    // Different handling based on file type
    if (pdfFile.type === "application/pdf") {
      // Convert PDF to image
      console.log("Converting PDF to image for processing...");
      try {
        const imageBase64 = await convertPdfToImage(pdfFile);

        // Process the converted image with vision model
        const response = await client.chat.completions.create({
          model: "gpt-4o",
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
                    url: imageBase64,
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
            console.log("jsonMatch (converted PDF)", jsonMatch);
            const extractedData = JSON.parse(jsonMatch[0]);
            return {
              success: true,
              data: extractedData,
            };
          } else {
            console.error("Failed to extract JSON from response:", content);
            return {
              success: false,
              error:
                "Failed to extract structured data from the converted PDF image",
            };
          }
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          return {
            success: false,
            error: "Failed to parse extracted data from converted PDF image",
          };
        }
      } catch (conversionError) {
        console.error("Error converting PDF to image:", conversionError);

        // Fallback to text-only PDF processing if conversion fails
        console.log("Falling back to text-only processing...");
        const response = await client.chat.completions.create({
          model: "gpt-4", // Using text-only model for fallback
          messages: [
            {
              role: "user",
              content: `I have a PDF invoice with text content. Please help me extract the following information: 
                Date (as Invoice Date in pdf), 
                Product Name (Material Description in the pdf),
                Quantity(Qty in pdf),
                Truck Number(Vehicle Number in pdf),
                Invoice Number. 
                IMPORTANT: Return ONLY a valid JSON object with these fields: date, productName, quantity, truckNumber, invoiceNumber. Do not include any code, explanations, or regex in your response - just the JSON.`,
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
            console.log("jsonMatch (fallback)", jsonMatch);
            const extractedData = JSON.parse(jsonMatch[0]);
            return {
              success: true,
              data: extractedData,
            };
          } else {
            console.error("Failed to extract JSON from response:", content);
            return {
              success: false,
              error:
                "Failed to extract structured data from the PDF. Please try uploading an image of the invoice instead.",
              alternativeMethod: true,
            };
          }
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          return {
            success: false,
            error:
              "Failed to parse extracted data from PDF. Please try uploading an image of the invoice instead.",
            alternativeMethod: true,
          };
        }
      }
    } else if (
      pdfFile.type === "image/jpeg" ||
      pdfFile.type === "image/png" ||
      pdfFile.type === "image/gif"
    ) {
      // For images, use the vision API directly
      const base64 = await fileToBase64(pdfFile);
      const response = await client.chat.completions.create({
        model: "gpt-4o",
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
                  url: base64,
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
          console.log("jsonMatch (image)", jsonMatch);
          const extractedData = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            data: extractedData,
          };
        } else {
          console.error("Failed to extract JSON from response:", content);
          return {
            success: false,
            error: "Failed to extract structured data from the image",
          };
        }
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        return {
          success: false,
          error: "Failed to parse extracted data",
        };
      }
    } else {
      return {
        success: false,
        error:
          "Only PDF, JPEG, PNG and GIF formats are supported. Please upload your invoice in one of these formats.",
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
