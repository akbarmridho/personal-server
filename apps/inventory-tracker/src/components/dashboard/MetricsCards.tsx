import {
  AlertTriangle,
  DollarSign,
  FolderOpen,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/date-utils";
import type { DashboardMetrics } from "@/types/api";

interface MetricsCardsProps {
  metrics?: DashboardMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  if (!metrics) return null;

  const cards = [
    {
      title: "Total Produk",
      value: formatNumber(metrics.total_products),
      icon: Package,
    },
    {
      title: "Total Kategori",
      value: formatNumber(metrics.total_categories),
      icon: FolderOpen,
    },
    {
      title: "Stok Rendah",
      value: formatNumber(metrics.low_stock_items),
      icon: AlertTriangle,
      alert: metrics.low_stock_items > 0,
    },
    {
      title: "Transaksi Bulan Ini",
      value: formatNumber(metrics.total_transactions),
      icon: ShoppingCart,
    },
    {
      title: "Penjualan Bulan Ini",
      value: formatCurrency(metrics.total_sales),
      icon: DollarSign,
    },
    {
      title: "Laba Bersih",
      value: formatCurrency(metrics.net_profit),
      icon: TrendingUp,
      positive: metrics.net_profit > 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon
              className={`h-4 w-4 ${card.alert ? "text-destructive" : card.positive ? "text-green-600" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${card.alert ? "text-destructive" : ""}`}
            >
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
