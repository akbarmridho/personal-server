import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useProfile } from "~/contexts/profile-context";
import { listDocuments, searchDocuments } from "~/lib/api/knowledge";
import type { ListDocumentsResponse, SearchResult } from "~/lib/api/types";
import { DEFAULT_LIMIT } from "~/lib/constants/filters";
import { queryKeys } from "~/lib/constants/query-keys";
import type { TimelineFilters } from "~/lib/utils/url-params";

const useDenseVector = false;

/**
 * Hook for fetching timeline data with smart mode switching
 * - List Mode (no search query): Paginated list with page numbers
 * - Search Mode (search query present): Single query with all results
 * @param filters - Timeline filters from URL
 * @param pure_sector - Whether to filter for non-ticker documents
 */
export function useTimelineQuery(
  filters: TimelineFilters,
  pure_sector?: boolean,
): UseQueryResult<ListDocumentsResponse> | UseQueryResult<SearchResult[]> {
  const { profile } = useProfile();
  const hasSearchQuery = !!(filters.search && filters.search.trim().length > 0);

  // Prepare filter parameters
  const filterParams = {
    symbols: filters.symbols,
    subsectors: filters.subsectors,
    types: filters.types,
    date_from: filters.date_from,
    date_to: filters.date_to,
    pure_sector,
    source_names: filters.source_names,
    // Backend handling of read status via profile
    profile_name: profile || undefined,
    read_status: filters.read_status || "all",
  };

  // 1. SEARCH QUERY (Single query, no pagination)
  const searchParams = {
    query: filters.search || "",
    limit: 100,
    use_dense: useDenseVector,
    ...filterParams,
  };

  const searchQuery = useQuery({
    queryKey: queryKeys.timeline.search({
      ...searchParams,
      limit: DEFAULT_LIMIT,
    }),
    queryFn: () => searchDocuments({ ...searchParams, limit: DEFAULT_LIMIT }),
    staleTime: 5 * 60 * 1000,
    enabled: hasSearchQuery,
  });

  // 2. LIST QUERY (Paginated)
  const listQuery = useQuery({
    queryKey: queryKeys.timeline.list({
      ...filterParams,
      page: filters.page || 1,
      limit: DEFAULT_LIMIT,
    }),
    queryFn: () =>
      listDocuments({
        ...filterParams,
        limit: DEFAULT_LIMIT,
        page: filters.page || 1,
      }),
    staleTime: 5 * 60 * 1000,
    enabled: !hasSearchQuery,
  });

  return (hasSearchQuery ? searchQuery : listQuery) as any;
}

/**
 * Type guard to check if query is in search mode
 */
export function isSearchMode(
  result:
    | UseQueryResult<ListDocumentsResponse>
    | UseQueryResult<SearchResult[]>,
): result is UseQueryResult<SearchResult[]> {
  return !("total_count" in (result.data || {}));
}

/**
 * Extract timeline items from query result (handles both modes)
 */
export function getTimelineItems(
  result:
    | UseQueryResult<ListDocumentsResponse>
    | UseQueryResult<SearchResult[]>,
): Omit<SearchResult, "score">[] {
  if (isSearchMode(result)) {
    // Search mode: return search results
    return result.data || [];
  }

  // List mode: return items from current page
  return (result.data as ListDocumentsResponse | undefined)?.items || [];
}

/**
 * Get pagination metadata from list query result
 */
export function getPaginationMetadata(
  result: UseQueryResult<ListDocumentsResponse>,
): {
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
} | null {
  const data = result.data as ListDocumentsResponse | undefined;
  if (!data) return null;

  return {
    total_count: data.total_count,
    page: data.page,
    page_size: data.page_size,
    total_pages: data.total_pages,
  };
}
