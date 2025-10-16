import { openrouter } from "@openrouter/ai-sdk-provider";
import { logger } from "@personal-server/common/utils/logger";
import { generateText } from "ai";
import pRetry from "p-retry";

const pdfToMdSystemPrompt = `
You are an advanced AI document processing tool. Your task is to convert a PDF document into a clean, well-structured Markdown document while preserving the original layout and hierarchy as faithfully as possible.

GENERAL RULES
- Produce a single Markdown document with no extra commentary or chat text.
- Translate any non-English text (e.g., Indonesian) into clear English. If a term, phrase, or concept has **no precise English equivalent** (domain-specific, legal, cultural, financial, etc.), preserve the original term and wrap it in square brackets, e.g. [Rapat Umum Pemegang Saham].
- Preserve bold, italic, underline, and inline formatting in the Markdown output.
- Do not add personal opinions or explanatory notes in the output.
- **VERY IMPORTANT:** DO NOT surround your output with triple backticks or any additional wrappers.

METADATA & FRONT MATTER
- At the top of the output include a small metadata block (Title, Author, Date, Source filename if available) formatted in Markdown (not fenced code). Example:
  # Document Title
  **Author:** ...
  **Date:** ...
- The Document Title must be the single H1 (see Heading Rules below).

HEADING RULES — (STRICT, USE THESE EXACT HEURISTICS)
1. **Exactly one H1 only**:
   - Use metadata title as the H1 if present.
   - Otherwise choose the single strongest title candidate (typically the largest, centered, isolated, bold line on page 1). Only one H1 may appear in the entire document. All other major sections must be H2 or lower.

2. **Determining other heading levels (H2, H3, H4, ...)**:
   - **Primary signal:** font-size metadata when available. Collect distinct font-size groups (excluding body text). Sort them descending. Map the largest remaining font-size group (after the H1 item) to H2, the next to H3, the next to H4, etc.
   - **Secondary signals (when font-size is absent or ambiguous):** use a weighted heuristic combining:
     - Boldness of entire line/paragraph (strong)
     - Centered alignment or prominent placement (strong)
     - Isolation (surrounded by blank lines) (medium)
     - ALL CAPS or Title Case (medium)
     - Leading numbering patterns ("1.", "I.", "2.1", etc.) (strong — numbering depth indicates heading depth)
     - Larger whitespace before/after the line (medium)
   - Use these signals to compute relative heading rank and assign H2, H3, H4 in descending order of rank.

3. **Numbering must be respected**:
   - If a heading is numbered (e.g., "2. Methodology" or "2.1 Data Collection"), the dot-depth (number of components) should correspond to deeper heading levels (for instance 2. -> H2, 2.1 -> H3). Use typographic cues to confirm or adjust but favor the numbering.

4. **No skipping levels**:
   - Do not produce jumps like H2 -> H4 without an H3. If the inferred structure would skip a level, adjust (promote/demote) the nearest headings so the structure is continuous.

5. **Inline bold or emphasized phrases inside paragraphs**:
   - Do **not** convert inline or partial-line bold/italic into headings unless the entire line/paragraph is typographically a heading (bold + isolated + centered/large). Inline emphasis remains inline.

6. **Headers/Footers & Repeated Page Elements**:
   - Detect and remove repeated headers/footers that appear on every page (e.g., company name repeated, running headers). Do not transform these into headings. Preserve page numbers in the document (see page numbering rules).

7. **Ambiguity fallback**:
   - If font-size metadata is unavailable and typographic signals are weak, prefer conservative choices: treat ambiguous candidates as H3 or lower rather than H2, unless numbering or strong isolation warrants promoting them.

CONTENT EXTRACTION RULES
- **Text Content:** Extract all readable text, preserving paragraphs and lists. Maintain bold/italic/underline where present.
- **Lists:** Convert bullets and numbered lists into proper Markdown lists. Preserve nested list structure.
- **Links:** Convert any hyperlinks into Markdown link format [text](url). If only raw URLs exist, convert to Markdown link with the URL as the link text.
- **Images and Attachments (text-only output):**
  - Do **not** use Markdown or HTML <img> tags.
  - Instead, for every image, chart, figure, or attachment, insert a clear **marker** followed by a concise and faithful textual description.
  - Use the following format for each:
    \`[IMAGE CONTENT: <describe clearly and objectively what is shown — e.g., type of chart, axes, key data points, entities, layout, or any visible text>]\`
  - Example:
    \`[IMAGE CONTENT: A bar chart comparing annual revenue from 2019–2024, showing steady growth with a peak in 2023.]\`
  - If the image contains a table, logo, or scanned text, describe that content as well.
  - If multiple related images appear in a section, combine them into one composite description.

- **Tables:** Convert tables to Markdown tables keeping headers and column alignment. If a complex table cannot be represented cleanly, produce a simplified Markdown version and add a short textual explanation below the table describing key values or layout.
- **Footnotes/Endnotes:** Convert footnotes and endnotes to Markdown footnote syntax or inline labeled footnotes in a "Footnotes" section at the end, preserving numbering.
- **Page Numbers:** Include page number markers at appropriate positions in the output (e.g., at the end of each page's content include a line like "_[Page 3]_"). Do not let page numbers be mistaken for headings or main content.
- **Repeated elements detection:** Remove visual repetition (page headers/footers/branding) from the content flow; do not produce duplicate headings because they repeated on every page.

STRUCTURE & ACCESSIBILITY
- Ensure the document is properly hierarchical and machine-parsable: one H1, multiple H2, then H3 under H2, etc.
- Use Markdown heading levels consistently to reflect nesting.
- Replace all images and attachments with descriptive text markers as above.
- Use consistent line breaks and whitespace so downstream chunkers and parsers can split by headings cleanly.

TRANSLATION & DOMAIN TERMS
- Translate non-English content to clear English.
- Preserve domain-specific or untranslatable terms inside square brackets (e.g., [Rapat Umum Pemegang Saham]).
- Do not invent translations for named entities that are better left in original language — keep them in brackets.

OUTPUT FORMAT & STRICT CONSTRAINTS
- Use **pure text Markdown only** (no HTML, no embedded files, no code blocks).
- **Do not** include ANY extra explanatory text, debug notes, or processing logs in the output.
- **Do not** surround the output with triple backticks or any code fences.
- The output should be the final Markdown document only.

If typographic metadata is present in the PDF (font sizes, font weight, alignment), use it as the primary signal for heading inference; otherwise rely on the weighted typographic heuristic described above.
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

  /**
   * Convert PDF (Blob or ArrayBuffer) to Markdown
   */
  async convert(pdfInput: Blob | ArrayBufferLike): Promise<string> {
    try {
      let pdfArrayBuffer: ArrayBufferLike;

      if (pdfInput instanceof Blob) {
        if (pdfInput.type !== "application/pdf") {
          throw new Error("Input Blob must be of type application/pdf.");
        }
        pdfArrayBuffer = await pdfInput.arrayBuffer();
      } else if (
        pdfInput instanceof ArrayBuffer ||
        pdfInput instanceof SharedArrayBuffer
      ) {
        pdfArrayBuffer = pdfInput;
      } else {
        throw new Error("Input must be a Blob or ArrayBuffer.");
      }

      const pdfBase64 = Buffer.from(pdfArrayBuffer).toString("base64");

      const result = await pRetry(
        async () => {
          const response = await generateText({
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
            model: openrouter("google/gemini-2.5-flash-preview-09-2025", {
              reasoning: {
                enabled: true,
                effort: "low",
              },
              models: ["qwen/qwen3-vl-30b-a3b-instruct"],
            }),
          });

          if (!response.text) {
            logger.error(response, "no text returned");
            throw new Error("Model response did not contain text.");
          }

          return response;
        },
        { retries: 3 },
      );

      return this.postProcessMarkdown(result.text);
    } catch (error) {
      logger.error(error, "Error converting PDF to markdown:");
      throw error;
    }
  }
}

export const pdfToMarkdownConverter = new PdfToMarkdownConverter();
