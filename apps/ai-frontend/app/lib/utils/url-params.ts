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
  source_names?: string[];
}

/**
 * Serialize filters to URLSearchParams
 */
export function serializeFilters(
  filters: TimelineFilters,
): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.search) {
    params.search = filters.search;
  }

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

  if (filters.source_names?.length) {
    params.source_names = filters.source_names.join(",");
  }

  return params;
}

/**
 * Deserialize URLSearchParams to filters
 */
export function deserializeFilters(
  searchParams: URLSearchParams,
): TimelineFilters {
  const filters: TimelineFilters = {};

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

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

  const sourceNames = searchParams.get("source_names");
  if (sourceNames) {
    filters.source_names = sourceNames.split(",");
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
    filters.subsectors?.length ||
    filters.source_names?.length
  );
}
