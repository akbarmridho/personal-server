import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CategoryPerformanceChart } from "@/components/dashboard/CategoryPerformanceChart";
import { FinancialChart } from "@/components/dashboard/FinancialChart";
import { LowStockList } from "@/components/dashboard/LowStockList";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { InteractiveSalesTrendChart } from "@/components/dashboard/InteractiveSalesTrendChart";
import { TopProductsChart } from "@/components/dashboard/TopProductsChart";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getCurrentDateJakarta } from "@/lib/date-utils";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const today = getCurrentDateJakarta().format("YYYY-MM-DD");
  const [startDate] = useState<string>(
    getCurrentDateJakarta().subtract(30, "days").format("YYYY-MM-DD"),
  );
  const [endDate] = useState<string>(today);

  const {
    metrics,
    topProducts,
    categoryPerformance,
    lowStock,
    financial,
    isLoading,
  } = useAnalytics(startDate, endDate);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Memuat data...</div>
        </div>
      ) : (
        <>
          <MetricsCards metrics={metrics} />

          <div className="grid gap-6 lg:grid-cols-2">
            <InteractiveSalesTrendChart data={financial.map(item => ({ date: item.date, sales: item.revenue, cost: item.cost }))} />
            <FinancialChart data={financial} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TopProductsChart data={topProducts} />
            <CategoryPerformanceChart data={categoryPerformance} />
          </div>

          <LowStockList data={lowStock} />
        </>
      )}
    </div>
  );
}
