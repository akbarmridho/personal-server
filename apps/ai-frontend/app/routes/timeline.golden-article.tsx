import { useMemo } from "react";
import { TimelineContainer } from "~/components/timeline/timeline-container";
import { useTimelineFilters } from "~/hooks/use-timeline-filters";
import type { Route } from "./+types/timeline.golden-article";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Golden Article - Vibe Investing" },
    {
      name: "description",
      content: "Browse golden article investment documents",
    },
  ];
}

export const handle = {
  headerTitle: "Golden Article",
};

/**
 * Golden Article Timeline Page
 * Shows documents from golden-article source (pre-filtered)
 * Supports ticker and subsector filtering
 */
export default function GoldenArticleTimeline() {
  const { filters } = useTimelineFilters();

  // Merge user filters with forced source filter
  const mergedFilters = useMemo(
    () => ({
      ...filters,
      source_names: ["golden-article"],
    }),
    [filters],
  );

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <TimelineContainer filters={mergedFilters} />
    </div>
  );
}
