import { Link } from "@tanstack/react-router";
import { FolderTree, History, LayoutDashboard, Package } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: "Kategori", href: ROUTES.CATEGORIES, icon: FolderTree },
  { name: "Produk", href: ROUTES.PRODUCTS, icon: Package },
  { name: "Aktivitas", href: ROUTES.ACTIVITIES, icon: History },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-2 border-r bg-background p-4",
        className,
      )}
    >
      <div className="mb-4">
        <h1 className="text-xl font-bold">Inventory Tracker</h1>
      </div>
      <nav className="flex flex-col gap-1">
        {navigation.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
            activeProps={{
              className: "bg-accent font-medium",
            }}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
