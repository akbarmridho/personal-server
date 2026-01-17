import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Link as LinkIcon,
  Share2,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import type { SearchResult } from "~/lib/api/types";
import { cn, formatHyphenatedText } from "~/lib/utils";
import { formatDate } from "~/lib/utils/date";
import { MarkdownRenderer } from "../markdown-renderer";

interface TimelineItemProps {
  item: Omit<SearchResult, "score">;
  isSearchMode?: boolean;
  defaultExpanded?: boolean;
  hideShareButton?: boolean;
  // Golden article read tracking props
  isRead?: boolean;
  onMarkRead?: (documentId: string) => void;
  onMarkUnread?: (documentId: string) => void;
  isGoldenArticle?: boolean;
  // Timeline mode for badge display
  timelineMode?: "ticker" | "non-ticker" | "all";
  // Controlled expand/collapse state
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * Generate a title from content when title is missing
 */
function generateTitle(content: string): string {
  const firstSentence = content
    .match(/^.+?[.!?](?:\s|$)/)?.[0]
    ?.trim()
    .replace(/[.!?]$/, "");

  const first8Words = content.split(/\s+/).slice(0, 8).join(" ");

  // Use first 8 words if first sentence is too short (<= 3 words) or too long (> 15 words)
  if (firstSentence) {
    const wordCount = firstSentence.split(/\s+/).length;
    if (wordCount > 3 && wordCount <= 12) {
      return firstSentence;
    }
  }

  return first8Words || content.slice(0, 100);
}

/**
 * Expandable timeline item card - Compact & Glassmorphism Design
 */
export function TimelineItem({
  item,
  defaultExpanded = false,
  hideShareButton = false,
  isRead = false,
  onMarkRead,
  onMarkUnread,
  isGoldenArticle = false,
  timelineMode = "all",
  isExpanded: isExpandedProp,
  onToggleExpand,
}: TimelineItemProps) {
  const [isExpandedState, setIsExpandedState] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const location = useLocation();

  // Use controlled state if provided, otherwise use internal state
  const isExpanded =
    isExpandedProp !== undefined ? isExpandedProp : isExpandedState;
  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setIsExpandedState(!isExpandedState);
    }
  };

  // Function to copy iframe code to clipboard
  const handleCopyIframe = async () => {
    const baseUrl = window.location.origin;
    const embedUrl = `${baseUrl}/embed/document/${item.payload.id}`;
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="400" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;"></iframe>`;

    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy iframe code:", err);
    }
  };

  const content =
    isExpanded || item.payload.content.length < 500
      ? item.payload.content
      : `${item.payload.content.slice(0, 500)}...`;

  const hasMore = item.payload.content.length >= 500;

  // Title generation
  const title = item.payload.title || generateTitle(item.payload.content);

  // Merge URLs from source.url and urls array
  const allUrls: string[] = [];
  if (item.payload.source?.url) {
    allUrls.push(item.payload.source.url);
  }
  if (item.payload.urls) {
    allUrls.push(...item.payload.urls);
  }

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-border/50 bg-background/60 dark:bg-slate-900/40 backdrop-blur-md py-0">
      {/* Visual accent line on left based on type (optional, adding subtle detail) */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary/20 dark:bg-primary/40 group-hover:bg-primary transition-colors" />

      <div className="p-3 md:p-4 pl-4 md:pl-5 flex flex-col gap-3">
        {/* --- Header Row: Title & Meta --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div className="space-y-1.5 min-w-0 flex-1 w-full">
            <Link
              to={`/document/${item.payload.id}${location.search}`}
              className="font-semibold text-lg leading-snug tracking-tight text-foreground/95 hover:text-primary hover:underline transition-colors block"
            >
              {title}
            </Link>

            {/* Date - Mobile/Compact friendly */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
              <Calendar className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">
                {formatDate(item.payload.document_date)}
              </span>
            </div>
          </div>

          {/* Doc Type Badge, Read Status, & Share Button */}
          <div className="flex items-center gap-2 sm:shrink-0 flex-wrap mt-1 sm:mt-0">
            {/* Read Status (Interactive for Golden Articles) */}
            {isGoldenArticle && onMarkRead && onMarkUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRead) {
                    onMarkUnread(item.payload.id);
                  } else {
                    onMarkRead(item.payload.id);
                  }
                }}
                className={cn(
                  "h-5 px-2 text-xs uppercase tracking-wider font-semibold gap-1.5 transition-all duration-200",
                  isRead
                    ? "bg-green-100 text-green-700 border-green-400 hover:bg-green-400 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50 dark:hover:bg-green-900/50"
                    : "text-muted-foreground bg-background/50 border-border/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                )}
                title={isRead ? "Mark as unread" : "Mark as read"}
              >
                {isRead ? (
                  <>
                    <Check className="w-3 h-3" />
                    Read
                  </>
                ) : (
                  <>
                    <Circle className="w-3 h-3" />
                    Unread
                  </>
                )}
              </Button>
            )}

            {/* Document Type Badge (Always Static) */}
            <Badge
              variant="outline"
              className="text-xs h-5 px-2 uppercase tracking-wider font-medium text-muted-foreground bg-transparent border-border/60"
            >
              {item.payload.type}
            </Badge>

            {!hideShareButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyIframe}
                className="h-6 px-2 text-sm"
                title="Copy iframe embed code"
              >
                <Share2 className="w-3 h-3 mr-1" />
                {copied ? "Copied!" : "Embed"}
              </Button>
            )}
          </div>
        </div>

        {/* --- Content Body --- */}
        <div className="text-base text-muted-foreground/90 leading-relaxed font-light">
          <MarkdownRenderer
            content={content}
            className={`prose-base dark:prose-invert ${!isExpanded && hasMore ? "line-clamp-3" : ""}`}
          />

          {hasMore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              type="button"
              className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary/80 hover:text-primary transition-colors focus:outline-none cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> Show more
                </>
              )}
            </button>
          )}
        </div>

        {/* --- Footer Row: Metadata --- */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 pt-3 border-t border-border/40 mt-1">
          {/* Left: Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Symbols - Show on ticker timeline or all/golden-article timelines */}
            {(timelineMode === "ticker" ||
              timelineMode === "all" ||
              isGoldenArticle) &&
              item.payload.symbols?.map((symbol) => (
                <Badge
                  key={symbol}
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] font-medium bg-secondary/50 hover:bg-secondary/80 text-secondary-foreground transition-colors cursor-default"
                >
                  {symbol}
                </Badge>
              ))}

            {/* Subsectors - Show on non-ticker timeline or all/golden-article timelines */}
            {(timelineMode === "non-ticker" ||
              timelineMode === "all" ||
              isGoldenArticle) &&
              item.payload.subsectors?.map((subsector) => (
                <Badge
                  key={subsector}
                  variant="outline"
                  className="h-4 px-1.5 text-[10px] bg-background/50 text-muted-foreground border-border/50 flex items-center gap-1"
                >
                  <Building2 className="w-2.5 h-2.5 opacity-60" />
                  <span>{formatHyphenatedText(subsector)}</span>
                </Badge>
              ))}
          </div>

          {/* Right: Source */}
          <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <LinkIcon className="w-3 h-3" />
              <span className="hidden sm:inline-block">
                {item.payload.source?.name
                  ? formatHyphenatedText(item.payload.source.name)
                  : "Source"}
                {allUrls.length > 0 && ":"}
              </span>
              {allUrls.length > 0 && (
                <div className="flex items-center gap-1">
                  {allUrls.map((url, index) => (
                    <span key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline transition-colors"
                      >
                        {index + 1}
                      </a>
                      {index < allUrls.length - 1 && (
                        <span className="text-muted-foreground">,</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
