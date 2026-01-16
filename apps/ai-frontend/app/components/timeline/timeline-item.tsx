import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Link as LinkIcon,
  Share2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import type { SearchResult } from "~/lib/api/types";
import { formatHyphenatedText } from "~/lib/utils";
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
  isSearchMode = false,
  defaultExpanded = false,
  hideShareButton = false,
  isRead = false,
  onMarkRead,
  onMarkUnread,
  isGoldenArticle = false,
}: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const location = useLocation();

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

      <div className="p-4 pl-5 flex flex-col gap-3">
        {/* --- Header Row: Title & Meta --- */}
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <Link
              to={`/document/${item.payload.id}${location.search}`}
              className="font-semibold text-base leading-snug tracking-tight text-foreground/95 hover:text-primary hover:underline transition-colors block"
            >
              {title}
            </Link>

            {/* Date - Mobile/Compact friendly */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(item.payload.document_date)}</span>
            </div>
          </div>

          {/* Doc Type Badge, Read Status, & Share Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Read Status Badge (Golden Article only) */}
            {isGoldenArticle && (
              <Badge
                variant={isRead ? "default" : "outline"}
                className={
                  isRead
                    ? "text-[10px] h-5 px-2 uppercase tracking-wider font-medium bg-green-600 text-white border-green-600"
                    : "text-[10px] h-5 px-2 uppercase tracking-wider font-medium text-muted-foreground bg-transparent border-border/60"
                }
              >
                {isRead ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Read
                  </>
                ) : (
                  <>
                    <Circle className="w-3 h-3 mr-1" />
                    Unread
                  </>
                )}
              </Badge>
            )}

            {/* Document Type Badge */}
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-2 uppercase tracking-wider font-medium text-muted-foreground bg-transparent border-border/60"
            >
              {item.payload.type}
            </Badge>

            {/* Mark as Read/Unread Button (Golden Article only) */}
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
                className="h-6 px-2 text-xs"
                title={isRead ? "Mark as unread" : "Mark as read"}
              >
                {isRead ? (
                  <X className="w-3 h-3" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </Button>
            )}

            {!hideShareButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyIframe}
                className="h-6 px-2 text-xs"
                title="Copy iframe embed code"
              >
                <Share2 className="w-3 h-3 mr-1" />
                {copied ? "Copied!" : "Embed"}
              </Button>
            )}
          </div>
        </div>

        {/* --- Content Body --- */}
        <div className="text-sm text-muted-foreground/90 leading-relaxed font-light">
          <MarkdownRenderer
            content={content}
            className={`prose-sm dark:prose-invert ${!isExpanded && hasMore ? "line-clamp-3" : ""}`}
          />

          {hasMore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              type="button"
              className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary transition-colors focus:outline-none cursor-pointer"
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
        <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-1">
          {/* Left: Tags */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Symbols */}
            {item.payload.symbols?.map((symbol) => (
              <Badge
                key={symbol}
                variant="secondary"
                className="h-5 px-2 text-[10px] font-medium bg-secondary/50 hover:bg-secondary/80 text-secondary-foreground transition-colors cursor-default"
              >
                {symbol}
              </Badge>
            ))}

            {/* Subsectors (if no symbols) */}
            {!item.payload.symbols?.length &&
              item.payload.subsectors?.map((subsector) => (
                <Badge
                  key={subsector}
                  variant="outline"
                  className="h-5 px-2 text-[10px] bg-background/50 text-muted-foreground border-border/50 flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3 opacity-60" />
                  <span>{formatHyphenatedText(subsector)}</span>
                </Badge>
              ))}
          </div>

          {/* Right: Source */}
          <div className="flex items-center gap-3 shrink-0 pl-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
