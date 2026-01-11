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
      // Use functional update to get latest params and avoid stale closures
      setSearchParams(
        (prevParams) => {
          const currentFilters = deserializeFilters(prevParams);
          const newFilters = { ...currentFilters, ...updates };

          // Remove undefined/empty values
          const cleanedFilters: TimelineFilters = {};

          if (newFilters.search) cleanedFilters.search = newFilters.search;
          if (newFilters.date_from)
            cleanedFilters.date_from = newFilters.date_from;
          if (newFilters.date_to) cleanedFilters.date_to = newFilters.date_to;
          if (newFilters.types?.length) cleanedFilters.types = newFilters.types;
          if (newFilters.symbols?.length)
            cleanedFilters.symbols = newFilters.symbols;
          if (newFilters.subsectors?.length)
            cleanedFilters.subsectors = newFilters.subsectors;

          return serializeFilters(cleanedFilters);
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Remove a specific filter
  const removeFilter = useCallback(
    (key: keyof TimelineFilters) => {
      setSearchParams(
        (prevParams) => {
          const currentFilters = deserializeFilters(prevParams);
          const newFilters = { ...currentFilters };
          delete newFilters[key];
          return serializeFilters(newFilters);
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return {
    filters,
    updateFilters,
    clearFilters,
    removeFilter,
  };
}
