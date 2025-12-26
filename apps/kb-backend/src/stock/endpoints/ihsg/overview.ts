import dayjs from "dayjs";
import { getChartbitData } from "../../stockbit/chartbit.js";
import { getEmittenInfo } from "../../stockbit/emitten-info.js";
import {
  calculateRSI,
  calculateSMA,
  calculateZigZag,
  downsampleToWeekly,
  scanForRecentPatterns,
} from "../../technical.js";
import { removeKeysRecursive } from "../../utils.js";

export const getIHSGOverview = async () => {
  const symbol = "IHSG";

  const [chartbit, emittenInfo] = await Promise.all([
    getChartbitData({
      symbol,
      from: dayjs().subtract(3, "year").toDate(),
      to: dayjs().toDate(),
    }),
    getEmittenInfo({ symbol }),
  ]);

  const sortedAsc = chartbit.toSorted((a, b) => a.unixdate - b.unixdate);

  return {
    market: {
      price: +emittenInfo.price,
      change: +emittenInfo.change,
      percentage: emittenInfo.percentage,
      previous: +emittenInfo.previous,
      average: +emittenInfo.average,
      volume: +emittenInfo.volume,
      bid: {
        price: +emittenInfo.orderbook?.bid?.price || null,
        volume: +emittenInfo.orderbook?.bid?.volume || null,
      },
      offer: {
        price: +emittenInfo.orderbook?.offer?.price || null,
        volume: +emittenInfo.orderbook?.offer?.volume || null,
      },
      market_status: emittenInfo.market_hour?.status,
      time_left: emittenInfo.market_hour?.formatted_time_left,
    },
    price: {
      recent_weekly: removeKeysRecursive(sortedAsc.slice(-5).reverse(), [
        "unixdate",
        "soxclose",
        "dividend",
        "freq_analyzer",
      ]),
      zigzag: {
        weekly_3y: calculateZigZag(downsampleToWeekly(sortedAsc), 20),
        daily_3m: calculateZigZag(sortedAsc.slice(-60)),
      },
    },
    technical: {
      trend: {
        sma50: calculateSMA(chartbit, 50),
        sma200: calculateSMA(chartbit, 200),
      },
      momentum: {
        rsi14: calculateRSI(chartbit, 14),
      },
    },
    candlestick_patterns: scanForRecentPatterns(chartbit),
  };
};
