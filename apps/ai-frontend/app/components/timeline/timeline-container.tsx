import type { UseInfiniteQueryResult } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  getTimelineItems,
  isSearchMode,
  useTimelineQuery,
} from "~/hooks/use-timeline-query";
import type { ListDocumentsResponse } from "~/lib/api/types";
import type { TimelineFilters } from "~/lib/utils/url-params";
import { EmptyState } from "./empty-state";
import { TimelineItem } from "./timeline-item";
import { TimelineSkeleton } from "./timeline-skeleton";

interface TimelineContainerProps {
  filters: TimelineFilters;
  pure_sector?: boolean;
}

/**
 * Main timeline container with infinite scroll support
 */
export function TimelineContainer({
  filters,
  pure_sector,
}: TimelineContainerProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const queryResult = useTimelineQuery(filters, pure_sector);

  const isSearch = isSearchMode(queryResult);
  const items = getTimelineItems(queryResult);

  // Infinite scroll observer (only for list mode)
  useEffect(() => {
    if (isSearch) return; // Skip for search mode
    if (!loadMoreRef.current) return;

    // Type assertion safe here because we checked isSearch above
    const infiniteQuery =
      queryResult as UseInfiniteQueryResult<ListDocumentsResponse>;
    if (!infiniteQuery.hasNextPage || infiniteQuery.isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          infiniteQuery.fetchNextPage();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [isSearch, queryResult]);

  // Loading state (initial load)
  if (queryResult.isLoading) {
    return <TimelineSkeleton count={5} />;
  }

  // Error state
  if (queryResult.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex flex-col gap-2">
            <p>Failed to load documents</p>
            <p className="text-sm">
              {queryResult.error instanceof Error
                ? queryResult.error.message
                : "An unexpected error occurred"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryResult.refetch()}
              className="w-fit"
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (!items.length) {
    return (
      <EmptyState
        message={
          filters.search ? "No matching documents" : "No documents found"
        }
        description={
          filters.search
            ? "Try a different search query or adjust your filters"
            : "Try adjusting your filters or check back later"
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline items */}
      {items.map((item) => {
        return (
          <TimelineItem key={item.id} item={item} isSearchMode={isSearch} />
        );
      })}

      {/* Infinite scroll trigger (list mode only) */}
      {!isSearch &&
        (() => {
          // Type assertion safe here because we're in list mode
          const infiniteQuery =
            queryResult as UseInfiniteQueryResult<ListDocumentsResponse>;
          return (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {infiniteQuery.isFetchingNextPage && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading more...</span>
                </div>
              )}
              {!infiniteQuery.hasNextPage && items.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  No more documents to load
                </p>
              )}
            </div>
          );
        })()}

      {/* Search mode result count */}
      {isSearch && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Found {items.length} matching documents
        </p>
      )}
    </div>
  );
}
