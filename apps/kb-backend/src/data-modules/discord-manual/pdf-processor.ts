import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { Impit } from "impit";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { logger } from "../../utils/logger.js";

// UUID v5 namespace for manual ingestion module
export const MANUAL_NAMESPACE = "a7e4c8f2-9d3b-4e1a-8c6f-5b2a9d7e4c3f";

// Zod schema for PDF extraction structured output
const PdfExtractionSchema = z.object({
  title: z
    .string()
    .describe("Title of the document, inferred from content or metadata"),
  content: z
    .string()
    .describe("Complete text content extracted from all pages of the PDF"),
  date: z
    .string()
    .nullable()
    .describe(
      "Document date in YYYY-MM-DD format, inferred from content, metadata, or filename. Return null if cannot determine.",
    ),
});

export type PdfExtraction = z.infer<typeof PdfExtractionSchema>;

/**
 * Converts Google Drive sharing URLs to direct download URLs
 * Supports multiple Google Drive URL formats
 */
export function convertGoogleDriveUrl(url: string): string {
  // Check if domain is actually Google Drive
  if (!url.includes("drive.google.com") && !url.includes("docs.google.com")) {
    logger.debug("URL is not a Google Drive URL");
    return url;
  }

  // Pattern 1: /file/d/{fileId}/view or /file/d/{fileId}/view?...
  const fileMatch = url.match(/\/file\/d\/([^/?]+)/);
  if (fileMatch) {
    const fileId = fileMatch[1];
    logger.debug(`Converting Google Drive URL with file ID: ${fileId}`);
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  // Pattern 2: ?id={fileId} or &id={fileId}
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch) {
    const fileId = idMatch[1];
    logger.debug(`Converting Google Drive URL with id param: ${fileId}`);
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  // Already in download format or unrecognized Google Drive URL
  logger.debug("URL is already in download format or unrecognized format");
  return url;
}

/**
 * Extracts content, title, and date from a PDF using Gemini LLM
 * @param pdfUrl - URL to the PDF (direct download URL or Discord CDN URL)
 * @param filename - Optional filename to help with date inference
 * @returns Extracted title, content, and date (nullable)
 */
export async function extractPdfContentWithLLM(
  pdfUrl: string,
  filename?: string,
): Promise<PdfExtraction> {
  logger.info(
    { filename: filename || "none" },
    `Extracting PDF content from: ${pdfUrl}`,
  );

  // Download PDF using Impit
  const impit = new Impit({ browser: "chrome" });

  try {
    const downloadResponse = await impit.fetch(pdfUrl);

    if (downloadResponse.status === 401 || downloadResponse.status === 403) {
      throw new NonRetriableError(
        `Access denied to PDF: ${downloadResponse.status} ${downloadResponse.statusText}`,
      );
    }

    if (!downloadResponse.ok) {
      throw new Error(
        `Failed to download PDF: ${downloadResponse.status} ${downloadResponse.statusText}`,
      );
    }

    const pdfBuffer = Buffer.from(await downloadResponse.arrayBuffer());

    // Extract filename from Content-Disposition header if not provided
    if (!filename) {
      const contentDisposition = downloadResponse.headers.get(
        "content-disposition",
      );
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
          logger.info(`Extracted filename from header: ${filename}`);
        }
      }
    }

    logger.info(`PDF downloaded successfully, size: ${pdfBuffer.length} bytes`);

    const response = await generateObject({
      model: openrouter("google/gemini-3-flash-preview", {
        models: ["openai/gpt-5-mini"],
      }),
      schema: PdfExtractionSchema,
      messages: [
        {
          role: "system",
          content: `You are a Document Reconstruction Specialist.

YOUR GOAL: Reconstruct the provided PDF document into a high-fidelity text-based report. The output must function as a standalone document that perfectly mirrors the structure, content, and flow of the original.

### CRITICAL RULES:
1.  **NO META-COMMENTARY:** Do not write "The document shows..." or "Figure 1 illustrates...". Just write the content directly.
2.  **STRUCTURAL FIDELITY:** Use Markdown headers (#, ##, ###) to exactly match the document's hierarchy. If the document has a sidebar, integrate it logically into the flow where it makes sense contextually.
3.  **ZERO TRUNCATION:** Do not summarize. Do not shorten paragraphs. Keep the full fidelity of the prose.

### HANDLING VISUALS (The "Digital Twin" Method):

* **For TABLES:** Replicate them as Markdown Tables. Ensure all columns and rows are preserved.
* **For CHARTS (Bar/Line/Pie):**
    * *Do not* dump raw JSON data.
    * *Do* convert the visual data into a Markdown Table if discrete values are visible (e.g., "Revenue 2023: $5M").
    * *Do* write a detailed descriptive paragraph if the trend is the focus (e.g., "The trendline shows high volatility in Q1 followed by stabilization in Q3, peaking at [Value] in [Date].").
    * *Capture the "Insight":* If the chart has a callout (e.g., "Growth accelerates in 2025"), include that text as a sub-header or bolded text.
* **For DIAGRAMS/FLOWCHARTS:**
    * Translate visual relationships into structured lists or nested bullets.
    * Example: "Step 1: [Action] -> Leads to: [Result A] and [Result B]."
* **For INFOGRAPHICS:**
    * Extract all text contained within the graphic.
    * Describe the visual hierarchy using bullet points.

### OUTPUT FORMAT:
* **Language:** Match the source document's language (translate to English only if specifically requested, otherwise keep original).
* **Timestamps/Dates:** Standardize formats (e.g., YYYY-MM-DD) for consistency, but keep the narrative text natural.
* **Currency/Units:** Keep exactly as stated (e.g., "IDR 1 Trillion", "500 MW").
`,
        },
        {
          role: "user",
          content: [
            {
              type: "file" as const,
              data: pdfBuffer,
              mediaType: "application/pdf",
            },
            {
              type: "text",
              text: filename ? `Filename: ${filename}` : "No filename provided",
            },
          ],
        },
      ],
      maxRetries: 3,
    });

    logger.info(
      {
        titleLength: response.object.title.length,
        contentLength: response.object.content.length,
        dateInferred: response.object.date !== null,
      },
      "PDF extraction successful",
    );

    return response.object;
  } catch (error) {
    if (error instanceof NonRetriableError) {
      throw error;
    }
    throw error;
  }
}
