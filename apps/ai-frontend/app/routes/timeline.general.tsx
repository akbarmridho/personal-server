import { useState } from "react";
import { FilterBar } from "~/components/filters/filter-bar";
import { TimelineContainer } from "~/components/timeline/timeline-container";
import { useTimelineFilters } from "~/hooks/use-timeline-filters";
import type { Route } from "./+types/timeline.general";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "General Timeline - Investment Timeline" },
    {
      name: "description",
      content: "Browse general market investment documents",
    },
  ];
}

/**
 * General Timeline Page
 * Shows documents WITHOUT stock symbols (macro/general market news, analysis)
 * Uses pure_sector=true filter to exclude symbol-based documents
 */
export default function GeneralTimeline() {
  const { filters } = useTimelineFilters();
  const [search, setSearch] = useState<string | undefined>();

  // Combine URL filters with local search state
  const combinedFilters = { ...filters, search };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">General Timeline</h2>
        <p className="text-muted-foreground mt-1">
          General market documents (no specific symbols)
        </p>
      </div>

      {/* Filters */}
      <FilterBar showSubsectorFilter onSearchChange={setSearch} />

      {/* Timeline */}
      <TimelineContainer filters={combinedFilters} pure_sector={true} />
    </div>
  );
}
