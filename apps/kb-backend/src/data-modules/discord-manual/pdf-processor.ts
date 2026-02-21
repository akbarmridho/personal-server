import { Impit } from "impit";
import { NonRetriableError } from "inngest";
import { logger } from "../../utils/logger.js";
import {
  type PdfReconstruction,
  reconstructPdfWithLLM,
} from "../../utils/pdf-reconstruction.js";

// UUID v5 namespace for manual ingestion module
export const MANUAL_NAMESPACE = "a7e4c8f2-9d3b-4e1a-8c6f-5b2a9d7e4c3f";

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
): Promise<PdfReconstruction> {
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

    const extracted = await reconstructPdfWithLLM({
      fileData: Uint8Array.from(pdfBuffer),
      filename,
    });

    logger.info(
      {
        titleLength: extracted.title.length,
        contentLength: extracted.content.length,
        dateInferred: extracted.date !== null,
      },
      "PDF extraction successful",
    );

    return extracted;
  } catch (error) {
    if (error instanceof NonRetriableError) {
      throw error;
    }
    throw error;
  }
}
