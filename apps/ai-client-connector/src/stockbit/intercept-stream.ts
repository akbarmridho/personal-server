import { env } from "../infrastructure/env.js";
import { logger } from "../utils/logger.js";

export async function runStockbitNewsStreamTriggerAtStartup(): Promise<void> {
  if (!env.INNGEST_URL) {
    logger.warn(
      "stockbit news stream crawl trigger skipped (missing INNGEST_URL)",
    );
    return;
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
}
