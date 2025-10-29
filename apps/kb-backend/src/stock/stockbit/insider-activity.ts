import axios from "axios";
import dayjs from "dayjs";
import { KV } from "../../db/kv.js";
import {
  type BaseStockbitResponse,
  StockbitAuthError,
  stockbitAuth,
} from "./auth.js";

export interface InsiderTransaction {
  /** Date of the insider transaction (ISO format, YYYY-MM-DD) */
  date: string;

  /** Insider's full name */
  name: string;

  /** Stock symbol, e.g., "BMRI" */
  symbol: string;

  /** Action type, e.g., "buy" or "sell" */
  action: "buy" | "sell" | "unspecified";

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

  return movements.map((item) => {
    // Convert numbers safely
    const toNumber = (val) =>
      typeof val === "string"
        ? Number(val.replace(/[^0-9.-]/g, "")) || 0
        : Number(val) || 0;

    // Parse and normalize fields
    const date = normalizeDate(item.date);
    const action =
      item.action_type === "ACTION_TYPE_BUY"
        ? "buy"
        : item.action_type === "ACTION_TYPE_SELL"
          ? "sell"
          : item.action_type;

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

export const getInsiderActivity = async (input: {
  ticker: string;
  maxPage: number;
}) => {
  const rawData = await KV.getOrSet(
    `stockbit.insider.${input.ticker}`,
    async () => {
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const movements: any[] = [];

      let page = 1;
      const maxPage = input.maxPage ? input.maxPage : 5;

      while (true) {
        const response = await axios.get(
          `https://exodus.stockbit.com/insider/company/majorholder?symbols=${input.ticker}&page=${page}&limit=20&action_type=ACTION_TYPE_UNSPECIFIED&source_type=SOURCE_TYPE_UNSPECIFIED`,
          {
            headers: {
              Authorization: `Bearer ${authData.accessToken}`,
            },
          },
        );

        const data = response.data as BaseStockbitResponse<{
          is_more: boolean;
          movement: any[];
        }>;

        movements.push(...data.data.movement);

        if (!data.data.is_more) {
          break;
        }

        page++;

        if (page > maxPage) {
          break; // prevent from fetching too much page
        }
      }

      return movements;
    },
    dayjs().add(3, "hour").toDate(),
    true,
  );

  const data = transformInsiderData(rawData as any);

  return data;
};
