import { loadDotenv } from "@personal-server/common/utils/load-dotenv";

loadDotenv();

import { logger } from "@personal-server/common/utils/logger";
import axios from "axios";
import { processNewsletter } from "./extractor.js";

const COLLECTION_ID = 1;
const BASE_URL = "http://localhost:3000";

const contents: string[] = [];

async function ingestNews() {
  for (const content of contents) {
    try {
      logger.info("Processing newsletter content");

      const extracted = await processNewsletter(content);

      logger.info({ date: extracted.publishDate }, "Extracted newsletter data");

      for (const news of extracted.marketNews) {
        logger.info({ title: news.title }, "Ingesting market news");

        await axios.post(`${BASE_URL}/rag/documents`, {
          collection_id: COLLECTION_ID,
          title: news.title,
          content: news.content,
          document_ts: extracted.publishDate,
          metadata: JSON.stringify({
            type: "market",
            primaryTickers: news.primaryTickers,
            mentionedTickers: news.mentionedTickers,
            urls: news.urls,
            date: extracted.publishDate,
          }),
          skipSummary: true,
        });

        logger.info({ title: news.title }, "Market news ingested");
      }

      for (const news of extracted.tickerNews) {
        logger.info({ title: news.title }, "Ingesting ticker news");

        await axios.post(`${BASE_URL}/rag/documents`, {
          collection_id: COLLECTION_ID,
          title: news.title,
          content: news.content,
          document_ts: extracted.publishDate,
          metadata: JSON.stringify({
            type: "ticker",
            primaryTickers: news.primaryTickers,
            mentionedTickers: news.mentionedTickers,
            urls: news.urls,
            date: extracted.publishDate,
          }),
          skipSummary: true,
        });

        logger.info({ title: news.title }, "Ticker news ingested");
      }

      logger.info("Newsletter processing complete");
    } catch (error) {
      logger.error({ err: error }, "Failed to process newsletter");
    }
  }
}

ingestNews();
