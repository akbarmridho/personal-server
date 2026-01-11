import { TimelineContainer } from "~/components/timeline/timeline-container";
import { useTimelineFilters } from "~/hooks/use-timeline-filters";
import type { Route } from "./+types/timeline.ticker";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "General Timeline - Investment Timeline" },
    {
      name: "description",
      content: "Browse general investment documents",
    },
  ];
}

/**
 * General Timeline Page
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
