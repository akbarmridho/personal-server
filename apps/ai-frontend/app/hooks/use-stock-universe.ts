import { useQuery } from "@tanstack/react-query";
import { getAllCompanies, getStockUniverse } from "~/lib/api/stock-universe";
import { queryKeys } from "~/lib/constants/query-keys";

/**
 * Hook for fetching stock universe (list of all available symbols)
 * Used for ticker filter presets
 */
export function useStockUniverse() {
  return useQuery({
    queryKey: queryKeys.stockUniverse.list(),
    queryFn: getStockUniverse,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (stock list changes infrequently)
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
  });
}

/**
 * Hook for fetching all companies with ticker symbols and names
 * Used for ticker selection dropdown
 */
export function useAllCompanies() {
  return useQuery({
    queryKey: queryKeys.allCompanies.list(),
    queryFn: getAllCompanies,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (stock list changes infrequently)
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
    select: (response) => response.data,
  });
}
