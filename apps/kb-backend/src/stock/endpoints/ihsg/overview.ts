import dayjs from "dayjs";
import { getChartbitData } from "../../stockbit/chartbit.js";
import { getEmittenInfo } from "../../stockbit/emitten-info.js";
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
