import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { checkSymbol } from "../../aggregator/companies.js";
import {
  getChartbitData,
  resolveAsOfDate,
} from "../../stockbit/chartbit.js";
import {
  getMarketDetectorDailySnapshotCached,
  type MarketDetectorData,
} from "../../stockbit/market-detector.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const JAKARTA_TIMEZONE = "Asia/Jakarta";
const DEFAULT_TRADING_DAYS = 30;
const MAX_TRADING_DAYS = 60;
const MIN_LOOKBACK_CALENDAR_DAYS = 90;
const LOOKBACK_MULTIPLIER = 3;
const BROKER_SUMMARY_READY_HOUR_WIB = 19;

type BrokerFlowRow = {
  broker: string;
  broker_type: string | null;
  value: number;
  lots: number;
  avg_price: number;
  frequency: number;
};

type BrokerFlowSeriesDay = {
  date: string;
  buy_rows: BrokerFlowRow[];
  sell_rows: BrokerFlowRow[];
};

export type BrokerFlowRawSeriesResponse = {
  symbol: string;
  today_snapshot_included: boolean;
  today_snapshot_ready_after_wib: "19:00";
  window: {
    requested_trading_days: number;
    actual_trading_days: number;
    from: string;
    to: string;
    as_of_date: string;
  };
  filters: {
    transaction_type: "gross";
    market_board: "regular";
    investor_type: "all";
    limit: number;
  };
  series: BrokerFlowSeriesDay[];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const parseTradingDays = (raw?: number | string): number => {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_TRADING_DAYS;
  }

  const parsed =
    typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_TRADING_DAYS) {
    throw new Error(
      `Invalid trading_days "${String(raw)}". Use an integer between 1 and ${MAX_TRADING_DAYS}.`,
    );
  }

  return parsed;
};

const normalizeBrokerRow = (
  row: Record<string, unknown> | undefined,
  side: "buy" | "sell",
): BrokerFlowRow | null => {
  if (!row) {
    return null;
  }

  const broker = String(row.netbs_broker_code || "").trim().toUpperCase();
  if (!broker) {
    return null;
  }

  const value = toNumber(side === "buy" ? row.bval : row.sval);
  const lots = toNumber(side === "buy" ? row.blot : row.slot);
  const avgPrice = toNumber(
    side === "buy" ? row.netbs_buy_avg_price : row.netbs_sell_avg_price,
  );
  const frequency = toNumber(row.freq);

  return {
    broker,
    broker_type: typeof row.type === "string" ? row.type : null,
    value: Math.round(value),
    lots: Math.round(lots),
    avg_price: avgPrice,
    frequency: Math.round(frequency),
  };
};

const normalizeSnapshotDay = (
  date: string,
  snapshot: MarketDetectorData,
): BrokerFlowSeriesDay => {
  const buyRows = Array.isArray(snapshot.broker_summary?.brokers_buy)
    ? snapshot.broker_summary.brokers_buy
        .map((row) =>
          normalizeBrokerRow(row as Record<string, unknown>, "buy"),
        )
        .filter((row): row is BrokerFlowRow => row !== null)
    : [];

  const sellRows = Array.isArray(snapshot.broker_summary?.brokers_sell)
    ? snapshot.broker_summary.brokers_sell
        .map((row) =>
          normalizeBrokerRow(row as Record<string, unknown>, "sell"),
        )
        .filter((row): row is BrokerFlowRow => row !== null)
    : [];

  return {
    date,
    buy_rows: buyRows,
    sell_rows: sellRows,
  };
};

const getTradingDatesFromDailyOhlcv = async (input: {
  symbol: string;
  asOfDate?: string;
  tradingDays: number;
}): Promise<string[]> => {
  const asOf = resolveAsOfDate(input.asOfDate);
  const now = dayjs().tz(JAKARTA_TIMEZONE);
  const todayJakarta = now.format("YYYY-MM-DD");
  const shouldIncludeTodayBrokerSummary =
    now.hour() >= BROKER_SUMMARY_READY_HOUR_WIB;
  const lookbackCalendarDays = Math.max(
    MIN_LOOKBACK_CALENDAR_DAYS,
    input.tradingDays * LOOKBACK_MULTIPLIER,
  );
  const dailyRows = await getChartbitData({
    symbol: input.symbol,
    from: asOf.subtract(lookbackCalendarDays, "day").toDate(),
    to: asOf.toDate(),
  });

  const asOfUnix = asOf.unix();
  const sorted = [...dailyRows].sort((a, b) => a.unixdate - b.unixdate);
  const visibleRows = sorted.filter((row) => {
    if (row.unixdate > asOfUnix) {
      return false;
    }

    if (row.date !== todayJakarta) {
      return true;
    }

    return shouldIncludeTodayBrokerSummary;
  });
  const lastRows = visibleRows.slice(-input.tradingDays);

  if (lastRows.length === 0) {
    throw new Error(
      `No daily OHLCV data available for ${input.symbol} up to ${asOf.format("YYYY-MM-DD")}.`,
    );
  }

  return lastRows.map((row) => row.date);
};

const tradingDateToJakartaDate = (date: string): Date =>
  dayjs.tz(`${date} 00:00:00`, "YYYY-MM-DD HH:mm:ss", JAKARTA_TIMEZONE).toDate();

export const getStockBrokerFlowRawSeries = async (
  rawSymbol: string,
  options: {
    asOfDate?: string;
    tradingDays?: number | string;
  } = {},
): Promise<BrokerFlowRawSeriesResponse> => {
  const symbol = await checkSymbol(rawSymbol);
  const tradingDays = parseTradingDays(options.tradingDays);
  const asOf = resolveAsOfDate(options.asOfDate);
  const tradingDates = await getTradingDatesFromDailyOhlcv({
    symbol,
    asOfDate: options.asOfDate,
    tradingDays,
  });

  const snapshots = await Promise.all(
    tradingDates.map(async (date) => {
      const snapshot = await getMarketDetectorDailySnapshotCached({
        symbol,
        date: tradingDateToJakartaDate(date),
        transactionType: "TRANSACTION_TYPE_GROSS",
        marketBoard: "MARKET_BOARD_REGULER",
        investorType: "INVESTOR_TYPE_ALL",
        limit: 25,
      });

      return normalizeSnapshotDay(date, snapshot);
    }),
  );
  const todayJakarta = dayjs().tz(JAKARTA_TIMEZONE).format("YYYY-MM-DD");

  return {
    symbol,
    today_snapshot_included: tradingDates.includes(todayJakarta),
    today_snapshot_ready_after_wib: "19:00",
    window: {
      requested_trading_days: tradingDays,
      actual_trading_days: snapshots.length,
      from: tradingDates[0] || asOf.format("YYYY-MM-DD"),
      to: tradingDates[tradingDates.length - 1] || asOf.format("YYYY-MM-DD"),
      as_of_date: asOf.format("YYYY-MM-DD"),
    },
    filters: {
      transaction_type: "gross",
      market_board: "regular",
      investor_type: "all",
      limit: 25,
    },
    series: snapshots,
  };
};
