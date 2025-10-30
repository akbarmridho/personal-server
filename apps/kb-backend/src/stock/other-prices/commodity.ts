import dayjs from "dayjs";
import { KV } from "../../db/kv.js";
import { yf } from "../yf.js";
import type { PriceSummaryData } from "./forex.js";

export const commoditySymbols = {
  GOLD: "GC=F",
  SILVER: "SI=F",
  OIL_WTI: "CL=F",
  OIL_BRENT: "BZ=F",
  COPPER: "HG=F",
  COAL: "^COAL",
  NICKEL: "^SPGSIK",
  CPO: "CL=F",
} as const;

export const getCommoditySummary = async (
  target: keyof typeof commoditySymbols,
): Promise<PriceSummaryData> => {
  const result = await KV.getOrSet(
    `yf.commodity.${target}`,
    async () => {
      const data = await yf.quoteSummary(commoditySymbols[target]);

      return {
        symbol: data.price?.symbol,
        name: data.price?.longName || data.price?.shortName,
        currency: data.price?.currency,
        currentPrice: data.price?.regularMarketPrice,
        priceChange: data.price?.regularMarketChange,
        priceChangePercent: data.price?.regularMarketChangePercent,
        dayLow: data.summaryDetail?.regularMarketDayLow,
        dayHigh: data.summaryDetail?.regularMarketDayHigh,
        previousClose: data.summaryDetail?.regularMarketPreviousClose,
        fiftyTwoWeekLow: data.summaryDetail?.fiftyTwoWeekLow,
        fiftyTwoWeekHigh: data.summaryDetail?.fiftyTwoWeekHigh,
        fiftyDayAverage: data.summaryDetail?.fiftyDayAverage,
        twoHundredDayAverage: data.summaryDetail?.twoHundredDayAverage,
      };
    },
    dayjs().add(3, "hour").toDate(),
    true,
  );

  return result as PriceSummaryData;
};
