import { useState } from "react";
import { FilterBar } from "~/components/filters/filter-bar";
import { TimelineContainer } from "~/components/timeline/timeline-container";
import { useTimelineFilters } from "~/hooks/use-timeline-filters";
import type { Route } from "./+types/timeline.ticker";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ticker Timeline - Investment Timeline" },
    {
      name: "description",
      content: "Browse ticker-specific investment documents",
    },
  ];
}

/**
 * Ticker Timeline Page
 * Shows documents WITH stock symbols (ticker-specific news, filings, analysis)
 */
export default function TickerTimeline() {
  const { filters } = useTimelineFilters();
  const [search, setSearch] = useState<string | undefined>();

  // Combine URL filters with local search state
  const combinedFilters = { ...filters, search };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">Ticker Timeline</h2>
        <p className="text-muted-foreground mt-1">
          Documents with stock symbols
        </p>
      </div>

      {/* Filters */}
      <FilterBar showTickerFilter onSearchChange={setSearch} />

      {/* Timeline */}
      <TimelineContainer filters={combinedFilters} />
    </div>
  );
}
