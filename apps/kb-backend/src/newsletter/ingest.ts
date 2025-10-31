import { loadDotenv } from "@personal-server/common/utils/load-dotenv";

loadDotenv();

import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "@personal-server/common/utils/logger";
import axios from "axios";
import pRetry from "p-retry";

let shouldExit = false;

process.on("SIGINT", () => {
  logger.info("Received SIGINT, finishing current document...");
  shouldExit = true;
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, finishing current document...");
  shouldExit = true;
});

const COLLECTION_ID = 3;
const BASE_URL = "https://kb.akbarmr.dev";

async function ingestNews() {
  const inputDir = join(process.cwd(), "newsletter-data");
  const cacheFile = join(inputDir, ".ingest-cache.json");

  let cache: Set<string> = new Set();
  if (existsSync(cacheFile)) {
    cache = new Set(JSON.parse(await readFile(cacheFile, "utf-8")));
    logger.info({ processed: cache.size }, "Loaded cache");
  }

  const saveCache = async () => {
    await writeFile(cacheFile, JSON.stringify([...cache], null, 2));
  };

  const files = await readdir(inputDir);
  const jsonFiles = files
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 5);

  for (const file of jsonFiles) {
    if (shouldExit) {
      logger.info("Exiting gracefully...");
      break;
    }

    try {
      logger.info({ file }, "Processing newsletter");

      const content = await readFile(join(inputDir, file), "utf-8");
      const extracted = JSON.parse(content);

      for (const news of extracted.marketNews) {
        if (shouldExit) break;

        const docId = `${file}:market:${news.title}`;
        if (cache.has(docId)) {
          logger.info({ title: news.title }, "Skipping processed market news");
          continue;
        }

        logger.info({ title: news.title }, "Ingesting market news");
        const marketResponse = await pRetry(
          async () => {
            const res = await axios.post(`${BASE_URL}/rag/documents`, {
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
            if (res.status < 200 || res.status >= 300) {
              logger.error({ status: res.status, data: res.data }, "Bad response");
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res;
          },
          { retries: 3 },
        );

        cache.add(docId);
        await saveCache();
        logger.info({ title: news.title }, "Market news ingested");
      }

      for (const news of extracted.tickerNews) {
        if (shouldExit) break;

        const docId = `${file}:ticker:${news.title}`;
        if (cache.has(docId)) {
          logger.info({ title: news.title }, "Skipping processed ticker news");
          continue;
        }

        logger.info({ title: news.title }, "Ingesting ticker news");
        const tickerResponse = await pRetry(
          async () => {
            const res = await axios.post(`${BASE_URL}/rag/documents`, {
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
            if (res.status < 200 || res.status >= 300) {
              logger.error({ status: res.status, data: res.data }, "Bad response");
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res;
          },
          { retries: 3 },
        );

        cache.add(docId);
        await saveCache();
        logger.info({ title: news.title }, "Ticker news ingested");
      }

      logger.info({ file }, "Newsletter processing complete");
    } catch (error) {
      logger.error({ err: error, file }, "Failed to process newsletter");
    }
  }

  logger.info("Ingestion finished");
}

ingestNews();
