import got, { HTTPError, RequestError } from "got";
import http2wrapper from "http2-wrapper";
import { stockProxyUrl } from "../proxy-url.js";
import {
  getAuthorizationHeaderValue,
  type StockbitClientProfile,
  stockbitAuth,
} from "./auth.js";

const DROP_HEADER_KEYS = new Set([
  ":method",
  ":path",
  ":scheme",
  ":authority",
  "host",
  "connection",
  "proxy-connection",
  "transfer-encoding",
  "content-length",
]);

const REQUEST_TIMEOUT_MS = 30_000;

type StockbitJsonRequestOptions = {
  url: string;
  method?: "GET" | "POST";
  json?: unknown;
  authorizationOverride?: string;
};

type StockbitPublicTextRequestOptions = {
  url: string;
  method?: "GET";
  headers?: Record<string, string>;
};

export class StockbitHttpError extends Error {
  statusCode?: number;

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      statusCode?: number;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "StockbitHttpError";
    this.statusCode = options?.statusCode;
  }
}

export async function stockbitGetJson<T>(url: string): Promise<T> {
  return stockbitRequestJson<T>({ url, method: "GET" });
}

export async function stockbitPostJson<T>(
  url: string,
  json?: unknown,
): Promise<T> {
  return stockbitRequestJson<T>({ url, method: "POST", json });
}

export async function stockbitRequestJson<T>(
  options: StockbitJsonRequestOptions,
): Promise<T> {
  const profile = await stockbitAuth.getOrThrow();
  const { proxy_url: proxyUrl } = await stockProxyUrl.getOrThrow();
  const headers = buildReplayHeaders(profile, options.authorizationOverride);
  const agent = new http2wrapper.proxies.Http2OverHttp({
    proxyOptions: {
      url: proxyUrl,
    },
  });

  try {
    const client = got.extend({
      http2: true,
      retry: {
        limit: 0,
      },
      timeout: {
        request: REQUEST_TIMEOUT_MS,
      },
      headers,
      agent: {
        http2: agent,
      },
    });

    return await client(options.url, {
      method: options.method || "GET",
      json: options.json,
    }).json<T>();
  } catch (error) {
    throw toStockbitHttpError(error, options.url);
  }
}

export async function stockbitPublicGetText(
  url: string,
  headers?: Record<string, string>,
): Promise<string> {
  return stockbitRequestText({
    url,
    method: "GET",
    headers,
  });
}

export function getStockbitStatusCode(error: unknown): number | undefined {
  if (error instanceof StockbitHttpError) {
    return error.statusCode;
  }

  return undefined;
}

function buildReplayHeaders(
  profile: StockbitClientProfile,
  authorizationOverride?: string,
): Record<string, string> {
  const output = sanitizeHeaders(profile.headers);

  const authorization =
    authorizationOverride ?? getAuthorizationHeaderValue(profile.headers);
  if (!authorization) {
    throw new StockbitHttpError(
      "Stockbit profile is missing authorization header",
    );
  }

  output.authorization = authorization;

  return output;
}

async function stockbitRequestText(
  options: StockbitPublicTextRequestOptions,
): Promise<string> {
  const { proxy_url: proxyUrl } = await stockProxyUrl.getOrThrow();
  const headers = sanitizeHeaders(options.headers ?? {});
  const agent = new http2wrapper.proxies.Http2OverHttp({
    proxyOptions: {
      url: proxyUrl,
    },
  });

  try {
    const client = got.extend({
      http2: true,
      retry: {
        limit: 0,
      },
      timeout: {
        request: REQUEST_TIMEOUT_MS,
      },
      headers,
      agent: {
        http2: agent,
      },
    });

    return await client(options.url, {
      method: options.method || "GET",
    }).text();
  } catch (error) {
    throw toStockbitHttpError(error, options.url);
  }
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (
      DROP_HEADER_KEYS.has(lowerKey) ||
      lowerKey.startsWith(":") ||
      lowerKey === "authorization"
    ) {
      continue;
    }

    output[key] = value;
  }

  return output;
}

function toStockbitHttpError(error: unknown, url: string): StockbitHttpError {
  if (error instanceof HTTPError) {
    return new StockbitHttpError(
      `Stockbit request failed: ${error.response.statusCode} ${error.response.statusMessage} (${url})`,
      {
        cause: error,
        statusCode: error.response.statusCode,
      },
    );
  }

  if (error instanceof RequestError) {
    return new StockbitHttpError(`Stockbit request failed: ${error.message}`, {
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new StockbitHttpError(`Stockbit request failed: ${error.message}`, {
      cause: error,
    });
  }

  return new StockbitHttpError("Stockbit request failed");
}
