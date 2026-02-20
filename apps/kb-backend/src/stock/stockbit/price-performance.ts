import dayjs from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import type { JsonValue } from "../../infrastructure/db/types.js";
import { stockbitGetJson } from "./client.js";

export interface PricePerformance {
  close: number;
  low: number;
  high: number;
  percentage: string;
  timeframe: string;
}

export const getPricePerformance = async (symbol: string) => {
  const rawData = await KV.getOrSet(
    `stockbit.price-performance.${symbol}`,
    async () => {
      const data = await stockbitGetJson(
        `https://exodus.stockbit.com/company-price-feed/price-performance/${symbol}`,
      );

      return data as JsonValue;
    },
    dayjs().add(3, "hour").toDate(),
    true,
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
