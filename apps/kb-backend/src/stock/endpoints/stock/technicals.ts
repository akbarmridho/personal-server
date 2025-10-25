import dayjs from "dayjs";
import { checkTicker } from "../../aggregator/companies.js";
import { getChartbitData } from "../../stockbit/chartbit.js";
import { getStockSeasonality } from "../../stockbit/seasonality.js";
import {
  calculateADX,
  calculateIchimoku,
  calculateMACD,
  calculateOBV,
  calculateSMA,
  calculateVolumeProfile,
  calculateZigZag,
  downsampleToWeekly,
  scanForRecentPatterns,
} from "../../technical.js";

export const getStockTechnicals = async (rawTicker: string) => {
  const ticker = await checkTicker(rawTicker);

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
    price_1w: sortedAsc.slice(-5).reverse(),
    seasonality,
    zigzag: {
      period_3y_sample_weekly: calculateZigZag(downsampleToWeekly(sortedAsc)),
      period_3m_sample_daily: calculateZigZag(sortedAsc.slice(-60)),
    },
    technical: {
      sma50: calculateSMA(chartbit, 50),
      sma200: calculateSMA(chartbit, 200),
      adx14: calculateADX(chartbit, 14),
      macd_12_26_9: calculateMACD(chartbit, 12, 26, 9),
      obv: calculateOBV(chartbit),
      volume_profile_3m: calculateVolumeProfile(chartbit, "3m"),
      ichimoku_cloud: calculateIchimoku(chartbit),
      candlestick_patterns: scanForRecentPatterns(chartbit),
    },
  };
};
