import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import dayjs from "dayjs";
import { NonRetriableError } from "inngest";
import normalizeUrl from "normalize-url";
import pRetry from "p-retry";
import { PDFDocument } from "pdf-lib";
import { v5 as uuidv5 } from "uuid";
import { z } from "zod";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

// Define the output structure schema
const NewsSchema = z.object({
  newsItems: z.array(
    z.object({
      title: z
        .string()
        .describe(
          "The title of the news item with percentage changes removed.",
        ),
      content: z
        .string()
        .describe(
          "The full body text of the news item in the original language.",
        ),
    }),
  ),
});

const extractPage3FromPdf = async (url: string): Promise<Buffer> => {
  const pdfBytes = await pRetry(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    { retries: 5 },
  );

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();

  if (pageCount < 3) {
    throw new Error(
      `PDF must have at least 3 pages, but has ${pageCount} pages`,
    );
  }

  // Create a new PDF with only page 3 (Index 2)
  const newPdf = await PDFDocument.create();
  const [page3] = await newPdf.copyPages(pdfDoc, [2]);
  newPdf.addPage(page3);

  return Buffer.from(await newPdf.save());
};

const extractNews = async (url: string) => {
  // Extract page 3 buffer
  const page3Buffer = await extractPage3FromPdf(url);

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
        Your task is to extract "Industry & Sector" news and "Stock News" from the provided financial report page.

        **OUTPUT FORMATTING RULES:**
        1. **Structure:** Return a JSON array of objects, where each object has a 'title' and 'content'.
        2. **Language:** Preserve the original content language (Indonesian) exactly as it appears in the body text. Do not summarize or translate the content.
        3. **Title Cleaning (CRITICAL):** - The source text titles often contain stock tickers followed by a percentage change in parentheses, e.g., "CDIA (-0.30%) Raih Pinjaman..." or "BBCA (+1.25%) Laba Naik...".
           - **You must REMOVE the percentage part entirely.**
           - Example Input: "CDIA (-0.30%) Raih Pinjaman US$200 Juta"
           - Example Output: "CDIA Raih Pinjaman US$200 Juta"
           - Example Input: "TPIA (-0.36%) Resmi Akuisisi SPBU"
           - Example Output: "TPIA Resmi Akuisisi SPBU"
        4. **Content:** Combine the paragraphs belonging to a specific title into a single string. Include the source (e.g., "(Kontan.co.id)") if present at the end.
        `,
      },
      {
        role: "user",
        content: [
          {
            type: "file",
            data: page3Buffer,
            mediaType: "application/pdf",
          },
          {
            type: "text",
            text: "Extract all news items from this page.",
          },
        ],
      },
    ],
    maxRetries: 3,
  });

  // Returns the array: [{ title: string, content: string }, ...]
  return response.object.newsItems;
};

const namespace = "b115305a-5d1a-44cf-8e40-7e92fd296fa3";

export const hpMarketUpdateIngest = inngest.createFunction(
  { id: "hp-market-update-ingest", concurrency: 1 },
  { event: "data/hp-market-update-ingest" },
  async ({ event, step }) => {
    const news = await step.run("extract", async () => {
      try {
        return await extractNews(event.data.url);
      } catch (error) {
        // Throw a non-retryable error if PDF doesn't have exactly 5 pages
        if (
          error instanceof Error &&
          error.message.includes("PDF must have exactly 5 pages")
        ) {
          throw new NonRetriableError(error.message);
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
          news.map((n, i) => {
            return {
              date: dayjs(event.data.date).format("YYYY-MM-DD"),
              content: n.content,
              title: n.title,
              urls: [],
              subindustries: [],
              subsectors: [],
              symbols: symbols[i],
              indices: [],
            };
          }),
        );

        const normalizedUrl = normalizeUrl(event.data.url);

        return tagged.map((tag) => {
          return {
            id: uuidv5(`${event.data.url}-${tag.title}`, namespace),
            type: "news" as const,
            title: tag.title,
            content: tag.content,
            document_date: tag.date,
            source: {
              name: "henan-putihray-market-report",
              url: normalizedUrl,
            },
            urls: [] as string[],
            symbols: tag.symbols,
            subindustries: tag.subindustries,
            subsectors: tag.subsectors,
            indices: tag.indices,
          };
        });
      },
    );

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: payload,
      });
    });
  },
);
