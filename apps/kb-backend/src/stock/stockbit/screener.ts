import type { BaseStockbitResponse } from "./auth.js";
import { stockbitGetJson } from "./client.js";

export type ScreenerPreset =
  | "new_52w_high"
  | "new_52w_low"
  | "high_volume_breakout"
  | "foreign_flow_uptrend";

const PRESET_IDS: Record<ScreenerPreset, number> = {
  new_52w_high: 65,
  new_52w_low: 66,
  high_volume_breakout: 63,
  foreign_flow_uptrend: 77,
};

interface ScreenerCalcResult {
  display: string;
  id: number;
  item: string;
  raw: string;
}

interface ScreenerCalcCompany {
  symbol: string;
  name: string;
}

interface ScreenerCalcRow {
  company: ScreenerCalcCompany;
  results: ScreenerCalcResult[];
}

interface ScreenerResponseData {
  screen_name: string;
  screenerid: number;
  totalrows: number;
  curpage: number;
  perpage: number;
  calcs: ScreenerCalcRow[];
  columns: Array<{ id: number; name: string }>;
}

export interface ScreenerItem {
  symbol: string;
  name: string;
  metrics: Record<string, number>;
}

export interface ScreenerResult {
  preset: ScreenerPreset;
  screen_name: string;
  total: number;
  items: ScreenerItem[];
}

function buildScreenerUrl(templateId: number): string {
  return `https://exodus.stockbit.com/screener/templates/${templateId}?type=TEMPLATE_TYPE_GURU`;
}

function normalizeScreenerItem(row: ScreenerCalcRow): ScreenerItem {
  const metrics: Record<string, number> = {};
  for (const result of row.results) {
    const key = result.item
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    metrics[key] = Number.parseFloat(result.raw);
  }
  return {
    symbol: row.company.symbol,
    name: row.company.name,
    metrics,
  };
}

export async function getScreenerPreset(
  preset: ScreenerPreset,
): Promise<ScreenerResult> {
  const templateId = PRESET_IDS[preset];
  const url = buildScreenerUrl(templateId);

  const raw =
    await stockbitGetJson<BaseStockbitResponse<ScreenerResponseData>>(url);

  return {
    preset,
    screen_name: raw.data.screen_name,
    total: raw.data.totalrows,
    items: (raw.data.calcs ?? []).map(normalizeScreenerItem),
  };
}

export async function getAllScreenerPresets(): Promise<ScreenerResult[]> {
  const presets: ScreenerPreset[] = [
    "new_52w_high",
    "new_52w_low",
    "high_volume_breakout",
    "foreign_flow_uptrend",
  ];

  return Promise.all(presets.map(getScreenerPreset));
}
