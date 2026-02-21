import { openAutomationPage } from "../browser/context.js";
import { env } from "../infrastructure/env.js";
import { logger } from "../utils/logger.js";

const STOCKBIT_SYMBOL_URL = "https://stockbit.com/symbol/IHSG";
const STOCKBIT_TARGET_HOST = "exodus.stockbit.com";
const STOCKBIT_TARGET_PATH_PREFIX = "/charts/IHSG/daily";
const STOCK_PROXY_URL_SET_PATH = "/stock-market-id/proxy-url/set";
const STOCKBIT_AUTH_SET_PATH = "/stock-market-id/stockbit-auth/set";
const STOCKBIT_INTERCEPT_TIMEOUT_MS = 90_000;

type CapturedRequest = {
  targetRequestUrl: string;
  headers: Record<string, string>;
};

export async function runStockbitTaskAtStartup(): Promise<void> {
  logger.info(
    {
      runAt: new Date().toISOString(),
      sourceUrl: STOCKBIT_SYMBOL_URL,
      timeoutMs: STOCKBIT_INTERCEPT_TIMEOUT_MS,
    },
    "stockbit header capture task started",
  );

  try {
    const captured = await collectStockbitRequestHeaders();
    const response = await sendCapturedHeaders(captured);

    logger.info(
      {
        targetRequestUrl: captured.targetRequestUrl,
        capturedHeaderCount: Object.keys(captured.headers).length,
        kbResponse: response,
      },
      "stockbit header capture task completed",
    );
  } catch (error) {
    logger.error({ err: error }, "stockbit header capture task failed");
  }
}

async function collectStockbitRequestHeaders(): Promise<CapturedRequest> {
  const session = await openAutomationPage();
  const requestIndex = new Map<string, { url: string; method: string }>();

  try {
    const page = session.page;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");

    const capturePromise = new Promise<CapturedRequest>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Timed out waiting for Stockbit request headers after ${STOCKBIT_INTERCEPT_TIMEOUT_MS}ms`,
          ),
        );
      }, STOCKBIT_INTERCEPT_TIMEOUT_MS);

      const onRequestWillBeSent = (event: {
        requestId: string;
        request: { url: string; method: string };
      }) => {
        requestIndex.set(event.requestId, {
          url: event.request.url,
          method: event.request.method,
        });
      };

      const onRequestWillBeSentExtraInfo = (event: {
        requestId: string;
        headers: Record<string, unknown>;
      }) => {
        const request = requestIndex.get(event.requestId);
        if (!request) {
          return;
        }

        if (!isTargetStockbitRequest(request.url, request.method)) {
          return;
        }

        cleanup();
        resolve({
          targetRequestUrl: request.url,
          headers: normalizeHeaders(event.headers),
        });
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        cdp.off("Network.requestWillBeSent", onRequestWillBeSent);
        cdp.off(
          "Network.requestWillBeSentExtraInfo",
          onRequestWillBeSentExtraInfo,
        );
      };

      cdp.on("Network.requestWillBeSent", onRequestWillBeSent);
      cdp.on(
        "Network.requestWillBeSentExtraInfo",
        onRequestWillBeSentExtraInfo,
      );
    });

    await page.goto(STOCKBIT_SYMBOL_URL, {
      waitUntil: "domcontentloaded",
      timeout: STOCKBIT_INTERCEPT_TIMEOUT_MS,
    });

    return await capturePromise;
  } finally {
    await session.close();
  }
}

async function sendCapturedHeaders(
  captured: CapturedRequest,
): Promise<unknown> {
  await sendProxyUrl();

  const authSetUrl = new URL(
    STOCKBIT_AUTH_SET_PATH,
    env.KB_BACKEND_URL,
  ).toString();
  const response = await fetch(authSetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      captured_at: new Date().toISOString(),
      capture_source_url: STOCKBIT_SYMBOL_URL,
      target_request_url: captured.targetRequestUrl,
      headers: captured.headers,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Failed to send Stockbit headers: ${response.status} ${response.statusText}. Response: ${responseText}`,
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

async function sendProxyUrl(): Promise<void> {
  const proxySetUrl = new URL(
    STOCK_PROXY_URL_SET_PATH,
    env.KB_BACKEND_URL,
  ).toString();
  const response = await fetch(proxySetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      proxy_url: env.AI_CLIENT_CONNECTOR_PUBLIC_PROXY_URL,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to send stock proxy URL: ${response.status} ${response.statusText}. Response: ${responseText}`,
    );
  }
}

function isTargetStockbitRequest(urlRaw: string, method: string): boolean {
  if (method !== "GET") {
    return false;
  }

  try {
    const url = new URL(urlRaw);
    return (
      url.hostname === STOCKBIT_TARGET_HOST &&
      url.pathname.startsWith(STOCKBIT_TARGET_PATH_PREFIX)
    );
  } catch {
    return false;
  }
}

function normalizeHeaders(
  input: Record<string, unknown>,
): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      output[key] = value.map((part) => String(part)).join(", ");
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    output[key] = String(value);
  }

  return output;
}
