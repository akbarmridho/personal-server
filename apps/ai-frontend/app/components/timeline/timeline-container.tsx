import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ScrollToTopButton } from "~/components/scroll-to-top-button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import { useProfile } from "~/contexts/profile-context";
import {
  useMarkAsRead,
  useMarkAsUnread,
  useReadArticles,
} from "~/hooks/use-read-articles";
import {
  getPaginationMetadata,
  getTimelineItems,
  isSearchMode,
  useTimelineQuery,
} from "~/hooks/use-timeline-query";
import type { TimelineFilters } from "~/lib/utils/url-params";
import { EmptyState } from "./empty-state";
import { TimelineItem } from "./timeline-item";
import { TimelineSkeleton } from "./timeline-skeleton";

interface TimelineContainerProps {
  filters: TimelineFilters;
  pure_sector?: boolean;
  // Read tracking props (uses app-wide profile)
  enableReadTracking?: boolean;
  // Timeline mode for badge display
  timelineMode?: "ticker" | "non-ticker" | "all";
}

const SCROLL_STATE_KEY = "timeline-scroll-state";
const EXPANDED_STATE_KEY = "timeline-expanded-state";

/**
 * Main timeline container with pagination support
 * Includes read tracking when enabled (uses app-wide profile)
 * Preserves scroll position and expanded state on navigation
 */
export function TimelineContainer({
  filters,
  pure_sector,
  enableReadTracking = false,
  timelineMode = "all",
}: TimelineContainerProps) {
  const [, setSearchParams] = useSearchParams();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    // Restore expanded state from sessionStorage
    if (typeof window === "undefined") return new Set();
    try {
      const saved = sessionStorage.getItem(EXPANDED_STATE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Read tracking hooks (uses app-wide profile)
  const { profile } = useProfile();
  const { data: readIds = [] } = useReadArticles(
    enableReadTracking ? profile : null,
  );
  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();

  // Determine if this is a golden article timeline
  const isGoldenArticleTimeline =
    enableReadTracking && filters.source_names?.includes("golden-article");

  const queryResult = useTimelineQuery(filters, pure_sector);

  const isSearch = isSearchMode(queryResult);
  const items = getTimelineItems(queryResult);
  const paginationMetadata = !isSearch
    ? getPaginationMetadata(queryResult)
    : null;

  // Save expanded state to sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        EXPANDED_STATE_KEY,
        JSON.stringify(Array.from(expandedItems)),
      );
    } catch {
      // Ignore errors
    }
  }, [expandedItems]);

  // Restore scroll position after data loads
  useEffect(() => {
    if (queryResult.isLoading) return;
    if (typeof window === "undefined") return;

    try {
      const saved = sessionStorage.getItem(SCROLL_STATE_KEY);
      if (saved) {
        const scrollY = Number.parseInt(saved, 10);
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
    } catch {
      // Ignore errors
    }
  }, [queryResult.isLoading]);

  // Save scroll position before navigating away
  useEffect(() => {
    const saveScrollPosition = () => {
      if (typeof window === "undefined") return;
      try {
        sessionStorage.setItem(SCROLL_STATE_KEY, String(window.scrollY));
      } catch {
        // Ignore errors
      }
    };

    window.addEventListener("beforeunload", saveScrollPosition);
    return () => window.removeEventListener("beforeunload", saveScrollPosition);
  }, []);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    // Scroll to top when changing pages
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (newPage === 1) {
        newParams.delete("page");
      } else {
        newParams.set("page", String(newPage));
      }
      return newParams;
    });
  };

  // Handle expand/collapse
  const handleToggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

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
        const isRead = isGoldenArticleTimeline && readIds.includes(item.id);
        return (
          <TimelineItem
            key={item.id}
            item={item}
            isSearchMode={isSearch}
            isRead={isRead}
            isExpanded={expandedItems.has(item.id)}
            onToggleExpand={() => handleToggleExpand(item.id)}
            onMarkRead={
              isGoldenArticleTimeline && profile
                ? (documentId) => {
                    markAsRead.mutate({ profileId: profile, documentId });
                  }
                : undefined
            }
            onMarkUnread={
              isGoldenArticleTimeline && profile
                ? (documentId) => {
                    markAsUnread.mutate({ profileId: profile, documentId });
                  }
                : undefined
            }
            isGoldenArticle={isGoldenArticleTimeline}
            timelineMode={timelineMode}
          />
        );
      })}

      {/* Search mode result count */}
      {isSearch && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Found {items.length} matching documents
        </p>
      )}

      {/* List mode result count */}
      {!isSearch && paginationMetadata && (
        <p className="text-center text-sm text-muted-foreground pt-4 pb-2">
          Showing{" "}
          {(paginationMetadata.page - 1) * paginationMetadata.page_size + 1} -{" "}
          {Math.min(
            paginationMetadata.page * paginationMetadata.page_size,
            paginationMetadata.total_count,
          )}{" "}
          of {paginationMetadata.total_count} documents
        </p>
      )}

      {/* Pagination (list mode only) */}
      {!isSearch &&
        paginationMetadata &&
        paginationMetadata.total_pages > 1 && (
          <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      handlePageChange(paginationMetadata.page - 1)
                    }
                    disabled={paginationMetadata.page === 1}
                    size="default"
                  />
                </PaginationItem>

                {/* Page numbers */}
                {generatePageNumbers(
                  paginationMetadata.page,
                  paginationMetadata.total_pages,
                ).map((pageNum, index) => {
                  if (pageNum === -1) {
                    return (
                      <PaginationItem
                        key={`ellipsis-${
                          // biome-ignore lint/suspicious/noArrayIndexKey: safe because ellipsis are deterministic
                          index
                        }`}
                      >
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNum)}
                        isActive={pageNum === paginationMetadata.page}
                        size="icon"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      handlePageChange(paginationMetadata.page + 1)
                    }
                    disabled={
                      paginationMetadata.page === paginationMetadata.total_pages
                    }
                    size="default"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

      {/* Scroll to top button */}
      <ScrollToTopButton />
    </div>
  );
}

/**
 * Generate page numbers for pagination with ellipsis
 * Returns array where -1 represents ellipsis
 */
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
): number[] {
  const pages: number[] = [];
  const showMax = 7; // Maximum pages to show

  if (totalPages <= showMax) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push(-1); // Ellipsis
    }

    // Show pages around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push(-1); // Ellipsis
    }

    // Always show last page
    pages.push(totalPages);
  }

  return pages;
}
