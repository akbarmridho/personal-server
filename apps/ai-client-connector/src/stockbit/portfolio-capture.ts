import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page, Response as PlaywrightResponse } from "playwright";
import { openAutomationPage } from "../browser/context.js";
import { logger } from "../utils/logger.js";
import {
  getStockbitDataRoot,
  materializeStockbitNormalizedData,
} from "./portfolio-store.js";

const STOCKBIT_PORTFOLIO_PAGE_URL = "https://stockbit.com/securities/portfolio";
const STOCKBIT_HISTORY_PAGE_URL = "https://stockbit.com/securities/history";
const STOCKBIT_PORTFOLIO_API_URL =
  "https://carina.stockbit.com/portfolio/v2/list";
const STOCKBIT_HISTORY_API_HOST = "carina.stockbit.com";
const STOCKBIT_HISTORY_API_PATH = "/history";
const STOCKBIT_PORTFOLIO_CAPTURE_TIMEOUT_MS = 60_000;
const STOCKBIT_HISTORY_CAPTURE_TIMEOUT_MS = 60_000;

type CapturedResponse = {
  requestUrl: string;
  payload: unknown;
  page: number | null;
};

type PersistedArtifact = {
  absolutePath: string;
  relativePath: string;
  requestUrl: string;
  page: number | null;
};

export async function runStockbitPortfolioCaptureTaskAtStartup(): Promise<void> {
  const storageRoot = getStockbitDataRoot();
  logger.info(
    {
      portfolioPageUrl: STOCKBIT_PORTFOLIO_PAGE_URL,
      historyPageUrl: STOCKBIT_HISTORY_PAGE_URL,
      storageRoot,
    },
    "stockbit portfolio capture task started",
  );

  const session = await openAutomationPage();
  let captureCompleted = false;

  try {
    const portfolioCapture = await capturePortfolioResponse(session.page);
    const historyCapture = await captureHistoryResponse(session.page);
    const persisted = await persistCapturedResponses(
      portfolioCapture,
      historyCapture,
    );
    captureCompleted = true;
    const materialized = await materializeStockbitNormalizedData();

    logger.info(
      {
        portfolioPath: persisted.portfolio.relativePath,
        historyPath: persisted.history.relativePath,
        latestPortfolioPath: materialized.latestPortfolioPath,
        tradesPath: materialized.tradesPath,
        tradeEventCount: materialized.tradeEventCount,
      },
      "stockbit portfolio capture task completed",
    );
  } catch (error) {
    logger.error({ err: error }, "stockbit portfolio capture task failed");
  } finally {
    await session.close();
  }

  if (!captureCompleted) {
    try {
      const materialized = await materializeStockbitNormalizedData();
      logger.info(
        {
          latestPortfolioPath: materialized.latestPortfolioPath,
          tradesPath: materialized.tradesPath,
          tradeEventCount: materialized.tradeEventCount,
          backfillFileCount: materialized.backfillFileCount,
        },
        "stockbit normalized data refreshed from existing raw files",
      );
    } catch (error) {
      logger.warn(
        { err: error },
        "stockbit normalized data refresh failed after capture failure",
      );
    }
  }
}

async function capturePortfolioResponse(page: Page): Promise<CapturedResponse> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url() === STOCKBIT_PORTFOLIO_API_URL,
    {
      timeout: STOCKBIT_PORTFOLIO_CAPTURE_TIMEOUT_MS,
    },
  );

  await page.goto(STOCKBIT_PORTFOLIO_PAGE_URL, {
    waitUntil: "domcontentloaded",
    timeout: STOCKBIT_PORTFOLIO_CAPTURE_TIMEOUT_MS,
  });

  const response = await responsePromise;

  return {
    requestUrl: response.url(),
    payload: await readJsonPayload(response),
    page: null,
  };
}

async function captureHistoryResponse(page: Page): Promise<CapturedResponse> {
  const responsePromise = page.waitForResponse(
    (response) => {
      if (response.request().method() !== "GET") {
        return false;
      }

      try {
        const url = new URL(response.url());
        return (
          url.hostname === STOCKBIT_HISTORY_API_HOST &&
          url.pathname === STOCKBIT_HISTORY_API_PATH
        );
      } catch {
        return false;
      }
    },
    {
      timeout: STOCKBIT_HISTORY_CAPTURE_TIMEOUT_MS,
    },
  );

  await page.goto(STOCKBIT_HISTORY_PAGE_URL, {
    waitUntil: "domcontentloaded",
    timeout: STOCKBIT_HISTORY_CAPTURE_TIMEOUT_MS,
  });

  const response = await responsePromise;
  const pageNumber = getHistoryPageNumber(response.url());

  return {
    requestUrl: response.url(),
    payload: await readJsonPayload(response),
    page: pageNumber,
  };
}

async function readJsonPayload(response: PlaywrightResponse): Promise<unknown> {
  const bodyText = await response.text();

  if (!response.ok()) {
    throw new Error(
      `Stockbit capture returned ${response.status()} ${response.statusText()}: ${response.url()}`,
    );
  }

  try {
    return JSON.parse(bodyText);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON response from ${response.url()}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function persistCapturedResponses(
  portfolioCapture: CapturedResponse,
  historyCapture: CapturedResponse,
): Promise<{ portfolio: PersistedArtifact; history: PersistedArtifact }> {
  const now = new Date();
  const day = formatDate(now);
  const stamp = formatTime(now);

  const portfolio = await persistJsonArtifact({
    category: "portfolio",
    day,
    fileName: `${stamp}.json`,
    requestUrl: portfolioCapture.requestUrl,
    payload: portfolioCapture.payload,
    page: portfolioCapture.page,
  });

  const history = await persistJsonArtifact({
    category: "history",
    day,
    fileName: `${stamp}_page-${historyCapture.page ?? 1}.json`,
    requestUrl: historyCapture.requestUrl,
    payload: historyCapture.payload,
    page: historyCapture.page,
  });
  return { portfolio, history };
}

async function persistJsonArtifact(input: {
  category: "portfolio" | "history";
  day: string;
  fileName: string;
  requestUrl: string;
  payload: unknown;
  page: number | null;
}): Promise<PersistedArtifact> {
  const baseDir = path.resolve(getRawStorageRoot(), input.category, input.day);
  const absolutePath = path.resolve(baseDir, input.fileName);
  const relativePath = path.relative(getStockbitDataRoot(), absolutePath);

  await mkdir(baseDir, { recursive: true });
  await writeFile(
    absolutePath,
    `${JSON.stringify(input.payload, null, 2)}\n`,
    "utf8",
  );

  return {
    absolutePath,
    relativePath,
    requestUrl: input.requestUrl,
    page: input.page,
  };
}

function getRawStorageRoot(): string {
  return path.resolve(getStockbitDataRoot(), "raw");
}

function getHistoryPageNumber(urlRaw: string): number | null {
  try {
    const url = new URL(urlRaw);
    const pageParam = url.searchParams.get("page");
    if (!pageParam) {
      return null;
    }

    const pageNumber = Number.parseInt(pageParam, 10);
    return Number.isFinite(pageNumber) ? pageNumber : null;
  } catch {
    return null;
  }
}

function formatDate(input: Date): string {
  const year = input.getFullYear();
  const month = `${input.getMonth() + 1}`.padStart(2, "0");
  const day = `${input.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(input: Date): string {
  const hour = `${input.getHours()}`.padStart(2, "0");
  const minute = `${input.getMinutes()}`.padStart(2, "0");
  const second = `${input.getSeconds()}`.padStart(2, "0");
  return `${hour}${minute}${second}`;
}
