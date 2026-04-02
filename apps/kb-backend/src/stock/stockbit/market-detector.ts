import { KV } from "../../infrastructure/db/kv.js";
import type { Json } from "../../infrastructure/db/types.js";
import { logger } from "../../utils/logger.js";
import { dateToFormatted } from "../utils.js";
import type { BaseStockbitResponse } from "./auth.js";
import { getStockbitStatusCode, stockbitGetJson } from "./client.js";

const MARKET_DETECTOR_LIMITER_INTERVAL_MS = 1_000;
const MARKET_DETECTOR_CACHE_VERSION = "v1";

export type MarketDetectorTransactionType =
  | "TRANSACTION_TYPE_NET"
  | "TRANSACTION_TYPE_GROSS";

export type MarketDetectorBoard =
  | "MARKET_BOARD_REGULER"
  | "MARKET_BOARD_TUNAI"
  | "MARKET_BOARD_NEGO"
  | "MARKET_BOARD_ALL";

export type MarketDetectorInvestorType =
  | "INVESTOR_TYPE_ALL"
  | "INVESTOR_TYPE_FOREIGN"
  | "INVESTOR_TYPE_DOMESTIC";

interface MarketDetectorBrokerRow {
  blot?: string;
  bval?: string;
  freq?: string;
  netbs_broker_code?: string;
  netbs_buy_avg_price?: string;
  netbs_sell_avg_price?: string;
  netbs_date?: string;
  netbs_stock_code?: string;
  slot?: string;
  sval?: string;
  type?: string;
}

export interface MarketDetectorData {
  bandar_detector: Record<string, unknown>;
  broker_summary: {
    brokers_buy?: MarketDetectorBrokerRow[];
    brokers_sell?: MarketDetectorBrokerRow[];
  };
  from: string;
  to: string;
}

type MarketDetectorInput = {
  symbol: string;
  from: Date;
  to: Date;
  transactionType?: MarketDetectorTransactionType;
  marketBoard?: MarketDetectorBoard;
  investorType?: MarketDetectorInvestorType;
  limit?: number;
};

type MarketDetectorDailySnapshotInput = {
  symbol: string;
  date: Date;
  transactionType?: MarketDetectorTransactionType;
  marketBoard?: MarketDetectorBoard;
  investorType?: MarketDetectorInvestorType;
  limit?: number;
};

const buildMarketDetectorUrl = (input: Required<MarketDetectorInput>) => {
  const fromFormatted = dateToFormatted(input.from);
  const toFormatted = dateToFormatted(input.to);

  return `https://exodus.stockbit.com/marketdetectors/${input.symbol}?from=${fromFormatted}&to=${toFormatted}&transaction_type=${input.transactionType}&market_board=${input.marketBoard}&investor_type=${input.investorType}&limit=${input.limit}`;
};

const resolveMarketDetectorOptions = (
  input: MarketDetectorInput,
): Required<MarketDetectorInput> => ({
  symbol: input.symbol,
  from: input.from,
  to: input.to,
  transactionType: input.transactionType || "TRANSACTION_TYPE_NET",
  marketBoard: input.marketBoard || "MARKET_BOARD_REGULER",
  investorType: input.investorType || "INVESTOR_TYPE_ALL",
  limit: input.limit || 25,
});

const buildDailySnapshotCacheKey = (
  input: Required<MarketDetectorDailySnapshotInput>,
) => {
  const date = dateToFormatted(input.date);
  return [
    "stockbit",
    "marketdetector",
    "snapshot",
    MARKET_DETECTOR_CACHE_VERSION,
    input.symbol,
    date,
    input.transactionType,
    input.marketBoard,
    input.investorType,
    String(input.limit),
  ].join(":");
};

const resolveDailySnapshotOptions = (
  input: MarketDetectorDailySnapshotInput,
): Required<MarketDetectorDailySnapshotInput> => ({
  symbol: input.symbol,
  date: input.date,
  transactionType: input.transactionType || "TRANSACTION_TYPE_GROSS",
  marketBoard: input.marketBoard || "MARKET_BOARD_REGULER",
  investorType: input.investorType || "INVESTOR_TYPE_ALL",
  limit: input.limit || 25,
});

export const getMarketDetector = async (
  input: MarketDetectorInput,
): Promise<MarketDetectorData> => {
  const options = resolveMarketDetectorOptions(input);
  const url = buildMarketDetectorUrl(options);

  let rawData: BaseStockbitResponse<MarketDetectorData>;
  try {
    rawData = await stockbitGetJson<BaseStockbitResponse<MarketDetectorData>>(
      url,
    );
  } catch (error) {
    if (getStockbitStatusCode(error) !== 429) {
      throw error;
    }

    logger.warn(
      { url },
      "Stockbit market detector rate limited, retrying once",
    );
    await new Promise((resolve) =>
      setTimeout(resolve, MARKET_DETECTOR_LIMITER_INTERVAL_MS),
    );
    rawData = await stockbitGetJson<BaseStockbitResponse<MarketDetectorData>>(
      url,
    );
  }

  return rawData.data;
};

export const getMarketDetectorDailySnapshotCached = async (
  input: MarketDetectorDailySnapshotInput,
): Promise<MarketDetectorData> => {
  const options = resolveDailySnapshotOptions(input);
  const cacheKey = buildDailySnapshotCacheKey(options);

  const cached = await KV.getOrSet(
    cacheKey,
    async () => {
      const data = await getMarketDetector({
        symbol: options.symbol,
        from: options.date,
        to: options.date,
        transactionType: options.transactionType,
        marketBoard: options.marketBoard,
        investorType: options.investorType,
        limit: options.limit,
      });

      return data as unknown as Json;
    },
  );

  return cached as unknown as MarketDetectorData;
};
