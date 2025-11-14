import {
  AlertTriangle,
  DollarSign,
  FolderOpen,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      trend: "stable",
      trendValue: "0%",
    },
    {
      title: "Total Kategori",
      value: formatNumber(metrics.total_categories),
      icon: FolderOpen,
      trend: "up",
      trendValue: "+5.2%",
    },
    {
      title: "Stok Rendah",
      value: formatNumber(metrics.low_stock_items),
      icon: AlertTriangle,
      alert: metrics.low_stock_items > 0,
      trend: "down",
      trendValue: "-12%",
    },
    {
      title: "Transaksi Bulan Ini",
      value: formatNumber(metrics.total_transactions),
      icon: ShoppingCart,
      trend: "up",
      trendValue: "+8.1%",
    },
    {
      title: "Penjualan Bulan Ini",
      value: formatCurrency(metrics.total_sales),
      icon: DollarSign,
      trend: "up",
      trendValue: "+12.5%",
    },
    {
      title: "Laba Bersih",
      value: formatCurrency(metrics.net_profit),
      icon: TrendingUp,
      positive: metrics.net_profit > 0,
      trend: "up",
      trendValue: "+4.5%",
    },
  ];

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="@container/card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="grid gap-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {card.trend && (
                  <div className="flex items-center gap-1">
                    {card.trend === "up" ? (
                      <TrendingUp className="size-3" />
                    ) : card.trend === "down" ? (
                      <TrendingDown className="size-3" />
                    ) : null}
                    <span>{card.trendValue}</span>
                  </div>
                )}
              </CardDescription>
            </div>
            <CardAction>
              <Badge variant="outline" className="text-muted-foreground/70">
                {card.trend === "up" ? (
                  <TrendingUp className="size-4" />
                ) : card.trend === "down" ? (
                  <TrendingDown className="size-4" />
                ) : null}
                {card.trendValue}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-semibold tabular-nums @[250px]/card:text-3xl ${card.alert ? "text-destructive" : ""}`}
            >
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
