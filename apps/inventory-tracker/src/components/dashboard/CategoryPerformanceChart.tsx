import { Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/date-utils";
import type { CategoryPerformance } from "@/types/api";

interface CategoryPerformanceChartProps {
  data: CategoryPerformance[];
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function CategoryPerformanceChart({
  data,
}: CategoryPerformanceChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const chartConfig = data.reduce((acc, item, index) => {
    acc[`cat_${item.category_id}`] = {
      label: item.category_name,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performa Kategori</CardTitle>
        <CardDescription>Penjualan berdasarkan kategori produk</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(_, __, item) => {
                    const payload = item.payload as CategoryPerformance;
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">
                          {payload.category_name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Pendapatan: {formatCurrency(payload.revenue)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Terjual: {payload.total_sales} unit
                        </div>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="revenue"
              nameKey="category_name"
              innerRadius={60}
              strokeWidth={5}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
