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
              text: `Please analyze this invoice and extract the following information for ALL dispatch entries in the invoice:
- Date (look for "Invoice Date" or similar)
- Products (look for each "Material Description" or similar)
- Quantities (look for each "Qty" or similar)
- Truck Number (look for "Vehicle Number" or similar)
- Invoice Number (look for "Invoice Number" or similar)

One invoice can contain multiple dispatch entries for different products.

Return ONLY a valid JSON object with this structure: 
{
  "date": "(extracted date, common for all entries)",
  "truckNumber": "(extracted truck number, common for all entries)",
  "invoiceNumber": "(extracted invoice number, common for all entries, it is of the format xx/xxxx-xx)",
  "entries": [
    {
      "product": "(extracted product name)",
      "quantity": "(extracted quantity)"
    },
    {
      "product": "(extracted product name)",
      "quantity": "(extracted quantity)"
    },
    ... additional entries as needed
  ]
}

If you find only one product entry, still return it in the entries array format.
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
