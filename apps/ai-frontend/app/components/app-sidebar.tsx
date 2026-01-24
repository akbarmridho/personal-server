import { ChevronRight, Layers, MessageSquare, UserCircle } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { ChatSidebarContent } from "~/components/chat-sidebar-content";
import { FilterBar } from "~/components/filters/filter-bar";
import { ProfileSelectorModal } from "~/components/profile-selector-modal";
import { ThemeToggle } from "~/components/theme-toggle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { useProfile } from "~/contexts/profile-context";

export function AppSidebar() {
  const location = useLocation();
  const { profile } = useProfile();
  const { isMobile, setOpenMobile } = useSidebar();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const isChatPage = location.pathname.startsWith("/chat");
  const isAllActive = location.pathname.includes("/timeline/all");
  const isTickerActive = location.pathname.includes("/timeline/ticker");
  const isGeneralActive = location.pathname.includes("/timeline/non-ticker");
  const isGoldenArticleActive = location.pathname.includes(
    "/timeline/golden-article",
  );
  const isChatActive = location.pathname.includes("/chat");
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

      <SidebarContent className="gap-0">
        {isChatPage ? (
          <ChatSidebarContent />
        ) : (
          <SidebarGroup>
            <SidebarMenu>
              <Collapsible asChild defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Timeline"
                      className="hover:cursor-pointer"
                    >
                      <Layers className="h-4 w-4" />
                      <span>Timeline</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isAllActive}>
                          <Link
                            to="/timeline/all"
                            onClick={handleTimelineClick}
                          >
                            <span>All Timeline</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isTickerActive}>
                          <Link
                            to="/timeline/ticker"
                            onClick={handleTimelineClick}
                          >
                            <span>Ticker Timeline</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isGeneralActive}
                        >
                          <Link
                            to="/timeline/non-ticker"
                            onClick={handleTimelineClick}
                          >
                            <span>Non-Ticker Timeline</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isGoldenArticleActive}
                        >
                          <Link
                            to="/timeline/golden-article"
                            onClick={handleTimelineClick}
                          >
                            <span>Golden Article</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isChatActive}
                  tooltip="AI Chat"
                >
                  <Link to="/chat" onClick={handleTimelineClick}>
                    <MessageSquare className="h-4 w-4" />
                    <span>AI Chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Only show filters on timeline pages, not on document view */}
        {isTimelinePage && (
          <SidebarGroup className="pt-0">
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
