import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

const pdfToMdSystemPrompt = `\
You are an advanced AI document processing tool. Your task is to convert a PDF document into Markdown format while preserving the original layout and structure.
You will receive a PDF document as input, and your output should be a well-structured Markdown document that accurately represents the content of the PDF.
The PDF may contain text, images, tables, and other elements. Your goal is to extract all relevant information and format it appropriately in Markdown.
Your output should include the following:
- Text Content:** Extract all text from the PDF and format it in Markdown, maintaining headings, paragraphs, and lists.
- Headings:** Use appropriate Markdown syntax for headings (e.g., # for H1, ## for H2, etc.).
- Lists:** Convert bullet points and numbered lists into Markdown lists.
- Links:** Convert any hyperlinks into Markdown format.
- Images:** For each image, include an HTML <img> tag with:
  - \`src="[image-placeholder]"\`
  - An \`alt\` attribute providing a detailed executive summary of the image's content.
  - If the image is a graph or chart, provide an in-depth description of the data and its implications.
- Tables: ** Convert tables into Markdown format, ensuring proper alignment and structure.
- Text Formatting:** Maintain bold, italic, and underline formatting where applicable.
- Footnotes and Endnotes:** Convert footnotes and endnotes into Markdown format.
- Page Numbers:** Include page numbers in the output for reference.
- Metadata:** Include any relevant metadata (e.g., title, author, date) at the beginning of the document.
- Document Structure:** Maintain the original document structure, including sections and subsections.
- Accessibility:** Ensure the output is accessible, with appropriate alt text for images and clear headings for screen readers.
- Clarity and Readability:** Ensure the output is clear and easy to read, with appropriate line breaks and spacing.
- Markdown Syntax:** Use standard Markdown syntax for all formatting.
- No Additional Text:** Do not include any additional text or explanations.
- No Personal Opinions:** Do not include any personal opinions or subjective statements in the output.

VERY IMPORTANT!!!!: NO TRIPLE BACKTICKS:** DO NOT SURROUND THE OUTPUT WITH TRIPLE BACKTICKS FOR ANY CONTENT!!!!
`;

export class PdfToMarkdownConverter {
  /**
   * Removes any triple backticks that might be surrounding the markdown content
   */
  private postProcessMarkdown(text: string): string {
    // Remove markdown code block indicators if they exist
    if (text.startsWith("```markdown") || text.startsWith("```md")) {
      const closingBackticksIndex = text.lastIndexOf("```");
      if (closingBackticksIndex !== -1) {
        // Find the first newline after the opening backticks
        const newlineIndex = text.indexOf("\n");
        if (newlineIndex !== -1 && newlineIndex < closingBackticksIndex) {
          // Extract only the content between the opening and closing backticks
          return text.substring(newlineIndex + 1, closingBackticksIndex).trim();
        }
      }
    }

    // Also handle the case where there are just plain triple backticks with no language specifier
    if (text.startsWith("```") && text.endsWith("```")) {
      return text.substring(3, text.length - 3).trim();
    }

    return text;
  }

  async convert(pdfBlob: Blob): Promise<string> {
    try {
      if (pdfBlob.type !== "application/pdf") {
        throw new Error("Input must be a PDF Blob.");
      }

      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = Buffer.from(pdfArrayBuffer).toString("base64");

      const result = await generateText({
        system: pdfToMdSystemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                mediaType: "application/pdf",
                data: pdfBase64,
              },
              { type: "text", text: "Convert the PDF to Markdown format." },
            ],
          },
        ],
        model: openrouter("google/gemini-2.0-flash-001"),
      });

      // Check if response text exists
      if (!result.text) {
        throw new Error("Model response did not contain text.");
      }

      // Apply post-processing to remove any triple backticks
      const processedText = this.postProcessMarkdown(result.text);

      return processedText;
    } catch (error) {
      console.error("Error converting PDF to markdown:", error);
      throw error;
    }
  }
}

export const pdfToMarkdownConverter = new PdfToMarkdownConverter();
