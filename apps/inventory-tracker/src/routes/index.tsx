import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { CategoryPerformanceChart } from "@/components/dashboard/CategoryPerformanceChart";
import { FinancialChart } from "@/components/dashboard/FinancialChart";
import { LowStockList } from "@/components/dashboard/LowStockList";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { TopProductsChart } from "@/components/dashboard/TopProductsChart";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getCurrentDateJakarta } from "@/lib/date-utils";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

type DateFilter = "daily" | "weekly" | "monthly" | "custom";

function DashboardPage() {
  const today = getCurrentDateJakarta().format("YYYY-MM-DD");
  const [dateFilter, setDateFilter] = useState<DateFilter>("monthly");
  const [startDate, setStartDate] = useState<string>(
    getCurrentDateJakarta().subtract(30, "days").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState<string>(today);
  const [showCustom, setShowCustom] = useState(false);

  const {
    metrics,
    trends,
    topProducts,
    categoryPerformance,
    lowStock,
    financial,
    isLoading,
  } = useAnalytics(startDate, endDate);

  const handleFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    const now = getCurrentDateJakarta();

    if (filter === "daily") {
      setStartDate(now.subtract(7, "days").format("YYYY-MM-DD"));
      setEndDate(today);
      setShowCustom(false);
    } else if (filter === "weekly") {
      setStartDate(now.subtract(4, "weeks").format("YYYY-MM-DD"));
      setEndDate(today);
      setShowCustom(false);
    } else if (filter === "monthly") {
      setStartDate(now.subtract(30, "days").format("YYYY-MM-DD"));
      setEndDate(today);
      setShowCustom(false);
    } else if (filter === "custom") {
      setShowCustom(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Analitik dan ringkasan inventori
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={dateFilter === "daily" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("daily")}
          >
            Harian
          </Button>
          <Button
            variant={dateFilter === "weekly" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("weekly")}
          >
            Mingguan
          </Button>
          <Button
            variant={dateFilter === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("monthly")}
          >
            Bulanan
          </Button>
          <Button
            variant={dateFilter === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange("custom")}
          >
            <Calendar className="h-4 w-4" />
            Kustom
          </Button>
        </div>
      </div>

      {showCustom && (
        <div className="flex flex-wrap gap-4 rounded-lg border p-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Memuat data...</div>
        </div>
      ) : (
        <>
          <MetricsCards metrics={metrics} />

          <div className="grid gap-6 lg:grid-cols-2">
            <SalesTrendChart data={trends} />
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
