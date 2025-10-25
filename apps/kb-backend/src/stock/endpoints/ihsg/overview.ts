import dayjs from "dayjs";
import { getChartbitData } from "../../stockbit/chartbit.js";
import { getEmittenInfo } from "../../stockbit/emitten-info.js";
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

export const getIHSGOverview = async () => {
  const ticker = "IHSG";

  const [seasonality, chartbit, emittenInfo] = await Promise.all([
    getStockSeasonality(ticker),
    getChartbitData({
      ticker,
      from: dayjs().subtract(3, "year").toDate(),
      to: dayjs().toDate(),
    }),
    getEmittenInfo({ ticker }),
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
    price_1w: sortedAsc.slice(-5).reverse(),
    seasonality,
    zigzag: {
      period_3y_sample_weekly: calculateZigZag(
        downsampleToWeekly(sortedAsc),
        20,
      ),
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
