"use client";

import { FolderTree, History, LayoutDashboard, Package } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { ROUTES } from "@/lib/constants";

const navigation = [
  { 
    name: "Dashboard", 
    href: ROUTES.DASHBOARD, 
    icon: LayoutDashboard 
  },
  { 
    name: "Kategori", 
    href: ROUTES.CATEGORIES, 
    icon: FolderTree 
  },
  { 
    name: "Produk", 
    href: ROUTES.PRODUCTS, 
    icon: Package 
  },
  { 
    name: "Aktivitas", 
    href: ROUTES.ACTIVITIES, 
    icon: History 
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Inventori Barang</h1>
          <ModeToggle />
        </div>
      </SidebarHeader>
      <SidebarContent>
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
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* User profile or additional actions can go here */}
      </SidebarFooter>
    </Sidebar>
  );
}