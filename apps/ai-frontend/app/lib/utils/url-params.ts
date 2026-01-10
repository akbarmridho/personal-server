import type { DocumentType } from "../api/types";

/**
 * Timeline filter state that can be encoded in URL
 */
export interface TimelineFilters {
  search?: string;
  date_from?: string;
  date_to?: string;
  types?: DocumentType[];
  symbols?: string[];
  subsectors?: string[];
}

/**
 * Serialize filters to URLSearchParams (search is excluded - managed locally)
 */
export function serializeFilters(
  filters: TimelineFilters,
): Record<string, string> {
  const params: Record<string, string> = {};

  // Note: search is intentionally excluded from URL params

  if (filters.date_from) {
    params.date_from = filters.date_from;
  }

  if (filters.date_to) {
    params.date_to = filters.date_to;
  }

  if (filters.types?.length) {
    params.types = filters.types.join(",");
  }

  if (filters.symbols?.length) {
    params.symbols = filters.symbols.join(",");
  }

  if (filters.subsectors?.length) {
    params.subsectors = filters.subsectors.join(",");
  }

  return params;
}

/**
 * Deserialize URLSearchParams to filters (search is excluded - managed locally)
 */
export function deserializeFilters(
  searchParams: URLSearchParams,
): TimelineFilters {
  const filters: TimelineFilters = {};

  // Note: search is intentionally excluded from URL params

  const dateFrom = searchParams.get("date_from");
  if (dateFrom) {
    filters.date_from = dateFrom;
  }

  const dateTo = searchParams.get("date_to");
  if (dateTo) {
    filters.date_to = dateTo;
  }

  const types = searchParams.get("types");
  if (types) {
    filters.types = types.split(",") as DocumentType[];
  }

  const symbols = searchParams.get("symbols");
  if (symbols) {
    filters.symbols = symbols.split(",");
  }

  const subsectors = searchParams.get("subsectors");
  if (subsectors) {
    filters.subsectors = subsectors.split(",");
  }

  return filters;
}

/**
 * Clear all filters
 */
export function clearFilters(): TimelineFilters {
  return {};
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: TimelineFilters): boolean {
  return !!(
    filters.search ||
    filters.date_from ||
    filters.date_to ||
    filters.types?.length ||
    filters.symbols?.length ||
    filters.subsectors?.length
  );
}
