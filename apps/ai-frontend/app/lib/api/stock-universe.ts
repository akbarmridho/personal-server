import { apiGet } from "./client";
import type { AllCompaniesResponse, StockUniverseResponse } from "./types";

/**
 * Get list of all available stock symbols
 * Used for ticker filter presets
 */
export async function getStockUniverse(): Promise<StockUniverseResponse> {
  return apiGet<StockUniverseResponse>("/stock-market-id/stock-universe/list");
}

/**
 * Get all companies with ticker symbols and names
 * Used for ticker selection dropdown
 */
export async function getAllCompanies(): Promise<AllCompaniesResponse> {
  return apiGet<AllCompaniesResponse>("/stock-market-id/stock");
}
