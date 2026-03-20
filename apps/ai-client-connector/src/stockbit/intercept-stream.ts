import { env } from "../infrastructure/env.js";
import {
  getStockbitNewsStreamLastSuccessAt,
  setStockbitNewsStreamLastSuccessAt,
} from "../infrastructure/state.js";
import { logger } from "../utils/logger.js";

const STOCKBIT_NEWS_STREAM_INTERVAL_MS = 60 * 60 * 1000;

export async function runStockbitNewsStreamTriggerAtStartup(): Promise<void> {
  if (!env.INNGEST_URL) {
    logger.warn(
      "stockbit news stream crawl trigger skipped (missing INNGEST_URL)",
    );
    return;
  }

  const now = new Date();
  const lastSuccessAt = await getStockbitNewsStreamLastSuccessAt();

  if (lastSuccessAt) {
    const elapsedMs = now.getTime() - new Date(lastSuccessAt).getTime();
    if (elapsedMs < STOCKBIT_NEWS_STREAM_INTERVAL_MS) {
      const nextRunAt = new Date(
        new Date(lastSuccessAt).getTime() + STOCKBIT_NEWS_STREAM_INTERVAL_MS,
      );

      logger.info(
        {
          lastSuccessAt,
          nextRunAt: nextRunAt.toISOString(),
          intervalMs: STOCKBIT_NEWS_STREAM_INTERVAL_MS,
          elapsedMs,
        },
        "stockbit news stream crawl trigger skipped (interval not reached)",
      );
      return;
    }
  }

  const response = await fetch(env.INNGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "stockbit-news-stream-crawl",
      data: {
        message: "stockbit auth refreshed",
      },
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to trigger Stockbit news stream crawl: ${response.status} ${response.statusText}. Response: ${responseText}`,
    );
  }

  await setStockbitNewsStreamLastSuccessAt(now.toISOString());
}
