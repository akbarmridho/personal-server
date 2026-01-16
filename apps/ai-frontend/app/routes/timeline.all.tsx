import { TimelineContainer } from "~/components/timeline/timeline-container";
import { useTimelineFilters } from "~/hooks/use-timeline-filters";
import type { Route } from "./+types/timeline.all";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "All Timeline - Vibe Investing" },
    {
      name: "description",
      content: "Browse all investment documents",
    },
  ];
}

export const handle = {
  headerTitle: "All Timeline",
};

/**
 * All Timeline Page
 * Shows ALL documents (both with and without stock symbols)
 */
export default function AllTimeline() {
  const { filters } = useTimelineFilters();

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <TimelineContainer filters={filters} timelineMode="all" />
    </div>
  );
}
