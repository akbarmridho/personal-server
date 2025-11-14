import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "@/lib/api";
import { getCurrentDateJakarta } from "@/lib/date-utils";

export function useAnalytics(startDate?: string, endDate?: string) {
  const today = getCurrentDateJakarta().format("YYYY-MM-DD");
  const defaultStart = getCurrentDateJakarta()
    .subtract(30, "days")
    .format("YYYY-MM-DD");

  const metricsQuery = useQuery({
    queryKey: ["analytics", "metrics", startDate, endDate],
    queryFn: () =>
      analyticsAPI.getDashboardMetrics(
        startDate || defaultStart,
        endDate || today,
        true,
        true,
      ),
  });

  const trendsQuery = useQuery({
    queryKey: ["analytics", "trends", startDate, endDate],
    queryFn: () =>
      analyticsAPI.getSalesTrends(startDate || defaultStart, endDate || today),
  });

  const topProductsQuery = useQuery({
    queryKey: ["analytics", "top-products", startDate, endDate],
    queryFn: () =>
      analyticsAPI.getTopProducts(
        startDate || defaultStart,
        endDate || today,
        10,
      ),
  });

  const categoryPerformanceQuery = useQuery({
    queryKey: ["analytics", "category-performance", startDate, endDate],
    queryFn: () =>
      analyticsAPI.getCategoryPerformance(
        startDate || defaultStart,
        endDate || today,
      ),
  });

  const lowStockQuery = useQuery({
    queryKey: ["analytics", "low-stock"],
    queryFn: () => analyticsAPI.getLowStockAlerts(10),
  });

  const financialQuery = useQuery({
    queryKey: ["analytics", "financial", startDate, endDate],
    queryFn: () =>
      analyticsAPI.getFinancialAnalytics(
        startDate || defaultStart,
        endDate || today,
      ),
  });

  return {
    metrics: metricsQuery.data,
    trends: trendsQuery.data || [],
    topProducts: topProductsQuery.data || [],
    categoryPerformance: categoryPerformanceQuery.data || [],
    lowStock: lowStockQuery.data || [],
    financial: financialQuery.data || [],
    isLoading:
      metricsQuery.isLoading ||
      trendsQuery.isLoading ||
      topProductsQuery.isLoading ||
      categoryPerformanceQuery.isLoading ||
      lowStockQuery.isLoading ||
      financialQuery.isLoading,
  };
}
