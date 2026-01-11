import { LayoutDashboard, Radio } from "lucide-react";
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
  const isTickerActive = location.pathname.includes("/timeline/ticker");
  const isGeneralActive = location.pathname.includes("/timeline/general");

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">
            Investment Timeline
          </h1>
          <p className="text-xs text-muted-foreground">
            Personal research & analysis
          </p>
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
                  tooltip="General Timeline"
                >
                  <Link to="/timeline/general">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>General Timeline</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Refine Search</SidebarGroupLabel>
          <SidebarGroupContent className="px-1">
            <FilterBar
              showTickerFilter={isTickerActive}
              showSubsectorFilter={isGeneralActive}
              compact={true}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t bg-muted/5">
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            v1.2.0
          </span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
