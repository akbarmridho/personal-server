import { stockbitGetJson } from "./client.js";

export interface PricePerformance {
  close: number;
  low: number;
  high: number;
  percentage: string;
  timeframe: string;
}

export const getPricePerformance = async (symbol: string) => {
  const rawData = await stockbitGetJson<any>(
    `https://exodus.stockbit.com/company-price-feed/price-performance/${symbol}`,
  );

  return (rawData as any).data.prices.map((e) => {
    return {
      close: e.close.raw,
      high: e.high.raw,
      low: e.low.raw,
      percentage: e.percentage.formatted
        .replaceAll("(", "")
        .replaceAll(")", ""),
      timeframe: e.timeframe,
    };
  }) as PricePerformance[];
};
