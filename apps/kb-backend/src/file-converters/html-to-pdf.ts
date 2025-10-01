import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

/**
 * Convert raw HTML string into a PDF buffer using Playwright.
 * Saves to a temp file, reads as ArrayBuffer, then deletes the file.
 * Ensures browser is closed and throws on failure.
 *
 * @param {string} htmlContent - Raw HTML string
 * @returns {Promise<ArrayBuffer>} - PDF content as ArrayBuffer
 */
export async function htmlToPdf(htmlContent: string): Promise<Uint8Array> {
  const browser = await chromium.launch();
  let tempPath: string | null = null;

  try {
    const page = await browser.newPage();

    // Generate a unique temp file path
    tempPath = path.join(
      os.tmpdir(),
      `playwright_pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`,
    );

    // Load HTML
    await page.setContent(htmlContent, { waitUntil: "networkidle" });

    // Export PDF
    await page.pdf({
      path: tempPath,
      format: "A4",
      printBackground: true,
    });

    // Read as ArrayBuffer
    const buffer = await fs.readFile(tempPath);
    const uint8Array = new Uint8Array(buffer);

    return uint8Array;
  } catch (err) {
    throw new Error(`Failed to generate PDF: ${(err as Error).message}`);
  } finally {
    if (tempPath) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // swallow delete errors, not critical
      }
    }
    await browser.close();
  }
}
