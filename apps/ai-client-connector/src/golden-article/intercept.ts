import { openAutomationPage } from "../browser/context.js";
import { env } from "../infrastructure/env.js";
import {
  getGoldenArticleLastSuccessAt,
  setGoldenArticleLastSuccessAt,
} from "../infrastructure/state.js";
import { logger } from "../utils/logger.js";

const GOLDEN_ARTICLE_INTERVAL_MS = 2 * 60 * 60 * 1000;
const GOLDEN_ARTICLE_INTERCEPT_TIMEOUT_MS = 90_000;

type GoldenArticleItem = {
  id: string | number;
  title?: string;
  styled_content?: string;
  content?: string;
  ts?: number;
  created_at?: string;
  emiten_code?: string;
  symbol?: string;
  images?: unknown[];
};

type InngestPayloadItem = {
  id: string | number;
  title: string;
  styled_content: string;
  ts: number;
  emiten_code: string | null;
  images: unknown[];
};

export async function runGoldenArticleTaskAtStartup(): Promise<void> {
  if (!env.GOLDEN_ARTICLE_URL || !env.INNGEST_URL) {
    logger.info(
      {
        hasGoldenArticleUrl: Boolean(env.GOLDEN_ARTICLE_URL),
        hasInngestUrl: Boolean(env.INNGEST_URL),
      },
      "golden-article task skipped (missing configuration)",
    );
    return;
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const lastSuccessAt = await getGoldenArticleLastSuccessAt();

  if (lastSuccessAt) {
    const elapsedMs = now.getTime() - new Date(lastSuccessAt).getTime();
    if (elapsedMs < GOLDEN_ARTICLE_INTERVAL_MS) {
      const nextRunAt = new Date(
        new Date(lastSuccessAt).getTime() + GOLDEN_ARTICLE_INTERVAL_MS,
      );

      logger.info(
        {
          lastSuccessAt,
          nextRunAt: nextRunAt.toISOString(),
          intervalMs: GOLDEN_ARTICLE_INTERVAL_MS,
          elapsedMs,
        },
        "golden-article task skipped (interval not reached)",
      );
      return;
    }
  }

  logger.info(
    {
      runAt: nowIso,
      url: env.GOLDEN_ARTICLE_URL,
      timeoutMs: GOLDEN_ARTICLE_INTERCEPT_TIMEOUT_MS,
    },
    "golden-article task started",
  );

  try {
    const payload = await collectGoldenArticlePayload(env.GOLDEN_ARTICLE_URL);
    const ingestResponse = await sendToInngest(payload, env.INNGEST_URL);

    await setGoldenArticleLastSuccessAt(new Date().toISOString());

    logger.info(
      {
        payloadCount: payload.length,
        inngestResponse: ingestResponse,
      },
      "golden-article task completed",
    );
  } catch (error) {
    logger.error(
      {
        err: error,
      },
      "golden-article task failed",
    );
  }
}

async function collectGoldenArticlePayload(
  goldenArticleUrl: string,
): Promise<InngestPayloadItem[]> {
  const pageUrl = new URL(goldenArticleUrl);
  const pageBaseHost = getBaseHost(pageUrl.hostname);
  const session = await openAutomationPage();

  try {
    const page = session.page;

    const responsePromise = page.waitForResponse(
      (response) => {
        if (response.request().method() !== "GET") {
          return false;
        }

        try {
          const url = new URL(response.url());
          return (
            getBaseHost(url.hostname) === pageBaseHost &&
            url.pathname === "/v1/recent"
          );
        } catch {
          return false;
        }
      },
      {
        timeout: GOLDEN_ARTICLE_INTERCEPT_TIMEOUT_MS,
      },
    );

    await page.goto(goldenArticleUrl, {
      waitUntil: "domcontentloaded",
      timeout: GOLDEN_ARTICLE_INTERCEPT_TIMEOUT_MS,
    });

    const response = await responsePromise;
    const json = (await response.json()) as unknown;

    return normalizePayload(json);
  } finally {
    await session.close();
  }
}

function normalizePayload(input: unknown): InngestPayloadItem[] {
  const data = extractDataArray(input);

  return data.map((item) => {
    const timestamp =
      typeof item.ts === "number" && Number.isFinite(item.ts)
        ? item.ts
        : item.created_at
          ? Math.floor(new Date(item.created_at).getTime() / 1000)
          : Math.floor(Date.now() / 1000);

    return {
      id: item.id,
      title: item.title ?? "",
      styled_content: item.styled_content ?? item.content ?? "",
      ts: timestamp,
      emiten_code: item.emiten_code ?? item.symbol ?? null,
      images: Array.isArray(item.images) ? item.images : [],
    };
  });
}

function extractDataArray(input: unknown): GoldenArticleItem[] {
  if (Array.isArray(input)) {
    return input as GoldenArticleItem[];
  }

  if (
    typeof input === "object" &&
    input !== null &&
    "data" in input &&
    Array.isArray((input as { data?: unknown[] }).data)
  ) {
    return (input as { data: GoldenArticleItem[] }).data;
  }

  throw new Error(
    "Invalid response payload: expected an array or object with data array",
  );
}

async function sendToInngest(
  payload: InngestPayloadItem[],
  inngestUrl: string,
): Promise<unknown> {
  const response = await fetch(inngestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "data/golden-article-crawl",
      data: {
        payload,
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

function getBaseHost(hostname: string): string {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 2) {
    return hostname;
  }

  return parts.slice(-2).join(".");
}
