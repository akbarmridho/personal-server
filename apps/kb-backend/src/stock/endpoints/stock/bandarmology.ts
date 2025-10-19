import dayjs from "dayjs";
import { checkTicker } from "../../aggregator/companies.js";
import { getMarketDetector } from "../../stockbit/market-detector.js";

const getClosestWorkingDay = (date: dayjs.Dayjs): dayjs.Dayjs => {
  const day = date.day();
  if (day === 0) return date.subtract(2, "day"); // Sunday -> Friday
  if (day === 6) return date.subtract(1, "day"); // Saturday -> Friday
  return date;
};

export const getStockBandarmology = async (
  rawTicker: string,
  period: "1d" | "1w" | "1m" | "3m" | "1y",
) => {
  const ticker = await checkTicker(rawTicker);

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
    ticker,
    from: from.toDate(),
    to: to.toDate(),
  });
};
