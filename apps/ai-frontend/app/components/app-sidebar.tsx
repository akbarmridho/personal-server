import {
  Layers,
  LayoutDashboard,
  Radio,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { FilterBar } from "~/components/filters/filter-bar";
import { ProfileSelectorModal } from "~/components/profile-selector-modal";
import { ThemeToggle } from "~/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "~/components/ui/sidebar";
import { useProfile } from "~/contexts/profile-context";

export function AppSidebar() {
  const location = useLocation();
  const { profile } = useProfile();
  const { isMobile, setOpenMobile } = useSidebar();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const isAllActive = location.pathname.includes("/timeline/all");
  const isTickerActive = location.pathname.includes("/timeline/ticker");
  const isGeneralActive = location.pathname.includes("/timeline/non-ticker");
  const isGoldenArticleActive = location.pathname.includes(
    "/timeline/golden-article",
  );
  const isTimelinePage = location.pathname.includes("/timeline/");

  // Close sidebar on mobile when switching timelines
  const handleTimelineClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">Vibe Investing</h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Views</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isAllActive}
                  tooltip="All Timeline"
                >
                  <Link to="/timeline/all" onClick={handleTimelineClick}>
                    <Layers className="h-4 w-4" />
                    <span>All Timeline</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isTickerActive}
                  tooltip="Ticker Timeline"
                >
                  <Link to="/timeline/ticker" onClick={handleTimelineClick}>
                    <Radio className="h-4 w-4" />
                    <span>Ticker Timeline</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isGeneralActive}
                  tooltip="Non-Ticker Timeline"
                >
                  <Link to="/timeline/non-ticker" onClick={handleTimelineClick}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Non-Ticker Timeline</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isGoldenArticleActive}
                  tooltip="Golden Article"
                >
                  <Link
                    to="/timeline/golden-article"
                    onClick={handleTimelineClick}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Golden Article</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Only show filters on timeline pages, not on document view */}
        {isTimelinePage && (
          <>
            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>Search</SidebarGroupLabel>
              <SidebarGroupContent className="px-1">
                <FilterBar
                  showTickerFilter={
                    isAllActive || isTickerActive || isGoldenArticleActive
                  }
                  showSubsectorFilter={
                    isAllActive || isGeneralActive || isGoldenArticleActive
                  }
                  showReadStatusFilter={isGoldenArticleActive}
                  showSourceFilter={!isGoldenArticleActive}
                  compact={true}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t bg-muted/5">
        <div className="flex items-center justify-between w-full">
          {/* Profile selector button (shown on all timeline pages when profile exists) */}
          {isTimelinePage && profile && (
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-accent/50 hover:cursor-pointer"
            >
              <UserCircle className="h-4 w-4" />
              <span className="font-medium">{profile}</span>
            </button>
          )}
          {(!isTimelinePage || !profile) && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest"></span>
          )}
          <ThemeToggle />
        </div>
      </SidebarFooter>

      {/* Profile Selector Modal */}
      <ProfileSelectorModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
      />
    </Sidebar>
  );
}
