import { apiGet } from "./client";
import type { StockUniverseResponse } from "./types";

/**
 * Get list of all available stock symbols
 * Used for ticker filter presets
 */
export async function getStockUniverse(): Promise<StockUniverseResponse> {
  return apiGet<StockUniverseResponse>("/stock-market-id/stock-universe/list");
}
