import { TimelineContainer } from "~/components/timeline/timeline-container";
import { useTimelineFilters } from "~/hooks/use-timeline-filters";
import type { Route } from "./+types/timeline.non-ticker";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Non-Ticker Timeline" },
    {
      name: "description",
      content: "Browse non-ticker investment documents",
    },
  ];
}

/**
 * Non-Ticker Timeline Page
 * Shows documents WITHOUT specific stock symbols
 */
export default function GeneralTimeline() {
  const { filters } = useTimelineFilters();

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <TimelineContainer filters={filters} pure_sector={true} />
    </div>
  );
}
