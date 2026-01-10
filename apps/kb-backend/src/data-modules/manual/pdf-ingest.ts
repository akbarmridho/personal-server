import normalizeUrl from "normalize-url";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  extractPdfContentWithLLM,
  MANUAL_NAMESPACE,
} from "../../infrastructure/pdf-processor.js";
import { logger } from "../../utils/logger.js";

/**
 * Processes PDF files (from URL or upload) and emits to manual ingest
 * This keeps manual ingest backward compatible
 */
export const pdfManualIngest = inngest.createFunction(
  {
    id: "pdf-manual-ingest",
    concurrency: 3, // Allow multiple PDFs to process in parallel
  },
  { event: "data/pdf-manual-ingest" },
  async ({ event, step }) => {
    logger.info(
      { pdfUrl: event.data.pdfUrl, filename: event.data.filename },
      "Starting PDF manual ingestion",
    );

    // Extract content from PDF using LLM
    const extracted = await step.run("extract-pdf-content", async () => {
      return await extractPdfContentWithLLM(
        event.data.pdfUrl,
        event.data.filename,
      );
    });

    // Determine final date (LLM inference > user provided)
    const finalDate = extracted.date || event.data.documentDate;

    // Generate deterministic ID based on source
    const docId = await step.run("generate-id", async () => {
      if (event.data.source.url) {
        // From URL: use normalized URL
        const normalizedUrl = normalizeUrl(event.data.source.url);
        return uuidv5(normalizedUrl, MANUAL_NAMESPACE);
      }
      // From file: use content hash
      return uuidv5(extracted.content, MANUAL_NAMESPACE);
    });

    logger.info(
      { docId, title: extracted.title, date: finalDate },
      "PDF extraction complete, emitting to manual ingest",
    );

    // Emit to manual ingest with fully populated fields
    await step.sendEvent("emit-manual-ingest", {
      name: "data/document-manual-ingest",
      data: {
        payload: [
          {
            id: docId,
            type: "analysis" as const,
            title: extracted.title,
            content: extracted.content,
            document_date: finalDate,
            source: event.data.source,
            urls: [],
          },
        ],
      },
    });

    return { success: true, docId, title: extracted.title };
  },
);
