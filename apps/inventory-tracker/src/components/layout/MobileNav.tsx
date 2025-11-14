import { Link } from "@tanstack/react-router";
import {
  FolderTree,
  History,
  LayoutDashboard,
  Menu,
  Package,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

const navigation = [
  { name: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: "Kategori", href: ROUTES.CATEGORIES, icon: FolderTree },
  { name: "Produk", href: ROUTES.PRODUCTS, icon: Package },
  { name: "Aktivitas", href: ROUTES.ACTIVITIES, icon: History },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-40 h-full w-64 bg-background p-4 shadow-lg">
            <div className="mb-8 mt-16">
              <h1 className="text-xl font-bold">Inventory Tracker</h1>
            </div>
            <nav className="flex flex-col gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
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
        </>
      )}
    </div>
  );
}
