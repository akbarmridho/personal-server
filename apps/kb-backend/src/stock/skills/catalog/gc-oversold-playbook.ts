import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { SMA } from "trading-signals";

dayjs.extend(utc);
dayjs.extend(timezone);

import { checkSymbol } from "../../aggregator/companies.js";
import type { ChartbitData } from "../../stockbit/chartbit.js";
import { getChartbitData } from "../../stockbit/chartbit.js";

import type { Skill } from "../types.js";

export const gcOversoldPlaybook: Skill = {
  name: "golden-cross-oversold-paybook",
  description:
    "Rules-based swing/investing plan: enter on the Golden Cross day when Stochastic is oversold, hold while Parabolic SAR stays bullish, scale out for profit-taking, and enforce a strict -5% max cut loss.",
  content: `
- For this approach, the key is entering **on the same day as the GC signal**, not nailing a perfect tick. If the stock moves up after the signal, you'll profit even with a slightly different entry; if it drops, a "better average" won't save you.
- **Entry rule:** buy when **GC (Golden Cross)** happens **and** Stochastic is in the **oversold** zone.  
  - **GC / Golden Cross:** a bullish signal where a **shorter-term moving average crosses above a longer-term moving average** (commonly $MA_{50}$ crossing above $MA_{200}$).
- **Hold rule:** keep holding **as long as SAR is green**.  
  - **SAR / Parabolic SAR (Stop And Reverse):** a trend-following indicator that plots dots; it signals trend direction and possible reversals. "**Green SAR**" implies bullish/continuation; "**Red SAR**" implies bearish/reversal risk.
- **Take-profit rule:** you can take profit at any target, but **don't sell everything at once** (scale out).
- **When SAR turns red:**  
  - If profit is **below $15%$** → take profit partially or fully.  
  - If profit is **above $15%$** → you may hold or take partial profit.
- **Risk management:** **hard stop-loss max $-5%$**. Avoid stubborn averaging down without clear confirmation.

### Automated Analysis Tool
Use the **get-gc-stoch-psar-signal** tool to instantly analyze a stock for this setup. It provides a predictive phase:
- **FORMING**: MA convergence detected (GC potentially forming). Action: Watchlist.
- **READY**: GC imminent and Stochastic heading to oversold. Action: Prepare entry.
- **TRIGGERED**: Signal active (GC confirmed + Oversold). Action: **Execute Entry**.
- **ACTIVE**: In position (Uptrend intact). Action: Hold & Monitor PSAR.
- **EXIT_WARNING**: PSAR bearish or flip imminent. Action: Take Profit / Exit.

The tool also calculates stop-loss levels and provides actionable insights based on the current state.

## DATA LIMITATIONS (Caveat)
* **Scope:** This signal is calculated using **PRICE ACTION ONLY** (Moving Averages, Stochastic, PSAR).
* **Blind Spot:** It does **NOT** analyze Volume, Frequency, or Foreign Flow.
* **Verification Required:** Before executing, check the \`Momentum / Smart Money\` agent to confirm this price move is backed by:
    1. **Volume Support** (Is volume rising with price?)
    2. **Foreign Flow** (Are big players participating?)
`,
};

export interface GCStochPSARSignal {
  symbol: string;
  asOf: string;

  // Current price context
  price: {
    close: number;
    changeFromSMA50Pct: number; // How far from MA50
  };

  // === PREDICTIVE: Golden Cross ===
  goldenCross: {
    // Current state
    sma50: number;
    sma200: number;
    gapPct: number; // (SMA50 - SMA200) / price * 100
    trendState:
      | "below_bearish"
      | "converging"
      | "cross_imminent"
      | "above_bullish"
      | "diverging_strong";

    // Predictive
    convergenceRate: number; // How fast gap is closing (per day)
    projectedDaysToGC: number | null; // Estimated days until cross

    // Historical
    lastGCDate: string | null;
    daysSinceGC: number | null;
  };

  // === PREDICTIVE: Stochastic ===
  stochastic: {
    k: number;
    d: number;
    zone: "oversold" | "neutral" | "overbought";

    // Predictive
    kSlope: number; // Positive = rising, negative = falling
    trajectory:
      | "falling_to_oversold"
      | "oversold_curling_up"
      | "rising_to_overbought"
      | "stable";
    projectedDaysToOversold: number | null;

    // Signal
    crossover: "bullish" | "bearish" | "none";
  };

  // === PREDICTIVE: PSAR ===
  psar: {
    value: number;
    trend: "bullish" | "bearish";

    // Predictive
    gapPct: number; // Distance from price as %
    gapTrend: "widening" | "stable" | "tightening" | "flip_imminent";

    // Historical
    lastFlipDate: string;
    daysSinceFlip: number;
  };

  // === COMBINED PHASE ===
  phase: {
    current:
      | "forming"
      | "imminent"
      | "fresh_breakout"
      | "uptrend_pullback"
      | "uptrend_holding"
      | "trend_exhaustion"
      | "bearish_avoid";
    confidence: "high" | "medium" | "low";
    description: string;
    actionableInsight: string;
  };

  // === FOR ACTIVE POSITIONS ===
  holdStatus: {
    psarTrend: "bullish" | "bearish";
    gapHealth: "strong" | "weakening" | "critical";
    action: "hold" | "tighten_stop" | "partial_tp" | "exit";
    reason: string;
  };

  // === RISK ===
  risk: {
    suggestedEntry: number; // Near SMA50 or current if triggered
    cutLossPrice: number; // -5% from entry
    invalidationLevel: number; // Technical invalidation (e.g., below SMA200)
  };

  // === RECENT HISTORY (for LLM context) ===
  history: {
    convergenceTrend: Array<{ date: string; gapPct: number }>; // Last 10
    stochasticTrend: Array<{ date: string; k: number; d: number }>; // Last 10
    psarTrend: Array<{ date: string; trend: string; gapPct: number }>; // Last 10
  };
}

// === TECHNICAL INDICATOR CALCULATIONS ===

export interface StochasticResult {
  date: string;
  k: number;
  d: number;
}

export interface PSARResult {
  date: string;
  value: number;
  trend: "bullish" | "bearish";
}

export interface SMAResult {
  date: string;
  value: number;
}

// Calculate Stochastic Oscillator
export function calculateStochastic(
  chartData: ChartbitData[],
  kPeriod: number = 14,
  dPeriod: number = 3,
): StochasticResult[] {
  if (chartData.length < kPeriod + dPeriod) {
    throw new Error(
      `Stochastic needs at least ${kPeriod + dPeriod} data points, but only ${chartData.length} were provided.`,
    );
  }

  const sortedData = chartData.slice().sort((a, b) => a.unixdate - b.unixdate);
  const results: StochasticResult[] = [];
  const kValues: number[] = [];

  for (let i = kPeriod - 1; i < sortedData.length; i++) {
    const window = sortedData.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...window.map((c) => c.high));
    const lowestLow = Math.min(...window.map((c) => c.low));
    const currentClose = sortedData[i].close;

    // Calculate %K
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);

    // Calculate %D (simple moving average of %K)
    if (kValues.length >= dPeriod) {
      const recentKValues = kValues.slice(-dPeriod);
      const d = recentKValues.reduce((sum, val) => sum + val, 0) / dPeriod;

      results.push({
        date: sortedData[i].date,
        k: k,
        d: d,
      });
    }
  }

  return results;
}

// Calculate Parabolic SAR
export function calculatePSAR(
  chartData: ChartbitData[],
  accelerationFactor: number = 0.02,
  maxAccelerationFactor: number = 0.2,
): PSARResult[] {
  if (chartData.length < 5) {
    throw new Error(
      `PSAR needs at least 5 data points, but only ${chartData.length} were provided.`,
    );
  }

  const sortedData = chartData.slice().sort((a, b) => a.unixdate - b.unixdate);
  const results: PSARResult[] = [];

  let psar: number;
  let extremePoint: number;
  let af: number;
  let trend: "bullish" | "bearish";

  // Initialize
  const firstHigh = sortedData[0].high;
  const firstLow = sortedData[0].low;
  trend = "bullish"; // Start with uptrend
  psar = firstLow;
  extremePoint = firstHigh;
  af = accelerationFactor;

  for (let i = 1; i < sortedData.length; i++) {
    const current = sortedData[i];
    const prevHigh = sortedData[i - 1].high;
    const prevLow = sortedData[i - 1].low;

    if (trend === "bullish") {
      // Check for trend reversal
      if (current.low <= psar) {
        trend = "bearish";
        psar = Math.max(extremePoint, current.high);
        extremePoint = current.low;
        af = accelerationFactor;
      } else {
        // Continue uptrend
        psar = psar + af * (extremePoint - psar);

        // Update extreme point
        if (current.high > extremePoint) {
          extremePoint = current.high;
          af = Math.min(af + accelerationFactor, maxAccelerationFactor);
        }

        // Ensure PSAR is below the low of the last two periods
        psar = Math.min(psar, Math.min(prevLow, current.low));
      }
    } else {
      // Bearish trend
      if (current.high >= psar) {
        trend = "bullish";
        psar = Math.min(extremePoint, current.low);
        extremePoint = current.high;
        af = accelerationFactor;
      } else {
        // Continue downtrend
        psar = psar + af * (extremePoint - psar);

        // Update extreme point
        if (current.low < extremePoint) {
          extremePoint = current.low;
          af = Math.min(af + accelerationFactor, maxAccelerationFactor);
        }

        // Ensure PSAR is above the high of the last two periods
        psar = Math.max(psar, Math.max(prevHigh, current.high));
      }
    }

    results.push({
      date: current.date,
      value: psar,
      trend: trend,
    });
  }

  return results;
}

// Calculate SMA series (not just the last value)
export function calculateSMASeries(
  chartData: ChartbitData[],
  interval: 50 | 200,
): SMAResult[] {
  if (chartData.length < interval) {
    throw new Error(
      `SMA series needs at least ${interval} data points, but only ${chartData.length} were provided.`,
    );
  }

  const sortedData = chartData.slice().sort((a, b) => a.unixdate - b.unixdate);
  const results: SMAResult[] = [];
  const sma = new SMA(interval);

  for (const each of sortedData) {
    sma.add(each.close);

    if (sma.isStable) {
      results.push({
        date: each.date,
        value: sma.getResultOrThrow(),
      });
    }
  }

  return results;
}

// === PREDICTIVE CALCULATIONS ===

export interface ConvergenceResult {
  gapPct: number;
  trendState:
    | "below_bearish"
    | "converging"
    | "cross_imminent"
    | "above_bullish"
    | "diverging_strong";
  convergenceRate: number;
  projectedDaysToGC: number | null;
}

export function calculateConvergence(
  sma50Series: SMAResult[],
  sma200Series: SMAResult[],
  priceData: ChartbitData[],
): ConvergenceResult {
  if (sma50Series.length === 0 || sma200Series.length === 0) {
    throw new Error("SMA series cannot be empty");
  }

  // Create maps for date-aligned lookup
  const sma200Map = new Map(sma200Series.map((s) => [s.date, s.value]));
  const priceMap = new Map(priceData.map((p) => [p.date, p.close]));

  // Align data by date
  const alignedData = sma50Series
    .map((s50) => {
      const val200 = sma200Map.get(s50.date);
      const price = priceMap.get(s50.date);
      if (val200 === undefined || price === undefined) return null;
      return {
        date: s50.date,
        val50: s50.value,
        val200,
        price,
        gap: s50.value - val200,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  if (alignedData.length === 0) {
    return {
      gapPct: 0,
      trendState: "below_bearish",
      convergenceRate: 0,
      projectedDaysToGC: null,
    };
  }

  const latest = alignedData[alignedData.length - 1];
  const gapPct = (latest.gap / latest.price) * 100;

  // Determine trend state
  let trendState: ConvergenceResult["trendState"];
  if (latest.val50 > latest.val200) {
    trendState = gapPct > 5 ? "diverging_strong" : "above_bullish";
  } else {
    if (gapPct > -2) {
      trendState = "cross_imminent";
    } else if (alignedData.length >= 5) {
      const prev = alignedData[alignedData.length - 5];
      trendState = latest.gap > prev.gap ? "converging" : "below_bearish";
    } else {
      trendState = "below_bearish";
    }
  }

  // Calculate convergence rate
  let convergenceRate = 0;
  if (alignedData.length >= 6) {
    const prev = alignedData[alignedData.length - 6];
    convergenceRate = (latest.gap - prev.gap) / 5;
  }

  // Project days to GC
  let projectedDaysToGC: number | null = null;
  if (convergenceRate > 0 && latest.val50 < latest.val200) {
    projectedDaysToGC = Math.abs(latest.gap / convergenceRate);
  }

  return {
    gapPct,
    trendState,
    convergenceRate,
    projectedDaysToGC,
  };
}

export interface StochasticTrajectoryResult {
  kSlope: number;
  trajectory:
    | "falling_to_oversold"
    | "oversold_curling_up"
    | "rising_to_overbought"
    | "stable";
  projectedDaysToOversold: number | null;
  crossover: "bullish" | "bearish" | "none";
}

export function calculateStochasticTrajectory(
  stochasticSeries: StochasticResult[],
): StochasticTrajectoryResult {
  if (stochasticSeries.length < 3) {
    throw new Error(
      "Need at least 3 Stochastic data points for trajectory calculation",
    );
  }

  const latest = stochasticSeries[stochasticSeries.length - 1];
  const previous = stochasticSeries[stochasticSeries.length - 2];
  const beforePrevious = stochasticSeries[stochasticSeries.length - 3];

  // Calculate %K slope (change over last 2 periods)
  const kSlope = (latest.k - beforePrevious.k) / 2;

  // Determine trajectory
  let trajectory: StochasticTrajectoryResult["trajectory"];
  if (kSlope < -0.5) {
    if (latest.k > 20) {
      trajectory = "falling_to_oversold";
    } else {
      trajectory = "oversold_curling_up";
    }
  } else if (kSlope > 0.5) {
    if (latest.k < 80) {
      trajectory = "rising_to_overbought";
    } else {
      trajectory = "stable";
    }
  } else {
    trajectory = "stable";
  }

  // Project days to oversold
  let projectedDaysToOversold: number | null = null;
  if (trajectory === "falling_to_oversold" && kSlope < 0) {
    const daysToOversold = (latest.k - 20) / Math.abs(kSlope);
    if (daysToOversold > 0) {
      projectedDaysToOversold = daysToOversold;
    }
  }

  // Determine crossover
  let crossover: StochasticTrajectoryResult["crossover"] = "none";
  if (previous.k <= previous.d && latest.k > latest.d) {
    crossover = "bullish";
  } else if (previous.k >= previous.d && latest.k < latest.d) {
    crossover = "bearish";
  }

  return {
    kSlope,
    trajectory,
    projectedDaysToOversold,
    crossover,
  };
}

export interface PSARGapResult {
  gapPct: number;
  gapTrend: "widening" | "stable" | "tightening" | "flip_imminent";
}

export function calculatePSARGap(
  psarSeries: PSARResult[],
  priceData: ChartbitData[],
): PSARGapResult {
  if (psarSeries.length === 0) {
    throw new Error("PSAR series cannot be empty");
  }

  const latestPSAR = psarSeries[psarSeries.length - 1];
  const latestPrice = priceData[priceData.length - 1].close;

  // Calculate gap as absolute percentage
  const rawGap = latestPrice - latestPSAR.value;
  const gapPct = (Math.abs(rawGap) / latestPrice) * 100;

  // Determine gap trend
  let gapTrend: PSARGapResult["gapTrend"];
  if (psarSeries.length >= 3 && priceData.length >= 3) {
    const priceMap = new Map(priceData.map((p) => [p.date, p.close]));
    const beforePreviousPrice = priceMap.get(
      psarSeries[psarSeries.length - 3].date,
    );

    if (beforePreviousPrice !== undefined) {
      const beforePreviousGap =
        Math.abs(
          (beforePreviousPrice - psarSeries[psarSeries.length - 3].value) /
            beforePreviousPrice,
        ) * 100;
      const gapChangeRate = (gapPct - beforePreviousGap) / 2;

      if (gapPct < 1) {
        gapTrend = "flip_imminent";
      } else if (gapChangeRate < -0.2) {
        gapTrend = "tightening";
      } else if (gapChangeRate > 0.2) {
        gapTrend = "widening";
      } else {
        gapTrend = "stable";
      }
    } else {
      gapTrend = "stable";
    }
  } else {
    gapTrend = "stable";
  }

  return {
    gapPct,
    gapTrend,
  };
}

// === PHASE DETECTION ===

export interface PhaseResult {
  current:
    | "forming"
    | "imminent"
    | "fresh_breakout"
    | "uptrend_pullback"
    | "uptrend_holding"
    | "trend_exhaustion"
    | "bearish_avoid";
  confidence: "high" | "medium" | "low";
  description: string;
  actionableInsight: string;
}

function findLastGoldenCross(
  sma50Series: SMAResult[],
  sma200Series: SMAResult[],
): { date: string; daysAgo: number } | null {
  const sma200Map = new Map(sma200Series.map((s) => [s.date, s.value]));
  const reversed50 = [...sma50Series].reverse();

  for (let i = 0; i < reversed50.length - 1; i++) {
    const current50 = reversed50[i];
    const prev50 = reversed50[i + 1];

    const current200 = sma200Map.get(current50.date);
    const prev200 = sma200Map.get(prev50.date);

    if (current200 !== undefined && prev200 !== undefined) {
      const wasBearish = prev50.value < prev200;
      const isBullish = current50.value > current200;

      if (wasBearish && isBullish) {
        return { date: current50.date, daysAgo: i };
      }
    }
  }
  return null;
}

export function determinePhase(
  convergence: ConvergenceResult,
  _stochasticTrajectory: StochasticTrajectoryResult,
  psarResult: PSARResult,
  psarGap: PSARGapResult,
  stochasticLatest: StochasticResult,
  daysSinceGC: number | null,
): PhaseResult {
  // BEARISH / AVOID
  if (
    convergence.trendState === "below_bearish" ||
    convergence.trendState === "diverging_strong"
  ) {
    return {
      current: "bearish_avoid",
      confidence: "low",
      description: "Trend is bearish (SMA50 < SMA200).",
      actionableInsight: "Do not touch. Wait for convergence to start.",
    };
  }

  // FORMING
  if (convergence.trendState === "converging") {
    const days = convergence.projectedDaysToGC;
    return {
      current: "forming",
      confidence: "low",
      description: "SMA50 is catching up to SMA200.",
      actionableInsight:
        days && days < 20
          ? `Add to Watchlist. GC projected in ~${days.toFixed(0)} days.`
          : "Monitor weekly.",
    };
  }

  // IMMINENT
  if (convergence.trendState === "cross_imminent") {
    return {
      current: "imminent",
      confidence: "medium",
      description: "Golden Cross is imminent (Gap < 2%).",
      actionableInsight:
        "Prepare entry plan. Watch for volume spikes to confirm the cross.",
    };
  }

  // FRESH BREAKOUT
  if (
    convergence.trendState.includes("bullish") &&
    daysSinceGC !== null &&
    daysSinceGC <= 15
  ) {
    if (stochasticLatest.k < 80) {
      return {
        current: "fresh_breakout",
        confidence: "high",
        description: `FRESH Golden Cross confirmed ${daysSinceGC} days ago.`,
        actionableInsight:
          "STRONG BUY. The trend change is fresh. Enter immediately.",
      };
    } else {
      return {
        current: "fresh_breakout",
        confidence: "medium",
        description: `Fresh GC (${daysSinceGC} days ago), but price is momentarily overextended.`,
        actionableInsight:
          "Wait for intraday pullback or enter with smaller size.",
      };
    }
  }

  // UPTREND PULLBACK
  if (convergence.trendState.includes("bullish") && stochasticLatest.k < 30) {
    return {
      current: "uptrend_pullback",
      confidence: "high",
      description: "Major trend is Bullish, short-term is Oversold.",
      actionableInsight:
        "BUY THE DIP. Low-risk entry opportunity in an existing uptrend.",
    };
  }

  // TREND EXHAUSTION
  if (psarResult.trend === "bearish" || psarGap.gapTrend === "flip_imminent") {
    return {
      current: "trend_exhaustion",
      confidence: "high",
      description: "Momentum is fading. PSAR has flipped or is about to.",
      actionableInsight:
        "TAKE PROFIT / TIGHTEN STOPS. Do not open new positions.",
    };
  }

  // UPTREND HOLDING
  return {
    current: "uptrend_holding",
    confidence: "medium",
    description: "Strong uptrend active. No fresh entry signal.",
    actionableInsight:
      "HOLD. Let profits run. Add only if price dips near SMA50.",
  };
}

// === MAIN FUNCTION ===

export async function getGCStochPSARSignal(
  symbol: string,
  asOf: Date = dayjs().tz("Asia/Jakarta").toDate(),
): Promise<GCStochPSARSignal> {
  // Get chart data
  const chartData = await getChartbitData({
    symbol: await checkSymbol(symbol),
    from: dayjs(asOf).tz("Asia/Jakarta").subtract(1, "year").toDate(),
    to: asOf,
  });

  const sortedData = chartData.slice().sort((a, b) => a.unixdate - b.unixdate);
  const latestPrice = sortedData[sortedData.length - 1].close;
  const latestDate = sortedData[sortedData.length - 1].date;

  // Calculate technical indicators
  const sma50Series = calculateSMASeries(sortedData, 50);
  const sma200Series = calculateSMASeries(sortedData, 200);
  const stochasticSeries = calculateStochastic(sortedData);
  const psarSeries = calculatePSAR(sortedData);

  // Get latest values
  const latestSMA50 = sma50Series[sma50Series.length - 1].value;
  const latestSMA200 = sma200Series[sma200Series.length - 1].value;
  const latestStochastic = stochasticSeries[stochasticSeries.length - 1];
  const latestPSAR = psarSeries[psarSeries.length - 1];

  // Calculate predictive components
  const convergence = calculateConvergence(
    sma50Series,
    sma200Series,
    sortedData,
  );
  const stochasticTrajectory = calculateStochasticTrajectory(stochasticSeries);
  const psarGap = calculatePSARGap(psarSeries, sortedData);

  // Find last Golden Cross
  const lastGC = findLastGoldenCross(sma50Series, sma200Series);
  const lastGCDate = lastGC?.date || null;
  const daysSinceGC = lastGC?.daysAgo || null;

  // Determine phase
  const phase = determinePhase(
    convergence,
    stochasticTrajectory,
    latestPSAR,
    psarGap,
    latestStochastic,
    daysSinceGC,
  );

  // Determine Stochastic zone
  let stochasticZone: "oversold" | "neutral" | "overbought";
  if (latestStochastic.k < 20) {
    stochasticZone = "oversold";
  } else if (latestStochastic.k > 80) {
    stochasticZone = "overbought";
  } else {
    stochasticZone = "neutral";
  }

  // Calculate hold status
  let holdStatus: GCStochPSARSignal["holdStatus"];
  const isInPosition =
    phase.current === "fresh_breakout" ||
    phase.current === "uptrend_pullback" ||
    phase.current === "uptrend_holding";

  if (isInPosition) {
    if (psarGap.gapPct < 1 || latestPSAR.trend === "bearish") {
      holdStatus = {
        psarTrend: latestPSAR.trend,
        gapHealth: "critical",
        action: "exit",
        reason: "PSAR gap too narrow or bearish, trend reversal imminent",
      };
    } else if (psarGap.gapPct < 2) {
      holdStatus = {
        psarTrend: latestPSAR.trend,
        gapHealth: "weakening",
        action: "tighten_stop",
        reason: "PSAR gap tightening, monitor closely",
      };
    } else {
      holdStatus = {
        psarTrend: latestPSAR.trend,
        gapHealth: "strong",
        action: "hold",
        reason: "PSAR trend healthy with good gap",
      };
    }
  } else {
    holdStatus = {
      psarTrend: latestPSAR.trend,
      gapHealth: "strong",
      action: "hold",
      reason: "Not in position",
    };
  }

  // Calculate risk levels
  const suggestedEntry =
    phase.current === "fresh_breakout" ? latestPrice : latestSMA50;
  const cutLossPrice = suggestedEntry * 0.95;
  const invalidationLevel = latestSMA200;

  // Calculate history using date alignment
  const sma200Map = new Map(sma200Series.map((s) => [s.date, s.value]));
  const priceMap = new Map(sortedData.map((p) => [p.date, p.close]));

  const history = {
    convergenceTrend: sma50Series.slice(-10).map((sma50) => {
      const sma200 = sma200Map.get(sma50.date);
      const price = priceMap.get(sma50.date);
      return {
        date: sma50.date,
        gapPct: sma200 && price ? ((sma50.value - sma200) / price) * 100 : 0,
      };
    }),
    stochasticTrend: stochasticSeries.slice(-10).map((s) => ({
      date: s.date,
      k: s.k,
      d: s.d,
    })),
    psarTrend: psarSeries.slice(-10).map((p) => {
      const price = priceMap.get(p.date);
      return {
        date: p.date,
        trend: p.trend,
        gapPct: price ? (Math.abs(price - p.value) / price) * 100 : 0,
      };
    }),
  };

  return {
    symbol,
    asOf: latestDate,
    price: {
      close: latestPrice,
      changeFromSMA50Pct: ((latestPrice - latestSMA50) / latestSMA50) * 100,
    },
    goldenCross: {
      sma50: latestSMA50,
      sma200: latestSMA200,
      gapPct: convergence.gapPct,
      trendState: convergence.trendState,
      convergenceRate: convergence.convergenceRate,
      projectedDaysToGC: convergence.projectedDaysToGC,
      lastGCDate,
      daysSinceGC,
    },
    stochastic: {
      k: latestStochastic.k,
      d: latestStochastic.d,
      zone: stochasticZone,
      kSlope: stochasticTrajectory.kSlope,
      trajectory: stochasticTrajectory.trajectory,
      projectedDaysToOversold: stochasticTrajectory.projectedDaysToOversold,
      crossover: stochasticTrajectory.crossover,
    },
    psar: {
      value: latestPSAR.value,
      trend: latestPSAR.trend,
      gapPct: psarGap.gapPct,
      gapTrend: psarGap.gapTrend,
      lastFlipDate: latestDate, // TODO: Calculate actual last flip date
      daysSinceFlip: 0, // TODO: Calculate actual days since flip
    },
    phase,
    holdStatus,
    risk: {
      suggestedEntry,
      cutLossPrice,
      invalidationLevel,
    },
    history,
  };
}
