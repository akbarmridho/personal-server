import { Outlet } from "react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

/**
 * Layout for chat routes with sidebar navigation
 * Wraps chat pages with the app sidebar
 */
export default function ChatLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
