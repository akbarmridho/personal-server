import dayjs from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import { yf } from "../yf.js";

export const currencyPair = {
  USD: "USDIDR=X",
  CNY: "CNYIDR=X",
  EUR: "EURIDR=X",
  JPY: "JPYIDR=X",
  SGD: "SGDIDR=X",
} as const;

export interface PriceSummaryData {
  symbol?: string;
  name?: string | null;
  currency?: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  dayLow?: number;
  dayHigh?: number;
  previousClose?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
}

export const getForexSummary = async (
  target: keyof typeof currencyPair,
): Promise<PriceSummaryData> => {
  const result = await KV.getOrSet(
    `yf.forex.${target}`,
    async () => {
      const data = await yf.quoteSummary(currencyPair[target]);

      return {
        symbol: data.price?.symbol,
        name: data.price?.shortName,
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

// other free options
// https://fcsapi.com/document/forex-api
// https://currencylayer.com/
// https://exchangerate.host/
