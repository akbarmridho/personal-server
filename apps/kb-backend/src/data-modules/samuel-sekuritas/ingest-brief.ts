import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { NonRetriableError } from "inngest";
import normalizeUrl from "normalize-url";
import pRetry from "p-retry";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { v5 as uuidv5 } from "uuid";
import { z } from "zod";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { logger } from "../../utils/logger.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

const NewsSchema = z.object({
  newsItems: z.array(
    z.object({
      title: z.string().describe("The title of the news item."),
      content: z
        .string()
        .describe(
          "The full body text of the news item in the original language.",
        ),
    }),
  ),
});

const fetchPdf = async (url: string): Promise<Uint8Array> => {
  return await pRetry(
    async () => {
      const response = await fetch(url);
      if (response.status === 404) {
        throw new NonRetriableError("PDF URL not found (404)");
      }
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    { retries: 5 },
  );
};

async function detectTargetPages(data: Uint8Array): Promise<number[]> {
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  const targetPageIndices = new Set<number>();

  // 1. EXTRACT TEXT FROM ALL PAGES (Needed for the text-match fallback)
  // Map: PageIndex (0-based) -> Normalized Text
  const pageTextMap = new Map<number, string>();

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const rawText = textContent.items.map((item: any) => item.str).join(" ");
      // Normalize: lowercase, single spaces
      pageTextMap.set(i - 1, rawText.replace(/\s+/g, " ").trim().toLowerCase());
    } catch (error) {
      // If a page fails to read, we skip it
    }
  }

  // 2. GET ANNOTATIONS FROM PAGE 1 ONLY (As requested)
  const sourcePageIndex = 0; // Page 1 is index 0
  const page1 = await doc.getPage(1);
  const annotations = await page1.getAnnotations();

  for (const anno of annotations) {
    // Only process Links that have overlaidText
    if (anno.subtype === "Link" && anno.overlaidText) {
      let resolvedIndex: number | null = null;
      let metadataIndex: number | null = null;

      // --- A. Resolve Metadata (The internal PDF link) ---
      if (anno.dest && Array.isArray(anno.dest) && anno.dest.length > 0) {
        try {
          const destRef = anno.dest[0];
          // getPageIndex returns the 0-based index
          metadataIndex = await doc.getPageIndex(destRef);
        } catch (e) {
          // Metadata invalid
        }
      }

      // --- B. Resolve Text Match (The content search) ---
      const searchText = anno.overlaidText
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      let textMatchIndex: number | null = null;

      logger.info(searchText);

      if (searchText) {
        for (const [pIdx, pText] of pageTextMap.entries()) {
          // Don't match the source page itself
          if (pIdx === sourcePageIndex) continue;

          if (pText.includes(searchText)) {
            textMatchIndex = pIdx;
            break; // Stop at first match
          }
        }
      }
      // --- C. Decision Logic (Updated) ---

      // CASE 1: Use Text Match by default (Priority)
      if (textMatchIndex !== null) {
        resolvedIndex = textMatchIndex;
      }
      // CASE 2: Fallback to Metadata if text match failed
      else if (metadataIndex !== null) {
        resolvedIndex = metadataIndex;
      }

      if (resolvedIndex !== null) {
        targetPageIndices.add(resolvedIndex);
      }
    }
  }

  // Return sorted, unique page indexes
  return Array.from(targetPageIndices).sort((a, b) => a - b);
}

const extractPdfPages = async (
  pdfBytes: Uint8Array,
  pageIndices: number[],
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();
  const pages = await newPdf.copyPages(pdfDoc, pageIndices);
  pages.forEach((page) => {
    newPdf.addPage(page);
  });

  return Buffer.from(await newPdf.save());
};

const extractNews = async (url: string) => {
  const pdfBytes = await fetchPdf(url);
  const pageIndices = await detectTargetPages(pdfBytes);
  const pdfBuffer = await extractPdfPages(pdfBytes, pageIndices);

  const response = await generateObject({
    model: openrouter("google/gemini-2.5-flash-lite-preview-09-2025", {
      models: ["google/gemini-2.5-flash-preview-09-2025"],
    }),
    schema: NewsSchema,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are a precision Data Extraction Specialist.
Your task is to extract news items from the provided morning brief pages.

**OUTPUT FORMATTING RULES:**
1. **Structure:** Return a JSON array of objects, where each object has a 'title' and 'content'.
2. **Language:** Preserve the original content language exactly as it appears. Do not summarize or translate.
3. **Title:** Extract the title as-is from the document.
4. **Content:** Extract the full body text for each brief item.`,
      },
      {
        role: "user",
        content: [
          {
            type: "file",
            data: pdfBuffer,
            mediaType: "application/pdf",
          },
          {
            type: "text",
            text: "Extract all brief items from these pages.",
          },
        ],
      },
    ],
    maxRetries: 3,
  });

  return response.object.newsItems;
};

const namespace = "e1108905-e58c-4000-b45d-511db8a5a109";

export const samuelMorningBriefIngest = inngest.createFunction(
  { id: "samuel-morning-brief-ingest", concurrency: 1 },
  { event: "data/samuel-morning-brief-ingest" },
  async ({ event, step }) => {
    const news = await step.run("extract", async () => {
      try {
        return await extractNews(event.data.pdfUrl);
      } catch (error) {
        if (error instanceof NonRetriableError) {
          throw error;
        }
        throw error;
      }
    });

    const payload: InvestmentDocument[] = await step.run(
      "prepare-payload",
      async () => {
        const symbols = await extractSymbolFromTexts(
          news.map((e) => `${e.title}\n\n${e.content}`),
        );

        const tagged = await tagMetadata(
          news.map((n, i) => ({
            date: event.data.date,
            content: n.content,
            title: n.title,
            urls: [],
            subindustries: [],
            subsectors: [],
            symbols: symbols[i],
            indices: [],
          })),
        );

        const normalizedUrl = normalizeUrl(event.data.pdfUrl);

        return tagged.map((tag) => ({
          id: uuidv5(`${normalizedUrl}-${tag.title}`, namespace),
          type: "news" as const,
          title: tag.title,
          content: tag.content,
          document_date: tag.date,
          source: {
            name: "samuel-morning-brief",
            url: normalizedUrl,
          },
          urls: [] as string[],
          symbols: tag.symbols,
          subindustries: tag.subindustries,
          subsectors: tag.subsectors,
          indices: tag.indices,
        }));
      },
    );

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: payload,
      });
    });
  },
);
