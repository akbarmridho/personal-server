import dayjs from "dayjs";
import { RSI } from "trading-signals";
import { checkSymbol } from "../../aggregator/companies.js";
import type { ChartbitData } from "../../stockbit/chartbit.js";
import { getChartbitData } from "../../stockbit/chartbit.js";
import type { Skill } from "../types.js";

export const bottomFishingPlaybook: Skill = {
  name: "bottom-fishing-playbook",
  description:
    "A contrarian strategy for identifying market bottoms during crashes. Uses Weekly RSI for context and Heikin Ashi + Volume Spikes as execution triggers to catch reversals safely.",
  content: `
# Bottom Fishing Playbook

**Objective:** Identify high-probability entry points during market crashes by confirming that the "falling knife" has stopped before buying.

## Phase 1: The Macro Filter (Is it Cheap?)
**Tool:** RSI (Relative Strength Index) on **Weekly Timeframe**.
* **Why Weekly?** To filter out daily noise and measure the true strength of the crash.
* **Signal - Minor Crash:** RSI Weekly touches **~40 (Yellow Zone)**.
    * *Action:* Safe to start accumulating slowly ("cicil beli").
* **Signal - Major Crash:** RSI Weekly drops **below 30 (Red Zone / Oversold)**.
    * *Action:* High-alert zone. This is usually the best buying opportunity, **BUT** it requires Phase 2 validation to avoid value traps.

## Phase 2: The Trigger (Is the Bleeding Stopped?)
**Tool:** Volume Analysis + Heikin Ashi Candles.

### 1. Volume Spike Validation (Crucial)
* **The Trap:** An RSI < 30 alone is dangerous. Prices can stay oversold and continue to crash (e.g., UNVR July 2021).
* **The Requirement:** You must see a significant **Volume Spike** accompanying the oversold condition.
* **Logic:** Oversold + Volume Spike = Smart money is absorbing the selling pressure.

### 2. Heikin Ashi Reversal (Visual Confirmation)
* **Setup:** Use Heikin Ashi candles to smooth trends.
* **Buy Signal (Reversal):**
    * *Pattern:* A **Red Candle** (downtrend) is followed immediately by a **Yellow/Green Change Candle**.
    * *Meaning:* Selling momentum has stopped. The "falling knife" is safe to touch.
* **Sell/Warning Signal (Overbought):**
    * *Pattern:* A **Green Candle** (uptrend) is followed immediately by a **Yellow Change Candle**.
    * *Meaning:* Buying momentum is exhausted. Expect a correction.

## Execution Checklist
1.  **Check Weekly RSI:** Is it hovering near 40 (Minor) or below 30 (Major)?
2.  **Verify Volume:** Has a massive Volume Spike occurred to confirm the bottom?
3.  **Confirm Reversal:** Did the Heikin Ashi candle flip color from Red to Yellow/Green?
4.  **Entry:** Execute buy only when these conditions align.

## Automated Analysis Tool
Use the **get-bottom-fishing-signal** tool to instantly analyze a stock for this setup. It provides a predictive phase:
- **NO_SETUP**: RSI neutral, nothing happening. Action: Wait.
- **WATCHING**: RSI falling toward yellow zone. Action: Monitor.
- **MINOR_OPPORTUNITY**: RSI ~40 (Yellow Zone). Action: Start accumulating slowly.
- **MAJOR_ALERT**: RSI <30, waiting for confirmation. Action: High alert, watch for volume spike.
- **CAPITULATION_DETECTED**: RSI <30 + Volume Spike. Action: Wait for HA reversal.
- **REVERSAL_CONFIRMED**: All 3 conditions met. Action: **Execute Entry**.
- **RECOVERY_UNDERWAY**: Post-reversal uptrend. Action: Good entry if missed bottom.
- **EXIT_WARNING**: HA exhaustion signal. Action: Take profits.

The tool also provides predictive insights about when signals might form and actionable recommendations based on the current state.
`,
};

// === INTERFACES ===

export interface BottomFishingSignal {
  symbol: string;
  asOf: string;

  // Current price context
  price: {
    close: number;
    drawdownFromHighPct: number; // How far from 52-week high
  };

  // === PHASE 1: WEEKLY RSI ===
  weeklyRSI: {
    value: number;
    zone: "oversold_major" | "yellow_minor" | "neutral" | "overbought";

    // Predictive
    slope: number; // Positive = rising, negative = falling
    trajectory:
      | "falling_to_oversold"
      | "falling_to_yellow"
      | "bottoming"
      | "recovering"
      | "stable";
    projectedWeeksToOversold: number | null;
    projectedWeeksToYellow: number | null;

    // Context
    weeksInCurrentZone: number;
    lowestInPeriod: { value: number; date: string };
  };

  // === PHASE 2A: VOLUME SPIKE ===
  volumeSpike: {
    latestRatio: number; // current volume / SMA20
    hasSpike: boolean;
    intensity: "none" | "moderate" | "significant" | "climactic";

    // Predictive
    volumeTrend: "increasing" | "decreasing" | "stable";
    buildingUp: boolean; // Volume creeping up, spike may be forming

    // Recent spikes for context
    recentSpikes: Array<{
      date: string;
      ratio: number;
      priceChange: number; // % change that day
    }>;
  };

  // === PHASE 2B: HEIKIN ASHI ===
  heikinAshi: {
    current: {
      color: "red" | "green";
      bodyType: "strong" | "normal" | "doji";
    };
    previous: {
      color: "red" | "green";
      bodyType: "strong" | "normal" | "doji";
    };

    // Pattern detection
    pattern:
      | "strong_downtrend" // Red, no upper wick - bleeding continues
      | "weakening_downtrend" // Red with upper wick - sellers losing steam
      | "reversal_candle" // Red → Green/Doji flip
      | "strong_uptrend" // Green, no lower wick
      | "weakening_uptrend" // Green with lower wick
      | "exhaustion_candle" // Green → Red/Doji flip (sell warning)
      | "indecision";

    // Predictive
    momentumShift: "sellers_weakening" | "buyers_weakening" | "none";
    consecutiveRed: number; // How many red candles in a row
    consecutiveGreen: number;
  };

  // === COMBINED PHASE ===
  phase: {
    current:
      | "no_setup" // RSI neutral, nothing happening
      | "watching" // RSI falling, approaching yellow
      | "minor_opportunity" // RSI ~40 (Yellow Zone)
      | "major_alert" // RSI <30, waiting for confirmation
      | "capitulation_detected" // RSI <30 + Volume Spike
      | "reversal_confirmed" // All 3 conditions met
      | "recovery_underway" // Post-reversal uptrend
      | "exit_warning"; // HA exhaustion signal

    confidence: "high" | "medium" | "low";
    description: string;
    actionableInsight: string;

    // Checklist for LLM to explain
    checklist: {
      weeklyRSICondition: {
        met: boolean;
        detail: string; // e.g., "RSI at 28.5 (Oversold)"
      };
      volumeSpikeCondition: {
        met: boolean;
        detail: string; // e.g., "2.5x average volume detected"
      };
      heikinAshiCondition: {
        met: boolean;
        detail: string; // e.g., "Red → Green flip confirmed"
      };
    };
  };

  // === PREDICTIVE SUMMARY ===
  prediction: {
    setupFormingProbability: "high" | "medium" | "low" | "none";
    estimatedDaysToSignal: number | null;
    watchFor: string[]; // What to monitor next
  };

  // === HISTORY FOR CONTEXT ===
  history: {
    weeklyRSI: Array<{ weekEnding: string; value: number; zone: string }>;
    recentCandles: Array<{
      date: string;
      haColor: string;
      volume: number;
      volumeRatio: number;
    }>;
  };
}

export interface WeeklyBar {
  weekEnding: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RSIResult {
  date: string;
  value: number;
}

export interface HeikinAshiCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  color: "red" | "green";
  bodyType: "strong" | "normal" | "doji";
  hasUpperWick: boolean;
  hasLowerWick: boolean;
}

export interface VolumeAnalysis {
  date: string;
  volume: number;
  sma20: number;
  ratio: number;
  intensity: "none" | "moderate" | "significant" | "climactic";
}

export interface RSITrajectory {
  currentZone: "oversold_major" | "yellow_minor" | "neutral" | "overbought";
  slope: number;
  trajectory:
    | "falling_to_oversold"
    | "falling_to_yellow"
    | "bottoming"
    | "recovering"
    | "stable";
  projectedWeeksToOversold: number | null;
  projectedWeeksToYellow: number | null;
  weeksInCurrentZone: number;
}

export interface VolumeTrend {
  trend: "increasing" | "decreasing" | "stable";
  buildingUp: boolean;
  recentSpikes: Array<{
    date: string;
    ratio: number;
    priceChange: number;
  }>;
}

export interface HAPatternResult {
  pattern:
    | "strong_downtrend"
    | "weakening_downtrend"
    | "reversal_candle"
    | "strong_uptrend"
    | "weakening_uptrend"
    | "exhaustion_candle"
    | "indecision";
  momentumShift: "sellers_weakening" | "buyers_weakening" | "none";
  consecutiveRed: number;
  consecutiveGreen: number;
}

export interface PhaseResult {
  current:
    | "no_setup"
    | "watching"
    | "minor_opportunity"
    | "major_alert"
    | "capitulation_detected"
    | "reversal_confirmed"
    | "recovery_underway"
    | "exit_warning";
  confidence: "high" | "medium" | "low";
  description: string;
  actionableInsight: string;
  checklist: {
    weeklyRSICondition: { met: boolean; detail: string };
    volumeSpikeCondition: { met: boolean; detail: string };
    heikinAshiCondition: { met: boolean; detail: string };
  };
}

export interface Prediction {
  setupFormingProbability: "high" | "medium" | "low" | "none";
  estimatedDaysToSignal: number | null;
  watchFor: string[];
}

// === HELPER FUNCTIONS ===

/**
 * Aggregate daily OHLCV into weekly bars.
 * Week ends on Friday (or last trading day of the week).
 */
export function aggregateToWeekly(dailyData: ChartbitData[]): WeeklyBar[] {
  const sorted = dailyData.slice().sort((a, b) => a.unixdate - b.unixdate);
  const weeklyData: WeeklyBar[] = [];
  const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

  for (let i = 0; i < sorted.length; i++) {
    const weekStart = sorted[i];
    const weekEnd = weekStart.unixdate + WEEK_IN_SECONDS;
    const weekCandles = [weekStart];

    while (i + 1 < sorted.length && sorted[i + 1].unixdate < weekEnd) {
      weekCandles.push(sorted[++i]);
    }

    // Find the Friday or last day of the week
    let weekEndingDate = new Date(weekCandles[weekCandles.length - 1].date);
    const dayOfWeek = weekEndingDate.getDay();

    // If not Friday (5), adjust to Friday
    if (dayOfWeek !== 5) {
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
      weekEndingDate = new Date(
        weekEndingDate.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000,
      );
    }

    weeklyData.push({
      weekEnding: dayjs(weekEndingDate).format("YYYY-MM-DD"),
      open: weekCandles[0].open,
      high: Math.max(...weekCandles.map((c) => c.high)),
      low: Math.min(...weekCandles.map((c) => c.low)),
      close: weekCandles[weekCandles.length - 1].close,
      volume: weekCandles.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  return weeklyData;
}

/**
 * Calculate RSI using Wilder's smoothing method.
 *
 * Formula:
 *   RS = EMA(gains, period) / EMA(losses, period)
 *   RSI = 100 - (100 / (1 + RS))
 *
 * @param data - Price data (use weekly bars for weekly RSI)
 * @param period - Lookback period (default 14)
 */
export function calculateRSI(
  data: Array<{ date: string; close: number }>,
  period = 14,
): RSIResult[] {
  if (data.length < period + 1) {
    throw new Error(`RSI needs at least ${period + 1} data points`);
  }

  const rsi = new RSI(period);
  const results: RSIResult[] = [];

  for (const item of data) {
    rsi.add(item.close);

    if (rsi.isStable) {
      results.push({
        date: item.date,
        value: rsi.getResultOrThrow(),
      });
    }
  }

  return results;
}

/**
 * Calculate RSI on weekly timeframe.
 * Aggregates daily data to weekly, then calculates RSI.
 */
export function calculateWeeklyRSI(
  dailyData: ChartbitData[],
  period = 14,
): RSIResult[] {
  const weeklyData = aggregateToWeekly(dailyData);
  return calculateRSI(
    weeklyData.map((w) => ({ date: w.weekEnding, close: w.close })),
    period,
  );
}

/**
 * Calculate Heikin Ashi candles.
 *
 * Formulas:
 *   HA_Close = (O + H + L + C) / 4
 *   HA_Open = (prev_HA_Open + prev_HA_Close) / 2
 *   HA_High = max(H, HA_Open, HA_Close)
 *   HA_Low = min(L, HA_Open, HA_Close)
 *
 * Body Type:
 *   - "doji": body < 10% of range (transition candle / "yellow")
 *   - "strong": body > 60% of range
 *   - "normal": everything else
 */
export function calculateHeikinAshi(
  chartData: ChartbitData[],
): HeikinAshiCandle[] {
  const sortedData = chartData.slice().sort((a, b) => a.unixdate - b.unixdate);
  const haCandles: HeikinAshiCandle[] = [];

  if (sortedData.length === 0) return haCandles;

  let prevHAOpen = sortedData[0].open;
  let prevHAClose = sortedData[0].close;

  for (let i = 0; i < sortedData.length; i++) {
    const current = sortedData[i];

    // Calculate Heikin Ashi values
    const haClose =
      (current.open + current.high + current.low + current.close) / 4;
    const haOpen =
      i === 0
        ? (current.open + current.close) / 2
        : (prevHAOpen + prevHAClose) / 2;
    const haHigh = Math.max(current.high, haOpen, haClose);
    const haLow = Math.min(current.low, haOpen, haClose);

    // Determine color
    const color = haClose >= haOpen ? "green" : "red";

    // Determine body type
    const range = haHigh - haLow;
    const body = Math.abs(haClose - haOpen);

    let bodyType: "strong" | "normal" | "doji";
    if (body / range < 0.1) {
      bodyType = "doji";
    } else if (body / range > 0.6) {
      bodyType = "strong";
    } else {
      bodyType = "normal";
    }

    // Determine wicks
    const hasUpperWick =
      color === "red"
        ? haHigh - Math.max(haOpen, haClose) > range * 0.05
        : haHigh - haClose > range * 0.05;

    const hasLowerWick =
      color === "green"
        ? Math.min(haOpen, haClose) - haLow > range * 0.05
        : haOpen - haLow > range * 0.05;

    haCandles.push({
      date: current.date,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      color,
      bodyType,
      hasUpperWick,
      hasLowerWick,
    });

    // Update previous values for next iteration
    prevHAOpen = haOpen;
    prevHAClose = haClose;
  }

  return haCandles;
}

/**
 * Analyze volume relative to 20-day SMA.
 *
 * Intensity thresholds:
 *   - none: ratio < 1.5
 *   - moderate: 1.5 <= ratio < 2.0
 *   - significant: 2.0 <= ratio < 3.0
 *   - climactic: ratio >= 3.0
 */
export function analyzeVolume(
  chartData: ChartbitData[],
  smaPeriod = 20,
): VolumeAnalysis[] {
  const sortedData = chartData.slice().sort((a, b) => a.unixdate - b.unixdate);
  const results: VolumeAnalysis[] = [];

  if (sortedData.length < smaPeriod) {
    throw new Error(`Volume analysis needs at least ${smaPeriod} data points`);
  }

  for (let i = smaPeriod - 1; i < sortedData.length; i++) {
    const window = sortedData.slice(i - smaPeriod + 1, i + 1);
    const currentVolume = sortedData[i].volume;
    const sma20 = window.reduce((sum, d) => sum + d.volume, 0) / smaPeriod;
    const ratio = currentVolume / sma20;

    let intensity: "none" | "moderate" | "significant" | "climactic";
    if (ratio < 1.5) {
      intensity = "none";
    } else if (ratio < 2.0) {
      intensity = "moderate";
    } else if (ratio < 3.0) {
      intensity = "significant";
    } else {
      intensity = "climactic";
    }

    results.push({
      date: sortedData[i].date,
      volume: currentVolume,
      sma20,
      ratio,
      intensity,
    });
  }

  return results;
}

/**
 * Analyze RSI trajectory and predict when it might reach key zones.
 *
 * Zone thresholds:
 *   - oversold_major: RSI < 30
 *   - yellow_minor: 30 <= RSI < 45
 *   - neutral: 45 <= RSI <= 55
 *   - overbought: RSI > 70
 *
 * Trajectory logic:
 *   - If RSI falling and slope < -2/week → estimate weeks to reach 30 or 40
 *   - If RSI < 30 and slope flattening → "bottoming"
 *   - If RSI rising from oversold → "recovering"
 */
export function analyzeRSITrajectory(rsiSeries: RSIResult[]): RSITrajectory {
  if (rsiSeries.length < 3) {
    throw new Error("RSI trajectory analysis needs at least 3 data points");
  }

  const latest = rsiSeries[rsiSeries.length - 1];
  const previous = rsiSeries[rsiSeries.length - 2];
  const beforePrevious = rsiSeries[rsiSeries.length - 3];

  // Calculate slope (RSI change per week)
  const slope = latest.value - previous.value;

  // Determine current zone
  let currentZone: "oversold_major" | "yellow_minor" | "neutral" | "overbought";
  if (latest.value < 30) {
    currentZone = "oversold_major";
  } else if (latest.value < 45) {
    currentZone = "yellow_minor";
  } else if (latest.value <= 55) {
    currentZone = "neutral";
  } else {
    currentZone = "overbought";
  }

  // Determine trajectory
  let trajectory: RSITrajectory["trajectory"];
  if (slope < -0.5) {
    if (currentZone === "neutral" || currentZone === "overbought") {
      trajectory = "falling_to_yellow";
    } else if (currentZone === "yellow_minor") {
      trajectory = "falling_to_oversold";
    } else {
      trajectory = "stable";
    }
  } else if (slope > 0.5) {
    if (currentZone === "oversold_major" || currentZone === "yellow_minor") {
      trajectory = "recovering";
    } else {
      trajectory = "stable";
    }
  } else if (Math.abs(slope) <= 0.5) {
    if (currentZone === "oversold_major") {
      trajectory = "bottoming";
    } else {
      trajectory = "stable";
    }
  } else {
    trajectory = "stable";
  }

  // Project weeks to reach key zones
  let projectedWeeksToOversold: number | null = null;
  let projectedWeeksToYellow: number | null = null;

  if (slope < 0) {
    if (latest.value > 30) {
      projectedWeeksToOversold = Math.ceil(
        (latest.value - 30) / Math.abs(slope),
      );
    }
    if (latest.value > 45) {
      projectedWeeksToYellow = Math.ceil((latest.value - 45) / Math.abs(slope));
    }
  }

  // Count weeks in current zone
  let weeksInCurrentZone = 1;
  for (let i = rsiSeries.length - 2; i >= 0; i--) {
    const value = rsiSeries[i].value;
    let zone: typeof currentZone;

    if (value < 30) {
      zone = "oversold_major";
    } else if (value < 45) {
      zone = "yellow_minor";
    } else if (value <= 55) {
      zone = "neutral";
    } else {
      zone = "overbought";
    }

    if (zone === currentZone) {
      weeksInCurrentZone++;
    } else {
      break;
    }
  }

  return {
    currentZone,
    slope,
    trajectory,
    projectedWeeksToOversold,
    projectedWeeksToYellow,
    weeksInCurrentZone,
  };
}

/**
 * Analyze volume trend to predict if a spike is forming.
 *
 * Logic:
 *   - Compare volume SMA of last 5 days vs previous 5 days
 *   - If increasing but no spike yet → "buildingUp" = true
 *   - Extract recent spikes (ratio >= 2.0) with price action
 */
export function analyzeVolumeTrend(
  volumeAnalysis: VolumeAnalysis[],
  priceData: ChartbitData[],
): VolumeTrend {
  if (volumeAnalysis.length < 10) {
    throw new Error("Volume trend analysis needs at least 10 data points");
  }

  const latest = volumeAnalysis[volumeAnalysis.length - 1];
  const recent5 = volumeAnalysis.slice(-5);
  const previous5 = volumeAnalysis.slice(-10, -5);

  const recentAvg = recent5.reduce((sum, v) => sum + v.ratio, 0) / 5;
  const previousAvg = previous5.reduce((sum, v) => sum + v.ratio, 0) / 5;

  let trend: "increasing" | "decreasing" | "stable";
  if (recentAvg > previousAvg * 1.1) {
    trend = "increasing";
  } else if (recentAvg < previousAvg * 0.9) {
    trend = "decreasing";
  } else {
    trend = "stable";
  }

  // Check if volume is building up (increasing but no spike yet)
  const buildingUp = trend === "increasing" && latest.intensity === "none";

  // Find recent spikes
  const recentSpikes: VolumeTrend["recentSpikes"] = [];
  const priceMap = new Map(priceData.map((p) => [p.date, p]));

  for (
    let i = volumeAnalysis.length - 1;
    i >= Math.max(0, volumeAnalysis.length - 20);
    i--
  ) {
    const vol = volumeAnalysis[i];
    if (vol.ratio >= 2.0) {
      const price = priceMap.get(vol.date);
      if (price && i > 0) {
        const prevPrice = priceMap.get(volumeAnalysis[i - 1].date);
        if (prevPrice) {
          const priceChange =
            ((price.close - prevPrice.close) / prevPrice.close) * 100;
          recentSpikes.push({
            date: vol.date,
            ratio: vol.ratio,
            priceChange,
          });
        }
      }
    }
  }

  return {
    trend,
    buildingUp,
    recentSpikes: recentSpikes.reverse(), // Show most recent first
  };
}

/**
 * Detect Heikin Ashi patterns and momentum shifts.
 *
 * Pattern Detection:
 *   - strong_downtrend: Red + no upper wick
 *   - weakening_downtrend: Red + has upper wick (predictive!)
 *   - reversal_candle: prev Red → current Green/Doji
 *   - strong_uptrend: Green + no lower wick
 *   - weakening_uptrend: Green + has lower wick (predictive!)
 *   - exhaustion_candle: prev Green → current Red/Doji
 *
 * Momentum Shift (Predictive):
 *   - sellers_weakening: Downtrend but upper wicks appearing
 *   - buyers_weakening: Uptrend but lower wicks appearing
 */
export function detectHAPattern(haSeries: HeikinAshiCandle[]): HAPatternResult {
  if (haSeries.length < 2) {
    throw new Error("Heikin Ashi pattern detection needs at least 2 candles");
  }

  const current = haSeries[haSeries.length - 1];
  const previous = haSeries[haSeries.length - 2];

  // Count consecutive red/green candles
  let consecutiveRed = 0;
  let consecutiveGreen = 0;

  for (let i = haSeries.length - 1; i >= 0; i--) {
    if (haSeries[i].color === "red") {
      consecutiveRed++;
      consecutiveGreen = 0;
    } else {
      consecutiveGreen++;
      consecutiveRed = 0;
    }

    if (consecutiveRed > 0 && consecutiveGreen > 0) break;
  }

  // Determine pattern
  let pattern: HAPatternResult["pattern"];
  let momentumShift: HAPatternResult["momentumShift"] = "none";

  if (current.color === "red") {
    if (!current.hasUpperWick) {
      pattern = "strong_downtrend";
    } else {
      pattern = "weakening_downtrend";
      momentumShift = "sellers_weakening";
    }
  } else if (current.color === "green") {
    if (!current.hasLowerWick) {
      pattern = "strong_uptrend";
    } else {
      pattern = "weakening_uptrend";
      momentumShift = "buyers_weakening";
    }
  } else {
    pattern = "indecision";
  }

  // Check for reversal/exhaustion patterns
  if (
    previous.color === "red" &&
    (current.color === "green" || current.bodyType === "doji")
  ) {
    pattern = "reversal_candle";
    momentumShift = "sellers_weakening";
  } else if (
    previous.color === "green" &&
    (current.color === "red" || current.bodyType === "doji")
  ) {
    pattern = "exhaustion_candle";
    momentumShift = "buyers_weakening";
  }

  return {
    pattern,
    momentumShift,
    consecutiveRed,
    consecutiveGreen,
  };
}

/**
 * Determine current phase based on all indicators.
 */
export function determinePhase(
  rsiTrajectory: RSITrajectory,
  latestRSI: number,
  volumeAnalysis: VolumeAnalysis,
  volumeTrend: VolumeTrend,
  haPattern: HAPatternResult,
  latestHA: HeikinAshiCandle,
): PhaseResult {
  // Initialize checklist
  const checklist = {
    weeklyRSICondition: {
      met: false,
      detail: "",
    } as { met: boolean; detail: string },
    volumeSpikeCondition: {
      met: false,
      detail: "",
    } as { met: boolean; detail: string },
    heikinAshiCondition: {
      met: false,
      detail: "",
    } as { met: boolean; detail: string },
  };

  // Check RSI condition
  if (latestRSI < 30) {
    checklist.weeklyRSICondition.met = true;
    checklist.weeklyRSICondition.detail = `RSI at ${latestRSI.toFixed(1)} (Oversold Zone)`;
  } else if (latestRSI < 45) {
    checklist.weeklyRSICondition.met = true;
    checklist.weeklyRSICondition.detail = `RSI at ${latestRSI.toFixed(1)} (Yellow Zone)`;
  } else {
    checklist.weeklyRSICondition.detail = `RSI at ${latestRSI.toFixed(1)} (Neutral Zone)`;
  }

  // Check Volume condition
  if (volumeAnalysis.intensity !== "none") {
    checklist.volumeSpikeCondition.met = true;
    checklist.volumeSpikeCondition.detail = `Volume spike detected (${volumeAnalysis.ratio.toFixed(1)}x average)`;
  } else {
    checklist.volumeSpikeCondition.detail = `Volume at ${volumeAnalysis.ratio.toFixed(1)}x average (no spike)`;
  }

  // Check Heikin Ashi condition
  if (haPattern.pattern === "reversal_candle") {
    checklist.heikinAshiCondition.met = true;
    checklist.heikinAshiCondition.detail =
      "Reversal candle confirmed (Red → Green/Doji flip)";
  } else if (haPattern.pattern === "weakening_downtrend") {
    checklist.heikinAshiCondition.detail =
      "Downtrend weakening (upper wicks appearing)";
  } else if (haPattern.pattern === "exhaustion_candle") {
    checklist.heikinAshiCondition.met = true;
    checklist.heikinAshiCondition.detail =
      "Exhaustion candle (Green → Red/Doji flip)";
  } else {
    checklist.heikinAshiCondition.detail = `Pattern: ${haPattern.pattern.replace(/_/g, " ")}`;
  }

  // Determine phase
  let current: PhaseResult["current"];
  let confidence: "high" | "medium" | "low";
  let description = "";
  let actionableInsight = "";

  if (latestRSI > 55) {
    current = "no_setup";
    confidence = "low";
    description = "RSI in neutral/overbought zone, no bottom fishing setup";
    actionableInsight = "Wait for RSI to drop below 45 before considering";
  } else if (latestRSI >= 45) {
    current = "watching";
    confidence = "low";
    description = "RSI falling toward yellow zone, monitoring for opportunity";
    actionableInsight = "Watch for RSI to enter yellow zone (30-45)";
  } else if (latestRSI >= 30) {
    current = "minor_opportunity";
    confidence = "medium";
    description = "RSI in yellow zone, minor bottom fishing opportunity";
    actionableInsight =
      "Safe to start accumulating slowly. Watch for stronger signals.";
  } else if (latestRSI < 30) {
    if (
      checklist.volumeSpikeCondition.met &&
      checklist.heikinAshiCondition.met
    ) {
      current = "reversal_confirmed";
      confidence = "high";
      description = "All conditions met - strong reversal signal";
      actionableInsight = "Excellent entry point. Consider taking position.";
    } else if (checklist.volumeSpikeCondition.met) {
      current = "capitulation_detected";
      confidence = "medium";
      description =
        "Capitulation detected with volume spike, waiting for HA confirmation";
      actionableInsight =
        "Strong signal forming. Wait for HA reversal candle before entering.";
    } else if (haPattern.pattern === "exhaustion_candle") {
      current = "exit_warning";
      confidence = "high";
      description = "Heikin Ashi showing exhaustion, potential reversal";
      actionableInsight =
        "Warning signal - consider taking profits or tightening stops.";
    } else {
      current = "major_alert";
      confidence = "low";
      description = "RSI oversold but lacking confirmation";
      actionableInsight =
        "High alert zone. Wait for volume spike and HA reversal before entering.";
    }
  } else if (haPattern.pattern === "strong_uptrend" && latestRSI < 40) {
    current = "recovery_underway";
    confidence = "high";
    description = "Recovery confirmed with uptrend";
    actionableInsight =
      "Good entry point if missed the bottom. Recovery is underway.";
  } else {
    current = "no_setup";
    confidence = "low";
    description = "No clear setup at the moment";
    actionableInsight = "Continue monitoring for better opportunities.";
  }

  return {
    current,
    confidence,
    description,
    actionableInsight,
    checklist,
  };
}

/**
 * Generate predictive insights based on current indicators.
 *
 * Logic:
 *   - If RSI falling toward yellow → estimate days, suggest watching
 *   - If RSI oversold but no volume spike → "Watch for volume surge"
 *   - If volume building up → "Spike may be imminent"
 *   - If HA showing weakening downtrend → "Reversal candle may form soon"
 */
export function generatePrediction(
  rsiTrajectory: RSITrajectory,
  volumeTrend: VolumeTrend,
  haPattern: HAPatternResult,
  currentPhase: string,
): Prediction {
  let setupFormingProbability: "high" | "medium" | "low" | "none" = "none";
  let estimatedDaysToSignal: number | null = null;
  const watchFor: string[] = [];

  // Analyze based on current phase and indicators
  if (currentPhase === "watching") {
    setupFormingProbability = "low";
    if (rsiTrajectory.projectedWeeksToYellow !== null) {
      estimatedDaysToSignal = rsiTrajectory.projectedWeeksToYellow * 7;
      watchFor.push(
        `RSI entering yellow zone in ~${rsiTrajectory.projectedWeeksToYellow} weeks`,
      );
    }
  } else if (currentPhase === "minor_opportunity") {
    setupFormingProbability = "medium";
    if (rsiTrajectory.projectedWeeksToOversold !== null) {
      estimatedDaysToSignal = rsiTrajectory.projectedWeeksToOversold * 7;
      watchFor.push(
        `RSI dropping below 30 in ~${rsiTrajectory.projectedWeeksToOversold} weeks`,
      );
    }
    watchFor.push("Volume spike to confirm stronger signal");
  } else if (currentPhase === "major_alert") {
    setupFormingProbability = "medium";
    watchFor.push("Volume spike (≥2x average) to confirm capitulation");
    if (volumeTrend.buildingUp) {
      setupFormingProbability = "high";
      estimatedDaysToSignal = 3;
      watchFor.push("Volume building up - spike may be imminent");
    }
    if (haPattern.momentumShift === "sellers_weakening") {
      estimatedDaysToSignal = 5;
      watchFor.push("Heikin Ashi reversal candle forming soon");
    }
  } else if (currentPhase === "capitulation_detected") {
    setupFormingProbability = "high";
    watchFor.push("Heikin Ashi reversal candle for confirmation");
    if (haPattern.momentumShift === "sellers_weakening") {
      estimatedDaysToSignal = 2;
      watchFor.push("Reversal candle may form in 1-2 days");
    }
  } else if (
    currentPhase === "reversal_confirmed" ||
    currentPhase === "recovery_underway"
  ) {
    setupFormingProbability = "high";
    estimatedDaysToSignal = 0;
    watchFor.push("Monitor for continuation of uptrend");
  } else if (currentPhase === "exit_warning") {
    setupFormingProbability = "low";
    watchFor.push("Consider taking profits or tightening stops");
  }

  return {
    setupFormingProbability,
    estimatedDaysToSignal,
    watchFor,
  };
}

// === MAIN FUNCTION ===

/**
 * Analyze a stock for bottom fishing opportunities.
 *
 * Returns:
 *   - Current state of all indicators
 *   - Combined phase assessment
 *   - Predictive insights (when signal might trigger)
 *   - Historical context for LLM explanation
 */
export async function getBottomFishingSignal(
  symbol: string,
): Promise<BottomFishingSignal> {
  // 1. Fetch 1 year of daily data
  const dailyData = await getChartbitData({
    symbol: await checkSymbol(symbol),
    from: dayjs().subtract(1, "year").toDate(),
    to: dayjs().toDate(),
  });

  if (dailyData.length < 60) {
    throw new Error(
      `Insufficient data for ${symbol}. Need at least 60 trading days.`,
    );
  }

  // 2. Calculate Weekly RSI
  const weeklyRSISeries = calculateWeeklyRSI(dailyData);
  const rsiTrajectory = analyzeRSITrajectory(weeklyRSISeries);
  const latestRSI = weeklyRSISeries[weeklyRSISeries.length - 1];

  // 3. Analyze Volume
  const volumeAnalysisSeries = analyzeVolume(dailyData);
  const volumeTrend = analyzeVolumeTrend(volumeAnalysisSeries, dailyData);
  const latestVolume = volumeAnalysisSeries[volumeAnalysisSeries.length - 1];

  // 4. Calculate Heikin Ashi
  const haSeries = calculateHeikinAshi(dailyData);
  const haPattern = detectHAPattern(haSeries);
  const latestHA = haSeries[haSeries.length - 1];
  const previousHA =
    haSeries.length > 1 ? haSeries[haSeries.length - 2] : latestHA;

  // 5. Determine Phase
  const phase = determinePhase(
    rsiTrajectory,
    latestRSI.value,
    latestVolume,
    volumeTrend,
    haPattern,
    latestHA,
  );

  // 6. Generate Prediction
  const prediction = generatePrediction(
    rsiTrajectory,
    volumeTrend,
    haPattern,
    phase.current,
  );

  // 7. Compile History
  const history = {
    weeklyRSI: weeklyRSISeries.slice(-12).map((r) => ({
      weekEnding: r.date,
      value: r.value,
      zone:
        r.value < 30
          ? "oversold_major"
          : r.value < 45
            ? "yellow_minor"
            : r.value <= 55
              ? "neutral"
              : "overbought",
    })),
    recentCandles: haSeries.slice(-10).map((ha, i) => ({
      date: ha.date,
      haColor: ha.color,
      volume: dailyData[dailyData.length - (10 - i)].volume,
      volumeRatio:
        volumeAnalysisSeries[volumeAnalysisSeries.length - (10 - i)]?.ratio ||
        1,
    })),
  };

  // 8. Calculate price context
  const latestPrice = dailyData[dailyData.length - 1].close;
  const high52Week = Math.max(...dailyData.map((d) => d.high));
  const drawdownPct = ((latestPrice - high52Week) / high52Week) * 100;

  // 9. Find lowest RSI in period
  const lowestRSIValue = Math.min(...weeklyRSISeries.map((r) => r.value));
  const lowestRSI =
    weeklyRSISeries.find((r) => r.value === lowestRSIValue) || latestRSI;

  // 10. Assemble and return signal
  return {
    symbol,
    asOf: dailyData[dailyData.length - 1].date,
    price: {
      close: latestPrice,
      drawdownFromHighPct: drawdownPct,
    },
    weeklyRSI: {
      value: latestRSI.value,
      zone: rsiTrajectory.currentZone,
      slope: rsiTrajectory.slope,
      trajectory: rsiTrajectory.trajectory,
      projectedWeeksToOversold: rsiTrajectory.projectedWeeksToOversold,
      projectedWeeksToYellow: rsiTrajectory.projectedWeeksToYellow,
      weeksInCurrentZone: rsiTrajectory.weeksInCurrentZone,
      lowestInPeriod: { value: lowestRSI.value, date: lowestRSI.date },
    },
    volumeSpike: {
      latestRatio: latestVolume.ratio,
      hasSpike: latestVolume.intensity !== "none",
      intensity: latestVolume.intensity,
      volumeTrend: volumeTrend.trend,
      buildingUp: volumeTrend.buildingUp,
      recentSpikes: volumeTrend.recentSpikes,
    },
    heikinAshi: {
      current: {
        color: latestHA.color,
        bodyType: latestHA.bodyType,
      },
      previous: {
        color: previousHA.color,
        bodyType: previousHA.bodyType,
      },
      pattern: haPattern.pattern,
      momentumShift: haPattern.momentumShift,
      consecutiveRed: haPattern.consecutiveRed,
      consecutiveGreen: haPattern.consecutiveGreen,
    },
    phase,
    prediction,
    history,
  };
}
