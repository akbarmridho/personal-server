import { Link } from "@tanstack/react-router";
import { FolderTree, History, LayoutDashboard, Package } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { ROUTES } from "@/lib/constants";

const navigation = [
  {
    name: "Dashboard",
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
  },
    {
    name: "Produk",
    href: ROUTES.PRODUCTS,
    icon: Package,
  },
  {
    name: "Aktivitas",
    href: ROUTES.ACTIVITIES,
    icon: History,
  },
  {
    name: "Kategori",
    href: ROUTES.CATEGORIES,
    icon: FolderTree,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <img
            src="/logo192.png"
            alt="Inventory Tracker"
            className="h-8 w-8 rounded"
          />
          <h1 className="text-xl font-bold group-data-[collapsible=icon]:hidden">Inventori Barang</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild tooltip={item.name}>
                <Link
                  to={item.href}
                  className="flex items-center gap-3"
                  activeProps={{
                    className: "bg-accent font-medium",
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="px-2">
        <div className="flex justify-end w-full">
          <ThemeSwitch />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
