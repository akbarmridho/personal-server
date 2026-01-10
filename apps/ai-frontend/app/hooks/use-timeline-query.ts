import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { listDocuments, searchDocuments } from "~/lib/api/knowledge";
import type { ListDocumentsResponse, SearchResult } from "~/lib/api/types";
import { DEFAULT_LIMIT } from "~/lib/constants/filters";
import { queryKeys } from "~/lib/constants/query-keys";
import type { TimelineFilters } from "~/lib/utils/url-params";

/**
 * Hook for fetching timeline data with smart mode switching
 * - List Mode (no search query): Infinite scroll with cursor pagination
 * - Search Mode (search query present): Single query with all results
 */
export function useTimelineQuery(
  filters: TimelineFilters,
  pure_sector?: boolean,
):
  | UseInfiniteQueryResult<ListDocumentsResponse>
  | UseQueryResult<SearchResult[]> {
  const hasSearchQuery = filters.search && filters.search.trim().length > 0;

  // Prepare filter parameters
  const filterParams = {
    symbols: filters.symbols,
    subsectors: filters.subsectors,
    types: filters.types,
    date_from: filters.date_from,
    date_to: filters.date_to,
    pure_sector,
  };

  if (hasSearchQuery) {
    // SEARCH MODE: Use search endpoint (no pagination)
    const searchParams = {
      query: filters.search!,
      limit: 100, // Higher limit for search results
      ...filterParams,
    };

    return useQuery({
      queryKey: queryKeys.timeline.search(searchParams),
      queryFn: () => searchDocuments(searchParams),
      staleTime: 5 * 60 * 1000,
    }) as UseQueryResult<SearchResult[]>;
  }

  // LIST MODE: Use list endpoint with infinite scroll
  return useInfiniteQuery({
    queryKey: queryKeys.timeline.list({
      ...filterParams,
      limit: DEFAULT_LIMIT,
    }),
    queryFn: ({ pageParam }) =>
      listDocuments({
        ...filterParams,
        limit: DEFAULT_LIMIT,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.next_page_offset ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 5 * 60 * 1000,
  }) as UseInfiniteQueryResult<ListDocumentsResponse>;
}

/**
 * Type guard to check if query is in search mode
 */
export function isSearchMode(
  result:
    | UseInfiniteQueryResult<ListDocumentsResponse>
    | UseQueryResult<SearchResult[]>,
): result is UseQueryResult<SearchResult[]> {
  return !("hasNextPage" in result);
}

/**
 * Extract timeline items from query result (handles both modes)
 */
export function getTimelineItems(
  result:
    | UseInfiniteQueryResult<ListDocumentsResponse>
    | UseQueryResult<SearchResult[]>,
): Omit<SearchResult, "score">[] {
  if (isSearchMode(result)) {
    // Search mode: return search results
    return result.data || [];
  }

  // List mode: flatten all pages
  // Type assertion safe here because we know it's not search mode
  const infiniteResult =
    result as UseInfiniteQueryResult<ListDocumentsResponse>;
  const pages = (
    infiniteResult.data as InfiniteData<ListDocumentsResponse> | undefined
  )?.pages;
  if (!pages) return [];
  return pages.flatMap((page: ListDocumentsResponse) => page.items);
}
