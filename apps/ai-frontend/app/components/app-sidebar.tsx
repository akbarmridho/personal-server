import { Layers, LayoutDashboard, Radio } from "lucide-react";
import { Link, useLocation } from "react-router";
import { FilterBar } from "~/components/filters/filter-bar";
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
} from "~/components/ui/sidebar";

export function AppSidebar() {
  const location = useLocation();
  const isAllActive = location.pathname.includes("/timeline/all");
  const isTickerActive = location.pathname.includes("/timeline/ticker");
  const isGeneralActive = location.pathname.includes("/timeline/non-ticker");

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
                  <Link to="/timeline/all">
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
                  <Link to="/timeline/ticker">
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
                  <Link to="/timeline/non-ticker">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Non-Ticker Timeline</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Search</SidebarGroupLabel>
          <SidebarGroupContent className="px-1">
            <FilterBar
              showTickerFilter={isAllActive || isTickerActive}
              showSubsectorFilter={isAllActive || isGeneralActive}
              compact={true}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t bg-muted/5">
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest"></span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
