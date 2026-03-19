import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { checkSymbol } from "../../aggregator/companies.js";
import {
  getMarketDetector,
  type MarketDetectorBoard,
  type MarketDetectorInvestorType,
  type MarketDetectorTransactionType,
} from "../../stockbit/market-detector.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const getClosestWorkingDay = (date: dayjs.Dayjs): dayjs.Dayjs => {
  const day = date.tz("Asia/Jakarta").day();
  if (day === 0) return date.subtract(2, "day"); // Sunday -> Friday
  if (day === 6) return date.subtract(1, "day"); // Saturday -> Friday
  return date;
};

export const getStockBandarmology = async (
  rawSymbol: string,
  period: "1d" | "1w" | "1m" | "3m" | "1y",
  options: {
    transactionType?: MarketDetectorTransactionType;
    marketBoard?: MarketDetectorBoard;
    investorType?: MarketDetectorInvestorType;
    limit?: number;
  } = {},
) => {
  const symbol = await checkSymbol(rawSymbol);

  const to = getClosestWorkingDay(dayjs());
  let from: dayjs.Dayjs;

  switch (period) {
    case "1d":
      from = to;
      break;
    case "1w":
      from = to.subtract(7, "day");
      break;
    case "1m":
      from = to.subtract(30, "day");
      break;
    case "3m":
      from = to.subtract(90, "day");
      break;
    case "1y":
      from = to.subtract(1, "year");
      break;
  }

  return await getMarketDetector({
    symbol,
    from: from.toDate(),
    to: to.toDate(),
    transactionType: options.transactionType,
    marketBoard: options.marketBoard,
    investorType: options.investorType,
    limit: options.limit,
  });
};
