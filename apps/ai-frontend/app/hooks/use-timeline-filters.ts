import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  deserializeFilters,
  serializeFilters,
  type TimelineFilters,
} from "~/lib/utils/url-params";

/**
 * Hook for managing timeline filter state via URL search params
 * Provides filter state and updater function with automatic URL sync
 */
export function useTimelineFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Deserialize filters from URL
  const filters = useMemo(
    () => deserializeFilters(searchParams),
    [searchParams],
  );

  // Update filters and sync to URL
  const updateFilters = useCallback(
    (updates: Partial<TimelineFilters>) => {
      const newFilters = { ...filters, ...updates };

      // Remove undefined/empty values
      const cleanedFilters: TimelineFilters = {};

      if (newFilters.search) cleanedFilters.search = newFilters.search;
      if (newFilters.date_from) cleanedFilters.date_from = newFilters.date_from;
      if (newFilters.date_to) cleanedFilters.date_to = newFilters.date_to;
      if (newFilters.types?.length) cleanedFilters.types = newFilters.types;
      if (newFilters.symbols?.length)
        cleanedFilters.symbols = newFilters.symbols;
      if (newFilters.subsectors?.length)
        cleanedFilters.subsectors = newFilters.subsectors;

      setSearchParams(serializeFilters(cleanedFilters), { replace: true });
    },
    [filters, setSearchParams],
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Remove a specific filter
  const removeFilter = useCallback(
    (key: keyof TimelineFilters) => {
      const newFilters = { ...filters };
      delete newFilters[key];
      setSearchParams(serializeFilters(newFilters), { replace: true });
    },
    [filters, setSearchParams],
  );

  return {
    filters,
    updateFilters,
    clearFilters,
    removeFilter,
  };
}
