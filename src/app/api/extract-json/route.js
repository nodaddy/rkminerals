import { NextResponse } from "next/server";
import OpenAI from "openai";

export const POST = async (req) => {
  try {
    // Parse the request body to get the image
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Initialize OpenAI client with the API key from environment variables
    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });

    // Call the OpenAI Vision API to extract structured data directly
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // or other suitable models with vision capabilities
      messages: [
        {
          role: "system",
          content:
            "You are a specialized assistant that extracts structured information from invoice images. Always respond with only valid JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this invoice and extract the following information:
- Date (look for "Invoice Date" or similar)
- Product (look for "Material Description" or similar)
- Quantity (look for "Qty" or similar)
- Truck Number (look for "Vehicle Number" or similar)
- Invoice Number (look for "Invoice Number" or similar)

Return ONLY a valid JSON object with these fields: 
{
  "date": "(extracted date)",
  "product": "(extracted product)",
  "quantity": "(extracted quantity)",
  "truckNumber": "(extracted truck number)",
  "invoiceNumber": "(extracted invoice number)"
}

If you cannot find a field, use an empty string for its value.
Do not include any explanations or notes - only return the JSON object.`,
            },
            {
              type: "image_url",
              image_url: {
                url: image.startsWith("data:")
                  ? image
                  : `data:image/jpeg;base64,${image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.2, // Low temperature for more deterministic outputs
    });

    // Parse the JSON response to ensure it's valid
    let result;
    try {
      const content = response.choices[0].message.content;
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing OpenAI response as JSON:", parseError);
      return NextResponse.json(
        { error: "Failed to parse structured data from the image" },
        { status: 500 }
      );
    }

    // Return the structured data
    return NextResponse.json({ result });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json(
      { error: "Failed to process image", details: error.message },
      { status: 500 }
    );
  }
};
