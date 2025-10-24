import axios from "axios";
import dayjs from "dayjs";
import { KV } from "../../db/kv.js";
import type { JsonValue } from "../../db/types.js";
import { dateToFormatted } from "../utils.js";
import {
  type BaseStockbitResponse,
  StockbitAuthError,
  stockbitAuth,
} from "./auth.js";

/**
 * Represents daily stock trading data (Chartbit format).
 */
export interface ChartbitData {
  /**
   * Trading date in ISO format (YYYY-MM-DD).
   * Example: "2025-10-17"
   */
  date: string;

  /**
   * UNIX timestamp for the trading date (seconds since epoch).
   * Example: 1760634000
   */
  unixdate: number;

  /**
   * Opening price of the stock for the day.
   * Usually in local currency (e.g., IDR).
   */
  open: number;

  /**
   * Highest price reached during the trading session.
   */
  high: number;

  /**
   * Lowest price reached during the trading session.
   */
  low: number;

  /**
   * Closing price of the stock at market close.
   */
  close: number;

  /**
   * Total number of shares traded during the day.
   */
  volume: number;

  /**
   * Total value of shares bought by foreign investors.
   * Usually expressed in local currency.
   */
  foreignbuy: number;

  /**
   * Total value of shares sold by foreign investors.
   * Usually expressed in local currency.
   */
  foreignsell: number;

  /**
   * Total number of individual trade transactions during the day.
   */
  frequency: number;

  /**
   * Net foreign flow = foreignbuy - foreignsell.
   * Positive → net inflow; Negative → net outflow.
   */
  foreignflow: number;

  /**
   * Estimated market capitalization at close
   * (close × shareoutstanding).
   */
  soxclose: number;

  /**
   * Dividend per share distributed on that date (if any).
   * 0 means no dividend.
   */
  dividend: number;

  /**
   * Total transaction value traded that day
   * (sum of price × volume across all trades).
   */
  value: number;

  /**
   * Total shares currently outstanding for the company.
   * Used to calculate market capitalization.
   */
  shareoutstanding: number;

  /**
   * Computed liquidity or activity ratio, possibly derived from
   * trade frequency and volume.
   * Not a standard market metric.
   */
  freq_analyzer: number;
}

export const getChartbitData = async (input: {
  ticker: string;
  from: Date;
  to: Date;
}) => {
  const fromFormatted = dateToFormatted(input.from);
  const toFormatted = dateToFormatted(input.to);

  const rawData = await KV.getOrSet(
    `stockbit.chartbit.${input.ticker}.${fromFormatted}.${toFormatted}`,
    async () => {
      const authData = await stockbitAuth.get();

      if (!authData) {
        throw new StockbitAuthError("Stockbit auth not found");
      }

      const response = await axios.get(
        `https://exodus.stockbit.com/chartbit/${input.ticker}/price/daily?from=${fromFormatted}&to=${toFormatted}&limit=0`,
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

  const data = rawData as any as BaseStockbitResponse<{
    chartbit: ChartbitData[];
  }>;

  return data.data.chartbit;
};
