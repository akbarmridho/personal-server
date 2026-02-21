import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

export const PdfReconstructionSchema = z.object({
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

export type PdfReconstruction = z.infer<typeof PdfReconstructionSchema>;

const PDF_RECONSTRUCTION_SYSTEM_PROMPT = `You are a Document Reconstruction Specialist.

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
* **Currency/Units:** Keep exactly as stated (e.g., "IDR 1 Trillion", "500 MW").`;

export async function reconstructPdfWithLLM({
  fileData,
  filename,
}: {
  fileData: URL | Uint8Array;
  filename?: string;
}): Promise<PdfReconstruction> {
  const response = await generateObject({
    model: openrouter("google/gemini-3-flash-preview", {
      models: ["openai/gpt-5-mini"],
    }),
    schema: PdfReconstructionSchema,
    messages: [
      {
        role: "system",
        content: PDF_RECONSTRUCTION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "file" as const,
            data: fileData,
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

  return response.object;
}
