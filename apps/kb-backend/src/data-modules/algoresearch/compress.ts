import * as cheerio from "cheerio";
import sharp from "sharp";
import { logger } from "../../utils/logger.js";
import type { ArticleContent } from "./types.js";

const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
const IMG_COMPRESSION_QUALITY = 60; // JPEG Quality 60%
const IMG_MAX_WIDTH = 800; // Resize width

/**
 * Calculates the size of the object in bytes when stringified.
 */
const getPayloadSize = (data: ArticleContent): number => {
  return Buffer.byteLength(JSON.stringify(data));
};

/**
 * Uses Cheerio to parse HTML, find base64 images, compress them using Sharp,
 * and return the reconstructed HTML.
 */
const compressHtmlImages = async (htmlContent: string): Promise<string> => {
  if (!htmlContent) return htmlContent;

  // Load HTML into Cheerio
  // null tells cheerio not to wrap in <html><body> tags if it's a fragment
  const $ = cheerio.load(htmlContent, { xml: false }, false);

  // Find all images
  const images = $("img");

  // Create an array of promises to handle async compression
  const processingPromises: Promise<void>[] = [];

  images.each((_, element) => {
    const src = $(element).attr("src");

    // Only process if src exists and is base64
    if (src?.startsWith("data:image/")) {
      const processImage = async () => {
        try {
          // Extract base64 data (remove "data:image/png;base64," prefix)
          const matches = src.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
          if (!matches || matches.length < 3) return;

          const base64Data = matches[2];
          const imgBuffer = Buffer.from(base64Data, "base64");

          // Compress using Sharp
          const compressedBuffer = await sharp(imgBuffer)
            .resize({ width: IMG_MAX_WIDTH, withoutEnlargement: true })
            .jpeg({ quality: IMG_COMPRESSION_QUALITY })
            .toBuffer();

          const newBase64 = `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;

          // Update the DOM
          $(element).attr("src", newBase64);
        } catch (error) {
          logger.error(
            { err: error },
            "Failed to compress an image inside cheerio loop",
          );
        }
      };

      processingPromises.push(processImage());
    }
  });

  // Wait for all images to be compressed
  await Promise.all(processingPromises);

  return $.html();
};

export const compressArticle = async (
  payload: ArticleContent,
): Promise<ArticleContent> => {
  // 1. Initial Size Check
  let currentSize = getPayloadSize(payload);

  if (currentSize <= MAX_SIZE_BYTES) {
    return payload;
  }

  logger.info("Payload exceeds 3MB. Initiating compression...");

  // Deep clone to avoid mutating the original object reference
  const processedPayload = JSON.parse(JSON.stringify(payload));

  // 2. Compress First Content
  if (processedPayload.first_content?.data?.first_content) {
    processedPayload.first_content.data.first_content =
      await compressHtmlImages(
        processedPayload.first_content.data.first_content,
      );
  }

  // Check size again
  currentSize = getPayloadSize(processedPayload);
  if (currentSize <= MAX_SIZE_BYTES) {
    return processedPayload;
  }

  // 3. Compress Second Content (if needed)
  if (processedPayload.second_content?.data?.second_content) {
    processedPayload.second_content.data.second_content =
      await compressHtmlImages(
        processedPayload.second_content.data.second_content,
      );
  }

  // Final check
  currentSize = getPayloadSize(processedPayload);

  if (currentSize > MAX_SIZE_BYTES) {
    // Optional: You could implement logic here to remove images entirely if still too big
    throw new Error(
      `Payload still exceeds 3MB limit (${(currentSize / 1024 / 1024).toFixed(2)} MB)`,
    );
  }

  return processedPayload;
};
