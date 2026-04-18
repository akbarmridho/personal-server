import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { logger } from "../../utils/logger.js";
import type { ChartbitData } from "../stockbit/chartbit.js";
import { getChartbitData } from "../stockbit/chartbit.js";
import { getMarketMovers } from "../stockbit/mover.js";
import { getAllScreenerPresets } from "../stockbit/screener.js";
import { getTrendingStocks } from "../stockbit/trending.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const JAKARTA_TIMEZONE = "Asia/Jakarta";
const OHLCV_LOOKBACK_YEARS = 3;

export interface BatchOhlcvItem {
  symbol: string;
  daily: ChartbitData[];
}

export interface MarketPulseResult {
  as_of: string;
  trending: Awaited<ReturnType<typeof getTrendingStocks>>;
  movers: Awaited<ReturnType<typeof getMarketMovers>>;
  screeners: Awaited<ReturnType<typeof getAllScreenerPresets>>;
  ohlcv: BatchOhlcvItem[];
  errors: Array<{ symbol: string; error: string }>;
}

export async function getBatchOhlcv(
  symbols: string[],
): Promise<{
  ohlcv: BatchOhlcvItem[];
  errors: Array<{ symbol: string; error: string }>;
}> {
  const now = dayjs().tz(JAKARTA_TIMEZONE);
  const from = now.subtract(OHLCV_LOOKBACK_YEARS, "year").toDate();
  const to = now.toDate();

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const daily = await getChartbitData({ symbol, from, to });
      return { symbol, daily };
    }),
  );

  const ohlcv: BatchOhlcvItem[] = [];
  const errors: Array<{ symbol: string; error: string }> = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const symbol = symbols[i];
    if (result.status === "fulfilled") {
      ohlcv.push(result.value);
    } else {
      logger.warn(
        { symbol, error: result.reason },
        "Failed to fetch OHLCV for symbol",
      );
      errors.push({ symbol, error: (result.reason as Error).message });
    }
  }

  return { ohlcv, errors };
}

export async function getMarketPulse(
  symbols: string[],
): Promise<MarketPulseResult> {
  const now = dayjs().tz(JAKARTA_TIMEZONE);
  const asOf = now.format("YYYY-MM-DD");

  const [trending, movers, screeners, batchOhlcv] = await Promise.all([
    getTrendingStocks(),
    getMarketMovers(),
    getAllScreenerPresets(),
    getBatchOhlcv(symbols),
  ]);

  return {
    as_of: asOf,
    trending,
    movers,
    screeners,
    ohlcv: batchOhlcv.ohlcv,
    errors: batchOhlcv.errors,
  };
}
