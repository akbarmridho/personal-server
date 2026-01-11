import { TimelineContainer } from "~/components/timeline/timeline-container";
import { useTimelineFilters } from "~/hooks/use-timeline-filters";
import type { Route } from "./+types/timeline.ticker";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ticker Timeline" },
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

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <TimelineContainer filters={filters} pure_sector={false} />
    </div>
  );
}
