import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

export const Route = createRootRoute({
  component: () => (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className="hidden lg:flex lg:w-64" />
      <MobileNav />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  ),
});
