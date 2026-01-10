import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import type { DocumentSnapshot, SearchResult } from "~/lib/api/types";
import { formatDate } from "~/lib/utils/date";
import { MarkdownRenderer } from "../markdown-renderer";

interface TimelineItemProps {
  item: DocumentSnapshot | SearchResult;
  isSearchMode?: boolean;
}

/**
 * Expandable timeline item card
 */
export function TimelineItem({
  item,
  isSearchMode = false,
}: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract document and similarity score
  const document =
    "document" in item
      ? (item as SearchResult).document
      : (item as DocumentSnapshot);
  const similarityScore =
    "similarity_score" in item ? item.similarity_score : null;

  // Determine content to display
  // SearchResult has full InvestmentDocument with content
  // DocumentSnapshot has only preview
  const content = (() => {
    if ("document" in item) {
      // SearchResult mode - has full content
      const doc = (item as SearchResult).document;
      return isExpanded ? doc.content : doc.content.slice(0, 200) + "...";
    }
    // List mode - DocumentSnapshot with preview
    const snapshot = item as DocumentSnapshot;
    return isExpanded ? snapshot.preview : snapshot.preview;
  })();

  const hasMore =
    "document" in item && (item as SearchResult).document.content.length > 200;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          {/* Metadata badges */}
          <div className="flex flex-wrap gap-2 flex-1">
            {/* Document type badge */}
            <Badge variant="outline" className="capitalize">
              {document.type}
            </Badge>

            {/* Similarity score (search mode only) */}
            {similarityScore !== null && (
              <Badge variant="secondary">
                {(similarityScore * 100).toFixed(1)}% match
              </Badge>
            )}

            {/* Symbol badges */}
            {document.symbols?.map((symbol) => (
              <Badge key={symbol} variant="default">
                {symbol}
              </Badge>
            ))}

            {/* Subsector badges (if no symbols) */}
            {!document.symbols?.length &&
              document.subsectors?.map((subsector) => (
                <Badge
                  key={subsector}
                  variant="secondary"
                  className="capitalize"
                >
                  {subsector.replace(/_/g, " ")}
                </Badge>
              ))}
          </div>

          {/* Date */}
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(document.document_date)}
          </div>
        </div>

        {/* Title */}
        {document.title && (
          <h3 className="text-lg font-semibold leading-tight mt-2">
            {document.title}
          </h3>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Content */}
        <MarkdownRenderer
          content={content}
          className={`${!isExpanded && hasMore ? "line-clamp-3" : ""}`}
        />

        {/* Expand/Collapse button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show more
              </>
            )}
          </Button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
          {/* Source */}
          <div>
            Source:{" "}
            {document.source?.platform || document.source?.type || "Unknown"}
          </div>

          {/* URLs */}
          {document.urls && document.urls.length > 0 && (
            <a
              href={document.urls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              View source
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
