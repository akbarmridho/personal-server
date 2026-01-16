import { useEffect, useMemo, useState } from "react";
import { ProfileSelectorModal } from "~/components/golden-article/profile-selector-modal";
import { TimelineContainer } from "~/components/timeline/timeline-container";
import { useGoldenArticleProfile } from "~/hooks/use-golden-article-profile";
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
 * Includes read tracking functionality with profile selection
 */
export default function GoldenArticleTimeline() {
  const { filters } = useTimelineFilters();
  const { hasProfile } = useGoldenArticleProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Show profile modal on first load if no profile exists
  useEffect(() => {
    if (!hasProfile) {
      setShowProfileModal(true);
    }
  }, [hasProfile]);

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
      {/* Profile Selector Modal (first load if no profile) */}
      <ProfileSelectorModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
      />

      {/* Timeline with Read Tracking */}
      <TimelineContainer filters={mergedFilters} enableReadTracking={true} />
    </div>
  );
}
