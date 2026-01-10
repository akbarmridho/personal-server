import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import type { SearchResult } from "~/lib/api/types";
import { formatDate } from "~/lib/utils/date";
import { MarkdownRenderer } from "../markdown-renderer";

interface TimelineItemProps {
  item: Omit<SearchResult, "score">;
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

  const content = isExpanded
    ? item.payload.content
    : item.payload.content.slice(0, 500) + "...";

  const hasMore = item.payload.content.length > 500;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          {/* Metadata badges */}
          <div className="flex flex-wrap gap-2 flex-1">
            {/* Document type badge */}
            <Badge variant="outline" className="capitalize">
              {item.payload.type}
            </Badge>

            {/* Symbol badges */}
            {item.payload.symbols?.map((symbol) => (
              <Badge key={symbol} variant="default">
                {symbol}
              </Badge>
            ))}

            {/* Subsector badges (if no symbols) */}
            {!item.payload.symbols?.length &&
              item.payload.subsectors?.map((subsector) => (
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
            {formatDate(item.payload.document_date)}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold leading-tight mt-2">
          {document.title || `${item.payload.content.split(".")[0]}`}
        </h3>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Content */}
        {content ? (
          <MarkdownRenderer
            content={content}
            className={`${!isExpanded && hasMore ? "line-clamp-3" : ""}`}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No preview available
          </p>
        )}

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
          <div>Source: {item.payload.source?.name || "Unknown"}</div>

          {/* URLs */}
          {item.payload.source?.url && (
            <a
              href={item.payload.source?.url}
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
