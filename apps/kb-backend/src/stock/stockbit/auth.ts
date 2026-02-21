import { KV } from "../../infrastructure/db/kv.js";
import type { JsonObject } from "../../infrastructure/db/types.js";

export interface BaseStockbitResponse<T> {
  message: string;
  data: T;
}

export interface StockbitClientProfile {
  captured_at: string;
  capture_source_url: string;
  target_request_url: string;
  headers: Record<string, string>;
}

const KEY = "stockbit.client-profile.v1";

export class StockbitAuthError extends Error {}

export class StockbitAuth {
  async get(): Promise<StockbitClientProfile | null> {
    const data = await KV.get(KEY);

    if (data === null) {
      return null;
    }

    return validateStockbitClientProfile(data);
  }

  async getOrThrow(): Promise<StockbitClientProfile> {
    const profile = await this.get();
    if (!profile) {
      throw new StockbitAuthError("Stockbit client profile is not set");
    }

    return profile;
  }

  async set(data: StockbitClientProfile): Promise<void> {
    const profile = validateStockbitClientProfile(data as unknown);
    await KV.set(KEY, profile as unknown as JsonObject);
  }
}

export const stockbitAuth = new StockbitAuth();

export function getAuthorizationHeaderValue(
  headers: Record<string, string>,
): string | null {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "authorization") {
      return value;
    }
  }

  return null;
}

export function validateStockbitClientProfile(
  input: unknown,
): StockbitClientProfile {
  if (typeof input !== "object" || input === null) {
    throw new StockbitAuthError("Invalid Stockbit profile: expected object");
  }

  const record = input as Record<string, unknown>;

  const capturedAt = requireString(record.captured_at, "captured_at");
  const captureSourceUrl = requireString(
    record.capture_source_url,
    "capture_source_url",
  );
  const targetRequestUrl = requireString(
    record.target_request_url,
    "target_request_url",
  );
  const headers = requireHeaders(record.headers);

  assertValidIsoDate(capturedAt, "captured_at");
  assertValidUrl(captureSourceUrl, "capture_source_url");
  assertValidUrl(targetRequestUrl, "target_request_url");

  const authorization = getAuthorizationHeaderValue(headers);
  if (!authorization) {
    throw new StockbitAuthError(
      "Invalid Stockbit profile: missing authorization header",
    );
  }

  assertBearerJwtNotExpired(authorization);

  return {
    captured_at: capturedAt,
    capture_source_url: captureSourceUrl,
    target_request_url: targetRequestUrl,
    headers,
  };
}

function requireString(input: unknown, key: string): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new StockbitAuthError(
      `Invalid Stockbit profile: ${key} must be a non-empty string`,
    );
  }

  return input.trim();
}

function requireHeaders(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new StockbitAuthError(
      "Invalid Stockbit profile: headers must be an object",
    );
  }

  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "string") {
      throw new StockbitAuthError(
        `Invalid Stockbit profile: headers.${key} must be a string`,
      );
    }

    output[key] = value;
  }

  return output;
}

function assertValidIsoDate(value: string, key: string): void {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new StockbitAuthError(
      `Invalid Stockbit profile: ${key} must be a valid ISO date`,
    );
  }
}

function assertValidUrl(value: string, key: string): void {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    throw new StockbitAuthError(
      `Invalid Stockbit profile: ${key} must be a valid URL`,
    );
  }
}

function assertBearerJwtNotExpired(authorizationHeader: string): void {
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new StockbitAuthError(
      "Invalid Stockbit profile: authorization must use Bearer token",
    );
  }

  const token = match[1]?.trim();
  const payload = parseJwtPayload(token);
  const exp = payload.exp;

  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    throw new StockbitAuthError(
      "Invalid Stockbit profile: bearer token missing exp claim",
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (exp <= nowSec) {
    throw new StockbitAuthError(
      `Stockbit bearer token expired at ${new Date(exp * 1000).toISOString()}`,
    );
  }
}

function parseJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new StockbitAuthError("Invalid Stockbit bearer token format");
  }

  const payloadB64 = parts[1];
  const json = decodeBase64Url(payloadB64);

  try {
    const payload = JSON.parse(json);
    if (typeof payload !== "object" || payload === null) {
      throw new Error("payload is not object");
    }
    return payload as Record<string, unknown>;
  } catch {
    throw new StockbitAuthError("Invalid Stockbit bearer token payload");
  }
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  return Buffer.from(padded, "base64").toString("utf8");
}
