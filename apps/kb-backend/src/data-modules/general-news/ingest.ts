import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import normalizeUrl from "normalize-url";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { logger } from "../../utils/logger.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";
import { isSupportedUrl, scrapeArticle } from "./scrapers/index.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface GeneralNewsEvent {
  url: string;
  referenceDate?: string; // Optional reference date for date override
}

const namespace = "af1185ff-6b20-4d9e-b89d-a258e50a1345";

export const generalNewsIngest = inngest.createFunction(
  {
    id: "general-news-ingest",
    concurrency: 2,
  },
  { event: "data/general-news" },
  async ({ event, step }) => {
    const { url, referenceDate } = event.data;

    // Validate URL is supported
    if (!isSupportedUrl(url)) {
      logger.warn({ url }, "URL not supported by any scraper");
      throw new Error(`URL not supported: ${url}`);
    }

    // Step 1: Scrape article
    const scraped = await step.run("scrape", async () => {
      logger.info({ url }, "Scraping article");
      return await scrapeArticle(url);
    });

    // Step 2: Prepare payload
    const payload: InvestmentDocument = await step.run(
      "prepare-payload",
      async () => {
        const { title, content, publishedDate, url: rawUrl } = scraped;

        // Normalize URL for consistent ID generation
        const normalizedUrl = normalizeUrl(rawUrl, {
          stripHash: true,
          stripWWW: false,
          removeQueryParameters: false,
        });

        // Extract symbols from text
        const extractedSymbols = (
          await extractSymbolFromTexts([`${title}\n${content}`])
        )[0];

        // Parse date - try published date from scraper first, then fall back to referenceDate
        let date: string;
        if (publishedDate) {
          try {
            date = dayjs(publishedDate).tz("Asia/Jakarta").format("YYYY-MM-DD");
          } catch {
            logger.warn(
              { publishedDate },
              "Failed to parse published date, using reference date",
            );
            date =
              referenceDate || dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");
          }
        } else {
          date =
            referenceDate || dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");
        }

        // Tag metadata
        const tagged = (
          await tagMetadata([
            {
              date,
              content,
              title: title,
              urls: [normalizedUrl],
              subindustries: [],
              subsectors: [],
              symbols: extractedSymbols,
              indices: [],
            },
          ])
        )[0];

        // Generate UUID from normalized URL
        const docId = uuidv5(normalizedUrl, namespace);

        // Build source metadata (all values must be strings)
        const source: Record<string, string> = {
          name: "general-news",
          url: normalizedUrl,
        };

        return {
          id: docId,
          type: "news" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source,
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
      logger.info(
        { docId: payload.id, title: payload.title },
        "Ingesting document",
      );
      return await knowledgeService.ingestDocuments({
        documents: [payload],
      });
    });

    return { success: true, documentId: payload.id };
  },
);
