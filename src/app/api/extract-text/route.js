import { NextResponse } from "next/server";
import OpenAI from "openai";

export const POST = async (req) => {
  try {
    // Parse the request body
    const body = await req.json();

    // Initialize OpenAI client with the API key from environment variables
    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });

    // Handle different request types: image or text
    if (body.image) {
      // IMAGE PROCESSING - Extract text from image
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all the text from this dispatch document image. Format the output clearly with proper spacing and structure. Pay special attention to:  \n1. Tables with columns aligned properly \n2. Any form fields and their values \n3. Dates, invoice numbers, and quantities \n4. Company names, addresses, and contact information \n5. Product details and specifications",
              },
              {
                type: "image_url",
                image_url: {
                  url: body.image.startsWith("data:")
                    ? body.image
                    : `data:image/jpeg;base64,${body.image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
      });

      // Return the extracted text
      return NextResponse.json({
        text: response.choices[0].message.content,
      });
    } else if (body.text) {
      // TEXT PROCESSING - Structured data extraction
      const systemMessage =
        body.systemMessage ||
        "You are a helpful assistant that extracts structured data from invoice text.";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: body.text,
          },
        ],
        response_format: { type: "text" },
        temperature: 0.2, // Low temperature for more deterministic outputs
      });

      // Return the structured data
      return NextResponse.json({
        text: response.choices[0].message.content,
      });
    } else {
      return NextResponse.json(
        { error: "No image or text provided" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: error.message },
      { status: 500 }
    );
  }
};
