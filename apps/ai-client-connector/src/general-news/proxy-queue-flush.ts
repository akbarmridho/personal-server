import { env } from "../infrastructure/env.js";
import {
  getGeneralNewsProxyQueueFlushLastSuccessAt,
  setGeneralNewsProxyQueueFlushLastSuccessAt,
} from "../infrastructure/state.js";
import { logger } from "../utils/logger.js";

const GENERAL_NEWS_PROXY_QUEUE_FLUSH_INTERVAL_MS = 60 * 60 * 1000;
const GENERAL_NEWS_PROXY_QUEUE_FLUSH_EVENT = "data/general-news-proxy-queue-flush";

export async function runGeneralNewsProxyQueueFlushAtStartup(): Promise<void> {
  if (!env.INNGEST_URL) {
    logger.info(
      {
        hasInngestUrl: Boolean(env.INNGEST_URL),
      },
      "general-news proxy queue flush skipped (missing configuration)",
    );
    return;
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const lastSuccessAt = await getGeneralNewsProxyQueueFlushLastSuccessAt();

  if (lastSuccessAt) {
    const elapsedMs = now.getTime() - new Date(lastSuccessAt).getTime();
    if (elapsedMs < GENERAL_NEWS_PROXY_QUEUE_FLUSH_INTERVAL_MS) {
      const nextRunAt = new Date(
        new Date(lastSuccessAt).getTime() +
          GENERAL_NEWS_PROXY_QUEUE_FLUSH_INTERVAL_MS,
      );

      logger.info(
        {
          lastSuccessAt,
          nextRunAt: nextRunAt.toISOString(),
          intervalMs: GENERAL_NEWS_PROXY_QUEUE_FLUSH_INTERVAL_MS,
          elapsedMs,
        },
        "general-news proxy queue flush skipped (interval not reached)",
      );
      return;
    }
  }

  logger.info(
    {
      runAt: nowIso,
      event: GENERAL_NEWS_PROXY_QUEUE_FLUSH_EVENT,
    },
    "general-news proxy queue flush started",
  );

  try {
    const response = await triggerInngestFlushEvent(env.INNGEST_URL);

    await setGeneralNewsProxyQueueFlushLastSuccessAt(new Date().toISOString());

    logger.info(
      {
        inngestResponse: response,
      },
      "general-news proxy queue flush completed",
    );
  } catch (error) {
    logger.error(
      {
        err: error,
      },
      "general-news proxy queue flush failed",
    );
  }
}

async function triggerInngestFlushEvent(inngestUrl: string): Promise<unknown> {
  const response = await fetch(inngestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: GENERAL_NEWS_PROXY_QUEUE_FLUSH_EVENT,
      data: {
        source: "ai-client-connector",
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Failed to send event: ${response.status} ${response.statusText}. Response: ${responseText}`,
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}
