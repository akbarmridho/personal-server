import {
  bearishengulfingpattern,
  bullishengulfingpattern,
  bullishhammerstick,
  darkcloudcover,
  eveningstar,
  IchimokuCloud,
  morningstar,
  piercingline,
  shootingstar,
  threewhitesoldiers,
  tweezerbottom,
  VolumeProfile,
} from "@thuantan2060/technicalindicators";
import { ADX, EMA, MACD, OBV, SMA, ZigZag } from "trading-signals";
import type { ChartbitData } from "./stockbit/chartbit.js";

export interface ZigZagData {
  date: string;
  price: number;
  type: "peak" | "bottom";
}

export const downsampleToWeekly = (data: ChartbitData[]): ChartbitData[] => {
  const sorted = data.toSorted((a, b) => a.unixdate - b.unixdate);
  const weeklyData: ChartbitData[] = [];
  const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

  for (let i = 0; i < sorted.length; i++) {
    const weekStart = sorted[i];
    const weekEnd = weekStart.unixdate + WEEK_IN_SECONDS;
    const weekCandles = [weekStart];

    while (i + 1 < sorted.length && sorted[i + 1].unixdate < weekEnd) {
      weekCandles.push(sorted[++i]);
    }

    weeklyData.push({
      ...weekStart,
      open: weekCandles[0].open,
      high: Math.max(...weekCandles.map((c) => c.high)),
      low: Math.min(...weekCandles.map((c) => c.low)),
      close: weekCandles[weekCandles.length - 1].close,
      volume: weekCandles.reduce((sum, c) => sum + c.volume, 0),
      value: weekCandles.reduce((sum, c) => sum + c.value, 0),
      foreignbuy: weekCandles.reduce((sum, c) => sum + c.foreignbuy, 0),
      foreignsell: weekCandles.reduce((sum, c) => sum + c.foreignsell, 0),
      foreignflow: weekCandles.reduce((sum, c) => sum + c.foreignflow, 0),
      frequency: weekCandles.reduce((sum, c) => sum + c.frequency, 0),
    });
  }

  return weeklyData;
};

export const calculateZigZag = (data: ChartbitData[], deviation = 15) => {
  const zigzag = new ZigZag({ deviation });
  const result: ZigZagData[] = [];

  for (const each of data) {
    const pivotPrice = zigzag.add({
      high: each.high,
      low: each.low,
    });

    if (pivotPrice !== null) {
      result.push({
        date: each.date,
        price: pivotPrice,
        type: pivotPrice === each.high ? "peak" : "bottom",
      });
    }
  }

  return result;
};

export const calculateSMA = (data: ChartbitData[], interval: 50 | 200) => {
  if (data.length < interval) {
    throw new Error(
      `Raw data length lesser than the interval numbers. Data length ${data.length} while interval ${interval}.`,
    );
  }

  const sorted = data
    .toSorted((a, b) => a.unixdate - b.unixdate)
    .slice(-interval);

  const sma = new SMA(interval);

  for (const each of sorted) {
    sma.add(each.close);
  }

  return sma.getResultOrThrow();
};

export interface ADXResult {
  date: string;

  /**
   * The Average Directional Index (ADX) value.
   * Measures the *strength* of the trend (0-100).
   */
  adx: number;

  /**
   * The Positive Directional Indicator (+DI).
   * Measures upward price pressure.
   */
  pdi: number;

  /**
   * The Negative Directional Indicator (-DI).
   * Measures downward price pressure.
   */
  mdi: number;
}

export function calculateADX(
  chartData: ChartbitData[],
  interval: number = 14,
): ADXResult[] {
  const adx = new ADX(interval);
  const minDataLength = adx.getRequiredInputs();

  if (chartData.length < minDataLength) {
    throw new Error(
      `Raw data length lesser than the minimum data length numbers. Data length ${chartData.length} while minimum length is ${minDataLength}.`,
    );
  }

  const results: ADXResult[] = [];

  const sortedData = chartData.toSorted((a, b) => a.unixdate - b.unixdate);

  for (const candle of sortedData) {
    adx.update(candle, false);

    if (adx.isStable) {
      const adxValue = adx.getResultOrThrow();
      const pdiValue = adx.pdi;
      const mdiValue = adx.mdi;

      if (pdiValue !== undefined && mdiValue !== undefined) {
        results.push({
          date: candle.date,
          adx: adxValue,
          pdi: pdiValue,
          mdi: mdiValue,
        });
      }
    }
  }

  return results.slice(-10);
}

export interface MACDResult {
  date: string;

  /**
   * The MACD line (Short EMA - Long EMA).
   */
  macd: number;

  /**
   * The Signal line (an EMA of the MACD line).
   */
  signal: number;

  /**
   * The Histogram (MACD Line - Signal Line).
   * This shows the convergence/divergence.
   */
  histogram: number;
}

/**
 * Calculates the MACD (Moving Average Convergence Divergence) series
 * from ChartbitData.
 *
 * @param chartData - An array of ChartbitData objects (can be in any order).
 * @param shortPeriod - The lookback period for the short EMA (default is 12).
 * @param longPeriod - The lookback period for the long EMA (default is 26).
 * @param signalPeriod - The lookback period for the signal EMA (default is 9).
 */
export function calculateMACD(
  chartData: ChartbitData[],
  shortPeriod: number = 12,
  longPeriod: number = 26,
  signalPeriod: number = 9,
): MACDResult[] {
  const macd = new MACD(
    new EMA(shortPeriod),
    new EMA(longPeriod),
    new EMA(signalPeriod),
  );

  const minDataLength = macd.getRequiredInputs();

  if (chartData.length < minDataLength) {
    throw new Error(
      `MACD(${shortPeriod}, ${longPeriod}, ${signalPeriod}) needs at least ${minDataLength} data points, but only ${chartData.length} were provided.`,
    );
  }

  const results: MACDResult[] = [];

  const sortedData = chartData.toSorted((a, b) => a.unixdate - b.unixdate);

  for (const candle of sortedData) {
    const macdResult = macd.add(candle.close);

    if (macdResult !== null) {
      results.push({
        date: candle.date,
        macd: macdResult.macd,
        signal: macdResult.signal,
        histogram: macdResult.histogram,
      });
    }
  }

  return results.slice(-20);
}

export interface OBVResult {
  date: string;

  /**
   * The On-Balance Volume value.
   * This is a cumulative running total. Its absolute number
   * isn't important, but its *direction* (slope) is.
   */
  obv: number;
}

export function calculateOBV(chartData: ChartbitData[]): OBVResult[] {
  const obv = new OBV();
  const minDataLength = obv.getRequiredInputs();

  if (chartData.length < minDataLength) {
    throw new Error(
      `OBV needs at least ${minDataLength} data points, but only ${chartData.length} were provided.`,
    );
  }

  const sortedData = chartData.toSorted((a, b) => a.unixdate - b.unixdate);
  const allResults: OBVResult[] = [];

  for (const candle of sortedData) {
    obv.add(candle);

    if (obv.isStable) {
      allResults.push({
        date: candle.date,
        obv: obv.getResultOrThrow(),
      });
    }
  }

  return allResults.slice(-20);
}

export interface VolumeProfileResult {
  rangeStart: number;
  rangeEnd: number;
  bullishVolume: number;
  bearishVolume: number;
  totalVolume: number;
}

export type VolumeProfilePeriod = "1m" | "3m" | "1y" | "3y" | "all";

export function calculateVolumeProfile(
  fullChartData: ChartbitData[],
  period: VolumeProfilePeriod,
): VolumeProfileResult[] {
  if (fullChartData.length < 2) {
    throw new Error(
      `Volume Profile needs at least 2 data points, but only ${fullChartData.length} were provided.`,
    );
  }

  const DAY_IN_SECONDS = 24 * 60 * 60;

  const sortedData = fullChartData.toSorted((a, b) => a.unixdate - b.unixdate);

  const lastDate = sortedData[sortedData.length - 1].unixdate;
  let filteredData: ChartbitData[];

  switch (period) {
    case "1m": {
      const oneMonthAgo = lastDate - 30 * DAY_IN_SECONDS;
      filteredData = sortedData.filter((c) => c.unixdate >= oneMonthAgo);
      break;
    }
    case "3m": {
      const threeMonthsAgo = lastDate - 91 * DAY_IN_SECONDS;
      filteredData = sortedData.filter((c) => c.unixdate >= threeMonthsAgo);
      break;
    }
    case "1y": {
      const oneYearAgo = lastDate - 365 * DAY_IN_SECONDS;
      filteredData = sortedData.filter((c) => c.unixdate >= oneYearAgo);
      break;
    }
    case "3y": {
      const threeYearsAgo = lastDate - 1095 * DAY_IN_SECONDS;
      filteredData = sortedData.filter((c) => c.unixdate >= threeYearsAgo);
      break;
    }
    case "all":
    default:
      filteredData = sortedData;
  }

  if (filteredData.length < 2) {
    return [];
  }

  const firstDate = filteredData[0].unixdate;
  const periodEndDate = filteredData[filteredData.length - 1].unixdate;
  const timespanDays = (periodEndDate - firstDate) / DAY_IN_SECONDS;

  let noOfBars: number;

  if (timespanDays <= 31) {
    noOfBars = 15;
  } else if (timespanDays <= 100) {
    noOfBars = 20;
  } else if (timespanDays <= 400) {
    noOfBars = 25;
  } else if (timespanDays <= 1100) {
    noOfBars = 50;
  } else {
    noOfBars = 75;
  }

  const libraryInput = {
    high: [] as number[],
    open: [] as number[],
    low: [] as number[],
    close: [] as number[],
    volume: [] as number[],
    noOfBars: noOfBars,
  };

  for (const candle of filteredData) {
    libraryInput.high.push(candle.high);
    libraryInput.open.push(candle.open);
    libraryInput.low.push(candle.low);
    libraryInput.close.push(candle.close);
    libraryInput.volume.push(candle.volume);
  }

  // We must cast the result to the *correct* type, as the
  // source code has a type mismatch (number[] vs object[]).
  const profile = VolumeProfile.calculate(
    libraryInput,
  ) as unknown as VolumeProfileResult[];

  return profile;
}

export interface IchimokuResult {
  /**
   * The date for this calculation (YYYY-MM-DD).
   * The 'conversion' and 'base' lines apply to this date.
   * The 'spanA' and 'spanB' values are for a future date.
   */
  date: string;

  /**
   * Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
   * Represents short-term momentum.
   */
  conversion: number;

  /**
   * Kijun-sen (Base Line): (26-period high + 26-period low) / 2
   * Represents mid-term momentum and S/R.
   */
  base: number;

  /**
   * Senkou Span A (Leading Span A): (Conversion + Base) / 2
   * This value is plotted 'displacement' periods (26) in the future.
   * Forms the "faster" edge of the Kumo (Cloud).
   */
  spanA: number;

  /**
   * Senkou Span B (Leading Span B): (52-period high + 52-period low) / 2
   * This value is also plotted 'displacement' periods (26) in the future.
   * Forms the "slower" edge of the Kumo (Cloud).
   */
  spanB: number;
}

export function calculateIchimoku(
  fullChartData: ChartbitData[],
  n: number = 20,
): IchimokuResult[] {
  const conversionPeriod = 9;
  const basePeriod = 26;
  const spanPeriod = 52;
  const displacement = 26;

  const minDataLength = spanPeriod;
  if (fullChartData.length < minDataLength) {
    throw new Error(
      `IchimokuCloud needs at least ${minDataLength} data points, but only ${fullChartData.length} were provided.`,
    );
  }

  const sortedData = fullChartData.toSorted((a, b) => a.unixdate - b.unixdate);

  const ichimoku = new IchimokuCloud({
    high: [],
    low: [],
    conversionPeriod,
    basePeriod,
    spanPeriod,
    displacement,
  });

  const allResults: IchimokuResult[] = [];

  for (const candle of sortedData) {
    const result = ichimoku.nextValue({
      high: candle.high,
      low: candle.low,
    });

    if (result) {
      allResults.push({
        date: candle.date,
        conversion: result.conversion,
        base: result.base,
        spanA: result.spanA,
        spanB: result.spanB,
      });
    }
  }

  return allResults.slice(-n);
}

export class StockData {
  reversedInput?: boolean;
  constructor(
    public open: number[],
    public high: number[],
    public low: number[],
    public close: number[],
    reversedInput: boolean,
  ) {
    this.reversedInput = reversedInput;
  }
}

interface PatternInfo {
  name: string;
  instance: (data: StockData) => any;
}

const ALL_PATTERNS_TO_SCAN: PatternInfo[] = [
  {
    name: "Bullish Engulfing",
    instance: bullishengulfingpattern,
  },
  { name: "Bullish Hammer", instance: bullishhammerstick },
  { name: "Morning Star", instance: morningstar },
  { name: "Piercing Line", instance: piercingline },
  { name: "Tweezer Bottom", instance: tweezerbottom },
  { name: "Three White Soldiers", instance: threewhitesoldiers },
  {
    name: "Bearish Engulfing",
    instance: bearishengulfingpattern,
  },
  { name: "Shooting Star", instance: shootingstar },
  { name: "Evening Star", instance: eveningstar },
  { name: "Dark Cloud Cover", instance: darkcloudcover },
];

export interface CandlestickEvent {
  date: string;
  event: string;
}

export function scanForRecentPatterns(
  fullChartData: ChartbitData[],
  n: number = 10,
): CandlestickEvent[] {
  if (fullChartData.length < 5) {
    return [];
  }

  const sortedData = fullChartData.toSorted((a, b) => a.unixdate - b.unixdate);

  const fullOpen = sortedData.map((c) => c.open);
  const fullHigh = sortedData.map((c) => c.high);
  const fullLow = sortedData.map((c) => c.low);
  const fullClose = sortedData.map((c) => c.close);

  const scanWindow = 20;
  const startIndex = sortedData.length - scanWindow;

  const patternsFoundInScan: CandlestickEvent[] = [];

  for (let i = startIndex; i < sortedData.length; i++) {
    const currentCandle = sortedData[i];

    const stockDataInput = new StockData(
      fullOpen.slice(0, i + 1),
      fullHigh.slice(0, i + 1),
      fullLow.slice(0, i + 1),
      fullClose.slice(0, i + 1),
      false,
    );

    for (const pattern of ALL_PATTERNS_TO_SCAN) {
      if (pattern.instance(stockDataInput)) {
        patternsFoundInScan.push({
          date: currentCandle.date,
          event: pattern.name,
        });
      }
    }
  }

  const lastNTradingDayDates = sortedData.slice(-n).map((c) => c.date);

  const recentEvents = patternsFoundInScan.filter((event) =>
    lastNTradingDayDates.includes(event.date),
  );

  return recentEvents;
}
