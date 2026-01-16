import * as cheerio from "cheerio";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import TurndownService from "turndown";
import { v5 as uuidv5 } from "uuid";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface GoldenArticleEvent {
  id: number;
  ts: number;
  title: string;
  htmlContent: string;
  images: string[];
  symbols: string[];
}

const namespace = "5b242e49-a221-49c6-9f13-800a5f90945b";

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function decodeUnicodeEscapes(text: string): string {
  return text.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
    return String.fromCharCode(Number.parseInt(match.replace(/\\u/g, ""), 16));
  });
}

function extractFilename(url: string): string {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/");
  const lastPart = parts[parts.length - 1];
  // Extract base filename without extension
  const dotIndex = lastPart.lastIndexOf(".");
  if (dotIndex > 0) {
    return lastPart.substring(0, dotIndex);
  }
  return lastPart;
}

async function checkImageExists(
  miniserveUrl: string,
  filename: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${miniserveUrl}/ga/${filename}`, {
      method: "HEAD",
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function downloadImage(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

async function uploadImageToMiniserve(
  miniserveUrl: string,
  imageBuffer: ArrayBuffer,
  filename: string,
): Promise<void> {
  const uploadPath = "/ga/";
  const url = `${miniserveUrl}/upload?path=${uploadPath}`;

  const blob = new Blob([imageBuffer]);
  const formData = new FormData();
  formData.append("file_to_upload", blob, filename);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Upload failed: HTTP ${response.status}: ${responseText}`);
  }
}

function createTurndown(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**",
  });

  turndown.addRule("removeEmptyParagraphs", {
    filter: (node) => {
      return (
        node.nodeName === "P" &&
        normalizeWhitespace(
          (node as unknown as HTMLElement).textContent ?? "",
        ) === ""
      );
    },
    replacement: () => "",
  });

  return turndown;
}

export const goldenArticleIngest = inngest.createFunction(
  {
    id: "golden-article-ingest",
    concurrency: 2,
  },
  { event: "data/golden-article" },
  async ({ event, step }) => {
    // Step 1: Process and upload images, then convert HTML to markdown
    const markdown = await step.run(
      "process-images-and-convert-html",
      async () => {
        // Decode unicode escapes in HTML content
        let decodedHtml = decodeUnicodeEscapes(event.data.htmlContent);

        // Append images from event.data.images array to HTML
        if (event.data.images && event.data.images.length > 0) {
          const imageElements = event.data.images
            .map((url) => `<img src="${url}" />`)
            .join("\n");
          decodedHtml += `\n${imageElements}`;
        }

        const $ = cheerio.load(decodedHtml);

        // Process each image: check existence, upload if needed, replace URL
        const images = $("img").toArray();
        for (const img of images) {
          const originalSrc = $(img).attr("src");
          if (!originalSrc || originalSrc.trim() === "") continue;

          try {
            // Extract filename from URL
            const baseFilename = extractFilename(originalSrc);
            const urlObj = new URL(originalSrc);
            const extension = urlObj.pathname.split(".").pop() || "png";
            const filename = `${baseFilename}.${extension}`;

            // Check if image already exists in miniserve
            const exists = await checkImageExists(
              env.MINISERVE_SERVICE_URL,
              filename,
            );

            if (!exists) {
              // Download and upload the image
              const imageBuffer = await downloadImage(originalSrc);
              await uploadImageToMiniserve(
                env.MINISERVE_SERVICE_URL,
                imageBuffer,
                filename,
              );
            }

            // Replace image URL with miniserve URL
            const newUrl = `${env.MINISERVE_SERVICE_URL}/ga/${filename}`;
            $(img).attr("src", newUrl);
          } catch (error) {
            console.error(
              `Failed to process image ${originalSrc}:`,
              error instanceof Error ? error.message : error,
            );
            // Continue with original URL if processing fails
          }
        }

        // Remove script, style, noscript tags
        $("script, style, noscript").remove();

        // Convert to markdown
        const turndown = createTurndown();
        let md = turndown.turndown($.html());

        // Clean up excessive newlines
        md = md.replace(/\n{3,}/g, "\n\n").trim();

        return md;
      },
    );

    // Step 2: Prepare payload
    const payload: InvestmentDocument = await step.run(
      "prepare-payload",
      async () => {
        // Extract symbols from the event data and content
        const symbolsFromEvent = event.data.symbols.filter(
          (s) => s !== "Artikel" && s.trim() !== "",
        );

        // Also extract from text content
        const extractedSymbols = (
          await extractSymbolFromTexts([
            `${decodeUnicodeEscapes(event.data.title)}\n${markdown}`,
          ])
        )[0];

        // Combine and deduplicate
        const allSymbols = Array.from(
          new Set([...symbolsFromEvent, ...extractedSymbols]),
        );

        // Convert timestamp to date
        const date = dayjs
          .unix(event.data.ts)
          .tz("Asia/Jakarta")
          .format("YYYY-MM-DD");

        // Tag metadata (no image URLs in urls field)
        const tagged = (
          await tagMetadata([
            {
              date,
              content: markdown,
              title: decodeUnicodeEscapes(event.data.title),
              urls: [],
              subindustries: [],
              subsectors: [],
              symbols: allSymbols,
              indices: [],
            },
          ])
        )[0];

        // Generate UUID from article ID
        const docId = uuidv5(event.data.id.toString(), namespace);

        return {
          id: docId,
          type: "analysis" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source: {
            name: "golden-article",
          },
          urls: tagged.urls,
          symbols: tagged.symbols,
          subindustries: tagged.subindustries,
          subsectors: tagged.subsectors,
          indices: tagged.indices,
        };
      },
    );

    // Step 3: Ingest to knowledge service
    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: [payload],
      });
    });
  },
);
