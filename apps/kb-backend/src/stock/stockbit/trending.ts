import type { BaseStockbitResponse } from "./auth.js";
import { stockbitGetJson } from "./client.js";

interface TrendingStockRaw {
  symbol: string;
  name: string;
  last: string;
  change: string;
  percent: string;
  previous: string;
  company_id: string;
  uma: boolean;
  notation: Array<{ notation_code: string }>;
  corp_action: { active: boolean };
}

export interface TrendingStock {
  symbol: string;
  name: string;
  last: number;
  change: number;
  pct: number;
  previous: number;
  uma: boolean;
  notations: string[];
  corp_action: boolean;
}

export async function getTrendingStocks(): Promise<TrendingStock[]> {
  const raw = await stockbitGetJson<BaseStockbitResponse<TrendingStockRaw[]>>(
    "https://exodus.stockbit.com/emitten/trending",
  );

  if (!Array.isArray(raw.data)) {
    throw new Error("Invalid trending response shape from Stockbit");
  }

  return raw.data.map((item) => ({
    symbol: item.symbol,
    name: item.name,
    last: Number(item.last),
    change: Number(item.change),
    pct: Number(item.percent),
    previous: Number(item.previous),
    uma: item.uma,
    notations: (item.notation ?? []).map((n) => n.notation_code),
    corp_action: item.corp_action?.active ?? false,
  }));
}
