import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { dateToFormatted } from "../utils.js";
import type { BaseStockbitResponse } from "./auth.js";
import { stockbitGetJson } from "./client.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const JAKARTA_TIMEZONE = "Asia/Jakarta";
const INTRADAY_WINDOW_DAYS = 7;
const DAILY_WINDOW_YEARS = 3;
const CORP_ACTION_FUTURE_END_DATE = "2037-01-01";

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

interface ChartbitIntradayData {
  close: number | string;
  datetime: string;
  foreign_buy: number | string;
  foreign_sell: number | string;
  frequency: number | string;
  high: number | string;
  low: number | string;
  open: number | string;
  symbol: string;
  unix_timestamp: number | string;
  value: number | string;
  volume: number | string;
}

interface ChartbitCorpActionData {
  id: string;
  time: number | string;
  color: string;
  label: string;
  tooltips: string[];
}

export interface UnifiedChartCandle {
  timestamp: number;
  datetime: string;
  date: string;
  interval: "1d";
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  frequency: number;
  foreign_buy: number;
  foreign_sell: number;
  foreign_flow: number;
  cumulative_foreign_flow: number;
  dividend: number;
  share_outstanding: number;
  market_cap_close: number;
  freq_analyzer: number;
  is_partial: false;
}

export interface UnifiedIntradayCandle {
  timestamp: number;
  datetime: string;
  date: string;
  interval: "1m";
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  frequency: number;
  foreign_buy: number;
  foreign_sell: number;
  foreign_flow: number;
  is_partial: boolean;
}

export interface UnifiedCorpActionEvent {
  id: string;
  timestamp: number;
  datetime: string;
  label: string;
  tooltips: string[];
}

export interface UnifiedChartbitRawData {
  daily: UnifiedChartCandle[];
  intraday_1m: UnifiedIntradayCandle[];
  corp_actions: UnifiedCorpActionEvent[];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseJakartaDateTime(dateTime: string): dayjs.Dayjs {
  return dayjs.tz(dateTime, "YYYY-MM-DD HH:mm:ss", JAKARTA_TIMEZONE);
}

export const getIntradayChartbitData = async (input: {
  symbol: string;
  fromUnix: number;
  toUnix: number;
}) => {
  const data = await stockbitGetJson<
    BaseStockbitResponse<{
      allow_decimal: number;
      chartbit: ChartbitIntradayData[];
    }>
  >(
    `https://exodus.stockbit.com/chartbit/${input.symbol}/price/intraday?from=${input.fromUnix}&to=${input.toUnix}&limit=0`,
  );

  if (!Array.isArray(data.data?.chartbit)) {
    throw new Error("Invalid intraday response shape from Stockbit");
  }

  return data.data.chartbit;
};

export const getChartbitCorpActions = async (input: {
  symbol: string;
  from: string;
  to: string;
}) => {
  const data =
    await stockbitGetJson<BaseStockbitResponse<ChartbitCorpActionData[]>>(
    `https://exodus.stockbit.com/chartbit/chart/corpaction?from=${input.from}&to=${input.to}&symbol=${input.symbol}`,
  );

  if (!Array.isArray(data.data)) {
    throw new Error("Invalid corporate action response shape from Stockbit");
  }

  return data.data;
};

function normalizeDailyData(rows: ChartbitData[]): UnifiedChartCandle[] {
  return rows
    .map((row) => {
      const timestamp = toNumber(row.unixdate);
      const dateTime = dayjs
        .unix(timestamp)
        .tz(JAKARTA_TIMEZONE)
        .format("YYYY-MM-DD HH:mm:ss");

      return {
        timestamp,
        datetime: dateTime,
        date: row.date,
        interval: "1d",
        open: toNumber(row.open),
        high: toNumber(row.high),
        low: toNumber(row.low),
        close: toNumber(row.close),
        volume: toNumber(row.volume),
        value: toNumber(row.value),
        frequency: toNumber(row.frequency),
        foreign_buy: toNumber(row.foreignbuy),
        foreign_sell: toNumber(row.foreignsell),
        foreign_flow: toNumber(row.foreignbuy) - toNumber(row.foreignsell),
        cumulative_foreign_flow: toNumber(row.foreignflow),
        dividend: toNumber(row.dividend),
        share_outstanding: toNumber(row.shareoutstanding),
        market_cap_close: toNumber(row.soxclose),
        freq_analyzer: toNumber(row.freq_analyzer),
        is_partial: false,
      } satisfies UnifiedChartCandle;
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function normalizeIntradayRows(
  rows: ChartbitIntradayData[],
): UnifiedIntradayCandle[] {
  return rows
    .map((row) => {
      const timestamp = toNumber(row.unix_timestamp);
      const dateTime = parseJakartaDateTime(row.datetime);

      return {
        timestamp,
        datetime: dateTime.format("YYYY-MM-DD HH:mm:ss"),
        date: dateTime.format("YYYY-MM-DD"),
        interval: "1m" as const,
        open: toNumber(row.open),
        high: toNumber(row.high),
        low: toNumber(row.low),
        close: toNumber(row.close),
        volume: toNumber(row.volume),
        value: toNumber(row.value),
        frequency: toNumber(row.frequency),
        foreign_buy: toNumber(row.foreign_buy),
        foreign_sell: toNumber(row.foreign_sell),
        foreign_flow: toNumber(row.foreign_buy) - toNumber(row.foreign_sell),
        is_partial: false,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function normalizeCorpActions(
  rows: ChartbitCorpActionData[],
): UnifiedCorpActionEvent[] {
  return rows
    .map((row) => {
      const timestamp = toNumber(row.time);
      return {
        id: row.id,
        timestamp,
        datetime: dayjs
          .unix(timestamp)
          .tz(JAKARTA_TIMEZONE)
          .format("YYYY-MM-DD HH:mm:ss"),
        label: row.label,
        tooltips: Array.isArray(row.tooltips) ? row.tooltips : [],
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function mergeCorpActions(
  historical: UnifiedCorpActionEvent[],
  upcoming: UnifiedCorpActionEvent[],
): UnifiedCorpActionEvent[] {
  const deduped = new Map<string, UnifiedCorpActionEvent>();

  for (const event of [...historical, ...upcoming]) {
    const key = `${event.id}:${event.timestamp}`;
    if (!deduped.has(key)) {
      deduped.set(key, event);
    }
  }

  return [...deduped.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export const getChartbitData = async (input: {
  symbol: string;
  from: Date;
  to: Date;
}) => {
  const fromFormatted = dateToFormatted(input.from);
  const toFormatted = dateToFormatted(input.to);

  // somehow stockbit swap the from and to date filtering logic. not sure why they did this
  const data = await stockbitGetJson<
    BaseStockbitResponse<{
      chartbit: ChartbitData[];
    }>
  >(
    `https://exodus.stockbit.com/chartbit/${input.symbol}/price/daily?from=${toFormatted}&to=${fromFormatted}&limit=0`,
  );

  return data.data.chartbit;
};

export const getUnifiedChartbitRawData = async (symbol: string) => {
  const now = dayjs().tz(JAKARTA_TIMEZONE);
  const dailyFromDate = now.subtract(DAILY_WINDOW_YEARS, "year").toDate();
  const dailyToDate = now.toDate();
  const dailyFrom = dateToFormatted(dailyFromDate);
  const dailyTo = dateToFormatted(dailyToDate);

  const intradayFromUnix = now.unix();
  const intradayToUnix = now.subtract(INTRADAY_WINDOW_DAYS, "day").unix();

  const corpHistoricalFrom = dailyFrom;
  const corpHistoricalTo = dailyTo;
  const corpUpcomingFrom = dailyTo;
  const corpUpcomingTo = CORP_ACTION_FUTURE_END_DATE;

  const [dailyRows, intradayRows, corpHistoricalRows, corpUpcomingRows] =
    await Promise.all([
      getChartbitData({
        symbol,
        from: dailyFromDate,
        to: dailyToDate,
      }),
      getIntradayChartbitData({
        symbol,
        fromUnix: intradayFromUnix,
        toUnix: intradayToUnix,
      }),
      getChartbitCorpActions({
        symbol,
        from: corpHistoricalFrom,
        to: corpHistoricalTo,
      }),
      getChartbitCorpActions({
        symbol,
        from: corpUpcomingFrom,
        to: corpUpcomingTo,
      }),
    ]);

  const daily = normalizeDailyData(dailyRows);
  const intraday1m = normalizeIntradayRows(intradayRows);
  const corpActions = mergeCorpActions(
    normalizeCorpActions(corpHistoricalRows),
    normalizeCorpActions(corpUpcomingRows),
  );

  return {
    daily,
    intraday_1m: intraday1m,
    corp_actions: corpActions,
  } satisfies UnifiedChartbitRawData;
};
