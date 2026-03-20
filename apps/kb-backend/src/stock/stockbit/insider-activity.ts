import type { BaseStockbitResponse } from "./auth.js";
import { stockbitGetJson } from "./client.js";

export interface InsiderTransaction {
  /** Date of the insider transaction (ISO format, YYYY-MM-DD) */
  date: string;

  /** Insider's full name */
  name: string;

  /** Stock symbol, e.g., "BMRI" */
  symbol: string;

  /** Action type, normalized from the raw Stockbit enum */
  action: string;

  /** Number of shares changed (positive = buy, negative = sell) */
  change_shares: number;

  /** Previous total shares before transaction */
  prev_shares: number;

  /** Current total shares after transaction */
  curr_shares: number;

  /** Change in ownership percentage (fraction, e.g., 0.0002 for 0.02%) */
  change_pct: number;

  /** Current ownership percentage (fraction, e.g., 0.0159 for 1.59%) */
  holding_pct: number;

  /** Transaction price per share (if provided) */
  price: number | null;

  /** Source label, e.g., "IDX" */
  source: string;
}

/**
 * Transform raw Stockbit insider data into LLM-friendly format
 */
function transformInsiderData(movements: any[]): InsiderTransaction[] {
  if (!movements) return [];

  const normalized = movements.map((item) => {
    // Convert numbers safely
    const toNumber = (val) =>
      typeof val === "string"
        ? Number(val.replace(/[^0-9.-]/g, "")) || 0
        : Number(val) || 0;

    // Parse and normalize fields
    const date = normalizeDate(item.date);
    const action = normalizeAction(item.action_type);

    return {
      date,
      name: item.name?.trim() || "",
      symbol: item.symbol?.trim() || "",
      action,
      change_shares: toNumber(item.changes?.value),
      prev_shares: toNumber(item.previous?.value),
      curr_shares: toNumber(item.current?.value),
      change_pct: Number(item.changes?.percentage) || 0,
      holding_pct: Number(item.current?.percentage) || 0,
      price: toNumber(item.price_formatted) || null,
      source: item.data_source?.label?.replace("Sumber: ", "") || "",
    };
  });

  const deduped = new Map<string, InsiderTransaction>();

  for (const item of normalized) {
    const key = [
      item.date,
      item.name,
      item.symbol,
      item.action,
      item.change_shares,
      item.prev_shares,
      item.curr_shares,
    ].join("|");

    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, item);
      continue;
    }

    deduped.set(key, {
      ...existing,
      price: existing.price ?? item.price,
      source: [existing.source, item.source].filter(Boolean).join(", "),
    });
  }

  return Array.from(deduped.values());
}

/**
 * Normalize date string like "11 Feb 25" → "2025-02-11"
 */
function normalizeDate(dateStr) {
  if (!dateStr) return "";
  const [day, mon, year] = dateStr.split(" ");
  const monthMap = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const isoYear = year.length === 2 ? `20${year}` : year;
  return `${isoYear}-${monthMap[mon]}-${day.padStart(2, "0")}`;
}

function normalizeAction(actionType: unknown): string {
  if (typeof actionType !== "string" || actionType.trim().length === 0) {
    return "unspecified";
  }

  const normalized = actionType.replace(/^ACTION_TYPE_/, "").toLowerCase();
  return normalized || "unspecified";
}

export const getInsiderActivity = async (input: {
  symbol: string;
  maxPage: number;
}) => {
  const movements: any[] = [];

  let page = 1;
  const maxPage = input.maxPage ? input.maxPage : 5;

  while (true) {
    const data = await stockbitGetJson<BaseStockbitResponse<{
      is_more: boolean;
      movement: any[];
    }>>(
      `https://exodus.stockbit.com/insider/company/majorholder?symbols=${input.symbol}&page=${page}&limit=20&action_type=ACTION_TYPE_UNSPECIFIED&source_type=SOURCE_TYPE_UNSPECIFIED`,
    );

    movements.push(...data.data.movement);

    if (!data.data.is_more) {
      break;
    }

    page++;

    if (page > maxPage) {
      break; // prevent from fetching too much page
    }
  }

  const data = transformInsiderData(movements);

  return data;
};
