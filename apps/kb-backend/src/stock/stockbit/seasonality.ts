import dayjs from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import type { JsonObject, JsonValue } from "../../infrastructure/db/types.js";
import { proxiedAxios } from "../../utils/proxy.js";
import { StockbitAuthError, stockbitAuth } from "./auth.js";

export interface Seasonality {
  /** Historical percentage change in each month by year */
  price_change: {
    /**
     * Year-to-month map.
     * Each month (e.g., "Jan") represents % change in that month vs the previous month.
     * Positive = stock rose, negative = stock fell.
     * Example: { Jan: 5.7, Feb: -4.2, ... }
     */
    [year: string]: Record<string, number>;
  };

  /**
   * Average % change for each month across all available years.
   * e.g., { Jan: 5.25, Feb: -2.13, ... }
   */
  avg: Record<string, number>;

  /**
   * Number of years in which the stock price went up in that month.
   * e.g., { Jan: 5, Feb: 2, ... }
   */
  up: Record<string, number>;

  /**
   * Number of years in which the stock price went down in that month.
   * e.g., { Jan: 0, Feb: 3, ... }
   */
  down: Record<string, number>;

  /**
   * Total number of years of data available for each month.
   * e.g., { Jan: 5, Feb: 5, ... }
   */
  total_months: Record<string, number>;

  /**
   * Probability (%) of the stock going up in that month,
   * calculated as (up / total) * 100.
   * e.g., { Jan: 100, Feb: 40, ... }
   */
  prob: Record<string, number>;
}

export const getStockSeasonality = async (
  symbol: string,
): Promise<Seasonality> => {
  const year = dayjs().year();
  const rawData = await KV.getOrSet(
    `stockbit.seasonality.${symbol}.${year}`,
    async () => {
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const response = await proxiedAxios.get(
        `https://exodus.stockbit.com/seasonality/${symbol}?year=${year}&back_year=5`,
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

  const data = (rawData as JsonObject).data as Record<string, any>;

  return {
    price_change: Object.fromEntries(
      data.price_change.map((row) => [
        row.row,
        Object.fromEntries(
          row.columns.map((c) => [c.name, parseFloat(c.value) || null]),
        ),
      ]),
    ),
    up: Object.fromEntries(data.up.columns.map((c) => [c.name, c.value])),
    down: Object.fromEntries(data.down.columns.map((c) => [c.name, c.value])),
    total_months: Object.fromEntries(
      data.total_months.columns.map((c) => [c.name, c.value]),
    ),
    avg: Object.fromEntries(data.avg.columns.map((c) => [c.name, c.value])),
    prob: Object.fromEntries(data.prob.columns.map((c) => [c.name, c.value])),
  };
};
