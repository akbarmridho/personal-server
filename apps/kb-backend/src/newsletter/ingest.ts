import { loadDotenv } from "@personal-server/common/utils/load-dotenv";

loadDotenv();

import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "@personal-server/common/utils/logger";
import axios from "axios";
import pLimit from "p-limit";
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
  const inputDir = join(process.cwd(), "newsletter-snips");

  const checkExists = async (title: string) => {
    const res = await axios.get(
      `${BASE_URL}/rag/collections/${COLLECTION_ID}/documents`,
      {
        params: { title },
      },
    );
    return res.data.length > 0;
  };

  const files = await readdir(inputDir);
  const jsonFiles = files
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const limit = pLimit(10);
  let completed = 0;
  const total = jsonFiles.length;

  const tasks = jsonFiles.map((file) =>
    limit(async () => {
      if (shouldExit) return;

      try {
        logger.info({ file }, "Processing newsletter");

        const content = await readFile(join(inputDir, file), "utf-8");
        const extracted = JSON.parse(content);

        for (const news of extracted.marketNews) {
          if (shouldExit) break;

          const title = `${extracted.publishDate}: ${news.title}`;

          if (await checkExists(title)) {
            logger.info({ title }, "Skipping existing market news");
            continue;
          }

          logger.info({ title }, "Ingesting market news");
          await pRetry(
            () =>
              axios.post(`${BASE_URL}/rag/documents`, {
                collection_id: COLLECTION_ID,
                title,
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
              }),
            { retries: 3 },
          );

          logger.info({ title }, "Market news ingested");
        }

        for (const news of extracted.tickerNews) {
          if (shouldExit) break;

          const title = `${extracted.publishDate}: ${news.title}`;

          if (await checkExists(title)) {
            logger.info({ title }, "Skipping existing ticker news");
            continue;
          }

          logger.info({ title }, "Ingesting ticker news");
          await pRetry(
            () =>
              axios.post(`${BASE_URL}/rag/documents`, {
                collection_id: COLLECTION_ID,
                title,
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
              }),
            { retries: 3 },
          );

          logger.info({ title }, "Ticker news ingested");
        }

        completed++;
        logger.info(
          { file, progress: `${completed}/${total}` },
          "Newsletter processing complete",
        );
      } catch (error) {
        completed++;
        logger.error(
          { err: error, file, progress: `${completed}/${total}` },
          "Failed to process newsletter",
        );
      }
    }),
  );

  await Promise.all(tasks);

  logger.info("Ingestion finished");
}

ingestNews();
