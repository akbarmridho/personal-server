import dayjs from "dayjs";
import { checkSymbol } from "../../aggregator/companies.js";
import { getChartbitData } from "../../stockbit/chartbit.js";
import { getStockSeasonality } from "../../stockbit/seasonality.js";
import {
  calculateADX,
  calculateATR,
  calculateBBANDS,
  calculateIchimoku,
  calculateMACD,
  calculateOBV,
  calculateRSI,
  calculateSMA,
  calculateVolumeProfile,
  calculateZigZag,
  downsampleToWeekly,
  scanForRecentPatterns,
} from "../../technical.js";

export const getStockTechnicals = async (rawTicker: string) => {
  const ticker = await checkSymbol(rawTicker);

  const [seasonality, chartbit] = await Promise.all([
    getStockSeasonality(ticker),
    getChartbitData({
      ticker,
      from: dayjs().subtract(3, "year").toDate(),
      to: dayjs().toDate(),
    }),
  ]);

  const sortedAsc = chartbit.toSorted((a, b) => a.unixdate - b.unixdate);

  return {
    price: {
      recent_weekly: sortedAsc.slice(-5).reverse(),
      seasonality,
      zigzag: {
        weekly_3y: calculateZigZag(downsampleToWeekly(sortedAsc), 20),
        daily_3m: calculateZigZag(sortedAsc.slice(-60)),
      },
    },
    technical: {
      trend: {
        sma50: calculateSMA(chartbit, 50),
        sma200: calculateSMA(chartbit, 200),
        ichimoku_cloud: calculateIchimoku(chartbit),
      },
      momentum: {
        adx14: calculateADX(chartbit, 14),
        macd_12_26_9: calculateMACD(chartbit, 12, 26, 9),
        rsi14: calculateRSI(chartbit, 14),
      },
      volume: {
        obv: calculateOBV(chartbit),
        volume_profile_3m: calculateVolumeProfile(chartbit, "3m"),
      },
      volatility: {
        atr14: calculateATR(chartbit, 14),
        bollinger_bands_20_2: calculateBBANDS(chartbit),
      },
    },
    candlestick_patterns: scanForRecentPatterns(chartbit),
  };
};
