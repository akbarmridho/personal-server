import { useState } from "react";
import { Outlet, useMatches } from "react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { ProfileSelectorModal } from "~/components/profile-selector-modal";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { useProfile } from "~/contexts/profile-context";

/**
 * Shared layout for timeline pages - Shadcn Sidebar Design
 * Shows profile selector modal on first visit if no profile exists
 */
export default function TimelineLayout() {
  const { shouldShowModal, dismissModal } = useProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Get the current route's handle for dynamic title
  const matches = useMatches();
  const currentRoute = matches[matches.length - 1];
  const headerTitle =
    (currentRoute?.handle as { headerTitle?: string })?.headerTitle ||
    "Vibe Investing";

  // Show profile modal on mount if needed (first-time visitors)
  // Using setTimeout to avoid hydration mismatch
  if (shouldShowModal && !showProfileModal && typeof window !== "undefined") {
    setTimeout(() => setShowProfileModal(true), 100);
  }

  const handleModalChange = (open: boolean) => {
    setShowProfileModal(open);
    if (!open) {
      dismissModal(); // Mark as shown even if user closes without selecting
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header - Sticky for tools */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-md px-4 transition-all duration-200">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />
            <h2 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">
              {headerTitle}
            </h2>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1000px]">
            <Outlet />
          </div>
        </div>
      </SidebarInset>

      {/* Profile Selector Modal (first-time visit) */}
      <ProfileSelectorModal
        open={showProfileModal}
        onOpenChange={handleModalChange}
      />
    </SidebarProvider>
  );
}
