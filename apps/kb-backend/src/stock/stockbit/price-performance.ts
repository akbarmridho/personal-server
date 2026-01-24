import dayjs from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import type { JsonValue } from "../../infrastructure/db/types.js";
import { proxiedAxios } from "../../utils/proxy.js";
import { StockbitAuthError, stockbitAuth } from "./auth.js";

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
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const response = await proxiedAxios.get(
        `https://exodus.stockbit.com/company-price-feed/price-performance/${symbol}`,
        {
          headers: {
            Authorization: `Bearer ${authData.accessToken}`,
          },
        },
      );

      const data = response.data;

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
