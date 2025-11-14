import { Bar, BarChart, XAxis, YAxis } from "recharts";
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
import type { TopProduct } from "@/types/api";

interface TopProductsChartProps {
  data: TopProduct[];
}

const chartConfig = {
  revenue: {
    label: "Pendapatan",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function TopProductsChart({ data }: TopProductsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produk Terlaris</CardTitle>
        <CardDescription>10 produk dengan penjualan tertinggi</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} layout="vertical" accessibilityLayer>
            <XAxis type="number" hide />
            <YAxis
              dataKey="product_name"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={120}
              tickFormatter={(value) =>
                value.length > 15 ? value.slice(0, 15) + "..." : value
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload as TopProduct;
                    return `${item?.product_name} (${item?.category_name})`;
                  }}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
