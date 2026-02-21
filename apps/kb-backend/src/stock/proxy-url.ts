import { KV } from "../infrastructure/db/kv.js";
import type { JsonObject } from "../infrastructure/db/types.js";

export interface StockProxyUrlPayload {
  proxy_url: string;
}

const KEY = "stock.proxy-url.v1";

export class StockProxyUrlError extends Error {}

export class StockProxyUrl {
  async get(): Promise<StockProxyUrlPayload | null> {
    const data = await KV.get(KEY);

    if (data === null) {
      return null;
    }

    return validateStockProxyUrlPayload(data);
  }

  async getOrThrow(): Promise<StockProxyUrlPayload> {
    const payload = await this.get();
    if (!payload) {
      throw new StockProxyUrlError("Stock proxy URL is not set");
    }

    return payload;
  }

  async set(payload: StockProxyUrlPayload): Promise<void> {
    const validated = validateStockProxyUrlPayload(payload as unknown);
    await KV.set(KEY, validated as unknown as JsonObject);
  }
}

export const stockProxyUrl = new StockProxyUrl();

export function validateStockProxyUrlPayload(
  input: unknown,
): StockProxyUrlPayload {
  if (typeof input !== "object" || input === null) {
    throw new StockProxyUrlError(
      "Invalid stock proxy URL payload: expected object",
    );
  }

  const record = input as Record<string, unknown>;
  const proxyUrl = requireString(record.proxy_url, "proxy_url");
  assertValidUrl(proxyUrl, "proxy_url");

  return {
    proxy_url: proxyUrl,
  };
}

function requireString(input: unknown, key: string): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new StockProxyUrlError(
      `Invalid stock proxy URL payload: ${key} must be a non-empty string`,
    );
  }

  return input.trim();
}

function assertValidUrl(value: string, key: string): void {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    throw new StockProxyUrlError(
      `Invalid stock proxy URL payload: ${key} must be a valid URL`,
    );
  }
}
