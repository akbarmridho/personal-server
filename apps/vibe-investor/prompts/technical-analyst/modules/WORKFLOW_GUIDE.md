# AI Analysis Workflow Guide

**Goal:** Perform rigorous technical analysis by combining **Code** (for facts) and **Visual Reasoning** (for context).

## Core Philosophy: Mixed Reasoning

1. **Code Findings:** "The math says Support is at 450."
2. **Visual Findings:** "The chart shows a Volume Anomaly at 450."
3. **Synthesis:** Combine both to form a verdict.

---

## Phase 1: Preparation

**Objective:** Load data and calculate standard indicators.

1. **Data Load:** Load the JSON/CSV data for the target ticker.
2. **Standard Indicators:** Calculate MA5, MA10, MA20, MA50, and ATR.
3. **Swing Points:** Identify Swing Highs/Lows using `identify_swing_points` (Refer to `REFERENCE_CODE.md` > Section 1).

---

## Phase 2: Numerical Analysis (The Code)

**Objective:** Generate "hard facts" before looking at the chart.

**Write a script to:**

1. **Trend Structure:** Use `detect_trend_structure` (Ref: `REFERENCE_CODE.md` > Sec 1).
    * *Result:* "UPTREND", "DOWNTREND", or "SIDEWAYS".
2. **S/R Clustering:** Use `identify_support_resistance` (Ref: `REFERENCE_CODE.md` > Sec 2).
    * *Result:* List of Resistance and Support zones (Price, Touches).
3. **Price-Volume Matrix:** Use `analyze_price_volume` (Ref: `REFERENCE_CODE.md` > Sec 3).
    * *Result:* Flags for "DISTRIBUTION" or "ACCUMULATION".
4. **Risk Calculation:** Use `calculate_stop_loss` (Ref: `REFERENCE_CODE.md` > Sec 4).
    * *Result:* Recommended Stop Loss price (Max of Structural vs ATR).

**Output:** Print a text summary of these values.

---

## Phase 3: Visualization

**Objective:** Create the visual context.

**Write a script to:**

1. **Generate Chart:** Use `mplfinance` (Ref: `REFERENCE_CODE.md` > Sec 5).
2. **Layers:**
    * Candlesticks + Volume.
    * Moving Averages (MA20, MA50).
    * **Plot the S/R levels** calculated in Phase 2 as dashed lines.
    * Mark the Stop Loss line in red.
3. **Save:** Save to `artifacts/{ticker}_analysis.png`.

---

## Phase 4: Reasoning (The "Thinking")

**Objective:** Read the chart and validate the math.

**Ask yourself:**

1. **Trend Check:** Code says "UPTREND". Does the chart look like an uptrend? Are the lows actually rising?
2. **Level Check:** Code found Support at 500. Does price actually bounce there on the chart? Is it a "Zone"?
3. **Volume Check:** Look at the volume bars during the last rally. Are they rising (Strong) or falling (Weak)?
4. **Anomaly:** Do you see a massive volume spike that the code might have missed or just flagged numerically?

---

## Phase 5: Synthesis & Reporting

**Objective:** Final Output.

1. **Resolve Conflicts:** If Code says "Bullish" but Chart looks "Bearish" (e.g., big wick rejection), trust the **Chart/Price Action**.
2. **Write Report:** Follow the format in `modules/06-output-format.md`.
    * Include the **Risk Score**.
    * State the **Action** (Buy/Hold/Sell).
    * Embed the **Chart Image**.
