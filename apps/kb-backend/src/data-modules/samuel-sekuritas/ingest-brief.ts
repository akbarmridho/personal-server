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

const detectTargetPages = async (pdfBytes: Uint8Array): Promise<number[]> => {
  const loadingTask = pdfjsLib.getDocument(pdfBytes.slice());
  const pdfReader = await loadingTask.promise;
  const page1 = await pdfReader.getPage(1);
  const annotations = await page1.getAnnotations();

  const internalLinks = annotations.filter(
    (ann) => ann.subtype === "Link" && ann.dest,
  );

  const targetPageIndices = new Set<number>();

  for (const link of internalLinks) {
    try {
      let dest = link.dest;

      // FIX: The logs show 'dest' is an array (Explicit Destination).
      // We must extract the first element (the Ref object) to get the page index.
      if (Array.isArray(dest)) {
        dest = dest[0];
      }

      // Now 'dest' is just { num: 38, gen: 0 }, which getPageIndex understands.
      const pageIndex = await pdfReader.getPageIndex(dest);

      // Ensure the page index is valid
      if (
        pageIndex !== null &&
        pageIndex >= 0 &&
        pageIndex < pdfReader.numPages
      ) {
        targetPageIndices.add(pageIndex);
      }
    } catch (error) {
      logger.warn({ error: error }, "Failed to resolve link destination:");
    }
  }

  const targetIndices = Array.from(targetPageIndices).sort((a, b) => a - b);

  if (targetIndices.length === 0) {
    throw new NonRetriableError("No target pages found");
  }

  return targetIndices;
};

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
