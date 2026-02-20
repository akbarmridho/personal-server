import got, { HTTPError, RequestError } from "got";
import http2wrapper from "http2-wrapper";
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
  const profile = await stockbitAuth.getOrThrow();
  const headers = buildReplayHeaders(profile);
  const agent = new http2wrapper.proxies.Http2OverHttp({
    proxyOptions: {
      url: profile.proxy_url,
    },
  });

  try {
    return await got
      .get(url, {
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
      })
      .json<T>();
  } catch (error) {
    throw toStockbitHttpError(error, url);
  }
}

export function getStockbitStatusCode(error: unknown): number | undefined {
  if (error instanceof StockbitHttpError) {
    return error.statusCode;
  }

  return undefined;
}

function buildReplayHeaders(
  profile: StockbitClientProfile,
): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(profile.headers)) {
    const lowerKey = key.toLowerCase();
    if (DROP_HEADER_KEYS.has(lowerKey) || lowerKey.startsWith(":")) {
      continue;
    }

    output[key] = value;
  }

  const authorization = getAuthorizationHeaderValue(profile.headers);
  if (!authorization) {
    throw new StockbitHttpError(
      "Stockbit profile is missing authorization header",
    );
  }

  if (
    !Object.keys(output).some(
      (headerKey) => headerKey.toLowerCase() === "authorization",
    )
  ) {
    output.authorization = authorization;
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
