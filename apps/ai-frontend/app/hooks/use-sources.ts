import { useQuery } from "@tanstack/react-query";
import { getSourceNames } from "~/lib/api/knowledge";
import { queryKeys } from "~/lib/constants/query-keys";

/**
 * Hook to fetch available source names
 */
export function useSources() {
  return useQuery({
    queryKey: queryKeys.sources(),
    queryFn: getSourceNames,
    staleTime: 60 * 60 * 1000, // 1 hour (matches backend cache)
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
