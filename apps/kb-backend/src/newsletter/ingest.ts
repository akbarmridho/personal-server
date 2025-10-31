import { loadDotenv } from "@personal-server/common/utils/load-dotenv";

loadDotenv();

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "@personal-server/common/utils/logger";
import axios from "axios";

const COLLECTION_ID = 3;
const BASE_URL = "https://kb.akbarmr.dev";

async function ingestNews() {
  const inputDir = join(process.cwd(), "newsletter-data");
  const files = await readdir(inputDir);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  for (const file of jsonFiles) {
    try {
      logger.info({ file }, "Ingesting newsletter");

      const content = await readFile(join(inputDir, file), "utf-8");
      const extracted = JSON.parse(content);

      for (const news of extracted.marketNews) {
        logger.info({ title: news.title }, "Ingesting market news");

        await axios.post(`${BASE_URL}/rag/documents`, {
          collection_id: COLLECTION_ID,
          title: news.title,
          content: news.content,
          document_ts: extracted.publishDate,
          metadata: JSON.stringify({
            type: "market",
            source: "stockbit-snips",
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
            source: "stockbit-snips",
            primaryTickers: news.primaryTickers,
            mentionedTickers: news.mentionedTickers,
            urls: news.urls,
            date: extracted.publishDate,
          }),
          skipSummary: true,
        });

        logger.info({ title: news.title }, "Ticker news ingested");
      }

      logger.info({ file }, "Newsletter ingestion complete");
    } catch (error) {
      logger.error({ err: error, file }, "Failed to ingest newsletter");
    }
  }
}

ingestNews();
