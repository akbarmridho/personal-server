import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { KV } from "../../infrastructure/db/kv.js";
import type { Json } from "../../infrastructure/db/types.js";
import { logger } from "../../utils/logger.js";
import { dateToFormatted } from "../utils.js";
import type { BaseStockbitResponse } from "./auth.js";
import { stockbitGetJson } from "./client.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const JAKARTA_TIMEZONE = "Asia/Jakarta";
const INTRADAY_WINDOW_DAYS = 7;
const DAILY_WINDOW_YEARS = 3;
const CORP_ACTION_FUTURE_END_DATE = "2037-01-01";
const DAILY_CHARTBIT_CACHE_VERSION = "v3";
/** Overlap days fetched beyond gap boundary for partial-bar refresh and split detection */
const DAILY_CACHE_OVERLAP_DAYS = 7;

interface DailyChartbitCache {
  /** Earliest date in cache (YYYY-MM-DD) */
  from: string;
  /** Latest date in cache (YYYY-MM-DD) */
  to: string;
  /** All cached bars, sorted ascending by unixdate */
  bars: ChartbitData[];
}

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

type UnifiedChartbitRawDataOptions = {
  asOfDate?: string;
};

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

export function resolveAsOfDate(asOfDate?: string): dayjs.Dayjs {
  const now = dayjs().tz(JAKARTA_TIMEZONE);
  if (!asOfDate) {
    return now;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
    throw new Error(
      `Invalid as_of_date "${asOfDate}". Use YYYY-MM-DD in Asia/Jakarta timezone.`,
    );
  }

  const parsed = parseJakartaDateTime(`${asOfDate} 23:59:59`);
  if (!parsed.isValid()) {
    throw new Error(
      `Invalid as_of_date "${asOfDate}". Use YYYY-MM-DD in Asia/Jakarta timezone.`,
    );
  }

  if (asOfDate === now.format("YYYY-MM-DD")) {
    return now;
  }

  if (parsed.isAfter(now)) {
    throw new Error(
      `Invalid as_of_date "${asOfDate}". Future dates are not allowed.`,
    );
  }

  return parsed;
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
  const data = await stockbitGetJson<
    BaseStockbitResponse<ChartbitCorpActionData[]>
  >(
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
  const requestedFrom = dateToFormatted(input.from);
  const requestedTo = dateToFormatted(input.to);
  const cacheKey = buildDailyCacheKey(input.symbol);

  // 1. Read existing cache
  const existing = (await KV.get(
    cacheKey,
  )) as unknown as DailyChartbitCache | null;

  // 2. Compute fetch ranges with overlap
  const fetchRanges = computeFetchRanges(existing, requestedFrom, requestedTo);

  if (fetchRanges.length === 0 && existing) {
    // Cache fully covers the requested range — return filtered
    return filterBarsByRange(existing.bars, input.from, input.to);
  }

  // 3. Fetch from Stockbit API
  const fetched = await fetchDailyBars(input.symbol, fetchRanges);

  // 4. Split/adjustment detection on overlap bars
  if (existing && fetched.length > 0) {
    const mismatch = detectPriceAdjustment(
      existing.bars,
      fetched,
      input.symbol,
    );
    if (mismatch) {
      // Nuke cache and refetch everything
      logger.warn(
        { symbol: input.symbol, mismatch },
        "Price adjustment detected (split/right issue/merge). Invalidating cache and refetching.",
      );
      await KV.set(cacheKey, null as unknown as Json);
      const fullFetch = await fetchDailyBars(input.symbol, [
        { from: requestedFrom, to: requestedTo },
      ]);
      const sorted = fullFetch.sort((a, b) => a.unixdate - b.unixdate);
      await writeDailyCache(cacheKey, sorted, requestedFrom, requestedTo);
      return filterBarsByRange(sorted, input.from, input.to);
    }
  }

  // 5. Merge: fetched bars overwrite cached bars for same date (handles partial bar refresh)
  const merged = mergeBars(existing?.bars ?? [], fetched);

  // 6. Write back
  await writeDailyCache(cacheKey, merged, requestedFrom, requestedTo);

  // 7. Filter to requested range
  return filterBarsByRange(merged, input.from, input.to);
};

function buildDailyCacheKey(symbol: string): string {
  return [
    "stockbit",
    "chartbit",
    "daily",
    DAILY_CHARTBIT_CACHE_VERSION,
    symbol,
  ].join(":");
}

function computeFetchRanges(
  existing: DailyChartbitCache | null,
  requestedFrom: string,
  requestedTo: string,
): Array<{ from: string; to: string }> {
  if (!existing) {
    return [{ from: requestedFrom, to: requestedTo }];
  }

  const ranges: Array<{ from: string; to: string }> = [];

  // Gap before cached range
  if (requestedFrom < existing.from) {
    // Extend into cached range by overlap days for split detection
    const overlapEnd = dayjs
      .tz(existing.from, JAKARTA_TIMEZONE)
      .add(DAILY_CACHE_OVERLAP_DAYS, "day")
      .format("YYYY-MM-DD");
    const fetchTo = overlapEnd < existing.to ? overlapEnd : existing.from;
    ranges.push({ from: requestedFrom, to: fetchTo });
  }

  // Gap after cached range (always overlap into cached range for partial bar + split detection)
  if (requestedTo > existing.to) {
    const overlapStart = dayjs
      .tz(existing.to, JAKARTA_TIMEZONE)
      .subtract(DAILY_CACHE_OVERLAP_DAYS, "day")
      .format("YYYY-MM-DD");
    const fetchFrom = overlapStart > existing.from ? overlapStart : existing.to;
    ranges.push({ from: fetchFrom, to: requestedTo });
  }

  // Edge case: requested range is within cached range but cache.to is today
  // (partial bar from earlier intraday fetch). Always refetch last overlap window.
  const todayStr = dayjs().tz(JAKARTA_TIMEZONE).format("YYYY-MM-DD");
  if (ranges.length === 0 && existing.to >= todayStr) {
    const overlapStart = dayjs
      .tz(existing.to, JAKARTA_TIMEZONE)
      .subtract(DAILY_CACHE_OVERLAP_DAYS, "day")
      .format("YYYY-MM-DD");
    ranges.push({ from: overlapStart, to: requestedTo });
  }

  return ranges;
}

async function fetchDailyBars(
  symbol: string,
  ranges: Array<{ from: string; to: string }>,
): Promise<ChartbitData[]> {
  const results: ChartbitData[] = [];
  for (const range of ranges) {
    // Stockbit swaps from/to in their API
    const data = await stockbitGetJson<
      BaseStockbitResponse<{ chartbit: ChartbitData[] }>
    >(
      `https://exodus.stockbit.com/chartbit/${symbol}/price/daily?from=${range.to}&to=${range.from}&limit=0`,
    );
    if (Array.isArray(data.data?.chartbit)) {
      results.push(...data.data.chartbit);
    }
  }
  return results;
}

function detectPriceAdjustment(
  cachedBars: ChartbitData[],
  fetchedBars: ChartbitData[],
  symbol: string,
): { date: string; cached_close: number; fetched_close: number } | null {
  const cachedByDate = new Map<string, ChartbitData>();
  for (const bar of cachedBars) {
    cachedByDate.set(bar.date, bar);
  }

  for (const fetched of fetchedBars) {
    const cached = cachedByDate.get(fetched.date);
    if (!cached) continue;

    // Compare close prices — if they differ, prices were retroactively adjusted
    const cachedClose = toNumber(cached.close);
    const fetchedClose = toNumber(fetched.close);
    if (cachedClose > 0 && fetchedClose > 0 && cachedClose !== fetchedClose) {
      logger.warn(
        {
          symbol,
          date: fetched.date,
          cached_close: cachedClose,
          fetched_close: fetchedClose,
          ratio: Math.round((cachedClose / fetchedClose) * 100) / 100,
        },
        "Price mismatch on overlap bar",
      );
      return {
        date: fetched.date,
        cached_close: cachedClose,
        fetched_close: fetchedClose,
      };
    }
  }

  return null;
}

function mergeBars(
  cachedBars: ChartbitData[],
  fetchedBars: ChartbitData[],
): ChartbitData[] {
  const byDate = new Map<string, ChartbitData>();
  // Cached first, then fetched overwrites (handles partial bar refresh)
  for (const bar of cachedBars) {
    byDate.set(bar.date, bar);
  }
  for (const bar of fetchedBars) {
    byDate.set(bar.date, bar);
  }
  return [...byDate.values()].sort((a, b) => a.unixdate - b.unixdate);
}

async function writeDailyCache(
  cacheKey: string,
  bars: ChartbitData[],
  requestedFrom: string,
  requestedTo: string,
): Promise<void> {
  const newFrom = bars.length > 0 ? bars[0].date : requestedFrom;
  const newTo = bars.length > 0 ? bars[bars.length - 1].date : requestedTo;
  const payload: DailyChartbitCache = { from: newFrom, to: newTo, bars };
  await KV.set(cacheKey, payload as unknown as Json);
}

function filterBarsByRange(
  bars: ChartbitData[],
  from: Date,
  to: Date,
): ChartbitData[] {
  const fromTs = Math.floor(from.getTime() / 1000);
  const toTs = Math.floor(to.getTime() / 1000);
  return bars.filter((row) => row.unixdate >= fromTs && row.unixdate <= toTs);
}

export const getUnifiedChartbitRawData = async (
  symbol: string,
  options: UnifiedChartbitRawDataOptions = {},
) => {
  const asOf = resolveAsOfDate(options.asOfDate);
  const asOfUnix = asOf.unix();
  const now = dayjs().tz(JAKARTA_TIMEZONE);
  const dailyFromDate = asOf.subtract(DAILY_WINDOW_YEARS, "year").toDate();
  const dailyToDate = asOf.toDate();

  const intradayFromUnix = asOfUnix;
  const intradayToUnix = asOf.subtract(INTRADAY_WINDOW_DAYS, "day").unix();

  const corpHistoricalFrom = dateToFormatted(
    now.subtract(DAILY_WINDOW_YEARS, "year").toDate(),
  );
  const corpHistoricalTo = dateToFormatted(now.toDate());
  const corpUpcomingFrom = corpHistoricalTo;
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

  const daily = normalizeDailyData(dailyRows).filter(
    (row) => row.timestamp <= asOfUnix,
  );
  const intraday1m = normalizeIntradayRows(intradayRows).filter(
    (row) => row.timestamp <= asOfUnix,
  );
  const corpActions = mergeCorpActions(
    normalizeCorpActions(corpHistoricalRows),
    normalizeCorpActions(corpUpcomingRows),
  ).filter((row) => row.timestamp <= asOfUnix);

  return {
    daily,
    intraday_1m: intraday1m,
    corp_actions: corpActions,
  } satisfies UnifiedChartbitRawData;
};
