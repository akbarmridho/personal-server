# Module 2: Levels

**Description:** Identifying key price levels where supply and demand concentrate, including Support/Resistance zones and Fibonacci retracements.

## 2.1 Support & Resistance Basics

### Definition

- **Support:** Price level where buying pressure (demand) is strong enough to stop price from falling further
- **Resistance:** Price level where selling pressure (supply) is strong enough to stop price from rising further

### How They Form

These levels represent areas of memory where significant trading occurred. Traders remember these prices and act on them again.

> **Source:** `analisis-teknikal.json` (Mentor Baik article)

## 2.2 How to Identify Support & Resistance Levels

There are several methods to identify S/R levels. Use multiple methods for stronger confluence.

### Method 1: Swing Highs and Lows (Primary)

The most reliable method. Look for previous **Swing Points** (see Module 01) where price reversed.

| To Find | Look For |
|---------|----------|
| Support | Previous Swing Lows where price bounced up |
| Resistance | Previous Swing Highs where price reversed down |

**How far back to look:**

- Recent swings (1-3 months) = stronger relevance
- Older swings (6+ months) = still valid if price reacted significantly there
- The more significant the reaction (larger bounce/rejection), the stronger the level

### Method 2: Historical Significant Levels

Major highs and lows from the past that caused significant price reactions.

| Level Type | Example |
|------------|---------|
| All-time high | Previous ATH acts as major resistance |
| 52-week high/low | Widely watched by institutions |
| Previous major peak/trough | Where large reversals occurred |

**Note:** Levels from 6+ months ago ARE valid if:

- The price reaction at that level was significant (high volume, strong reversal)
- The level hasn't been tested and broken since then

> **Source:** General TA principles

## 2.3 VPVR (Volume Profile Visible Range)

VPVR displays trading volume at different price levels, showing where most trading activity occurred. This helps identify S/R based on actual market participation.

### Key Components

| Component | Description | Use as S/R |
|-----------|-------------|------------|
| **Point of Control (POC)** | Price level with highest traded volume | Strongest S/R level |
| **High Volume Nodes (HVN)** | Areas with heavy trading activity | Strong S/R, price tends to bounce |
| **Low Volume Nodes (LVN)** | Areas with little trading activity | Price moves quickly through these |
| **Value Area (VA)** | Range where ~70% of volume traded | Upper = resistance, Lower = support |

### How to Use for S/R

1. **HVN = Strong S/R:** Price tends to consolidate or reverse at HVN because many traders have positions there
2. **LVN = Fast movement zones:** Price moves quickly through LVN (little interest), these are NOT good S/R
3. **POC = Magnet:** Price often gravitates back to POC (fair value area)

### Practical Application

- If price approaches HVN from below → expect resistance
- If price approaches HVN from above → expect support
- Breakout through LVN often continues to next HVN

> **Source:** [Volume Profile Guide](https://goodcrypto.app/ultimate-guide-to-volume-profile-vpvr-vpsv-vpfr-explained/), [VPVR for S/R](https://medium.com/@CryptoCallsEnpire/utilizing-volume-profile-vpvr-to-identify-support-and-resistance-levels-fd6b8ceda401)

## 2.4 Untested Level Strength

A support or resistance level that has **never been tested** is the strongest.

### Strength by Number of Tests

| Number of Tests | Strength | Notes |
|-----------------|----------|-------|
| 1st test | Strongest | Untested level, highest probability of holding |
| 2nd test | Strong | Still reliable |
| 3rd test | Weakening | Starting to exhaust |
| 4th+ test | Weak | High probability of breaking |

### The Law of Repeated Hits

The more times a price touches a support level, the more likely it is to break. If a stock hits support **4-5 times** without a significant bounce, the buying pressure is exhausted and breakdown is imminent.

> **Source:** `price-volume-wyckoff.md` (Hengky Trading Course Day 3)

## 2.5 Support & Resistance as Zones (Not Lines)

Professional traders treat S/R as **zones** rather than exact lines. A zone typically spans 1-3% of price.

### Why Zones?

- Markets are not precise
- Allows for normal price noise
- Reduces false signals

### How to Define Zone Width

| Method | Zone Width |
|--------|------------|
| Fixed percentage | ±1-2% from level |
| ATR-based | ±0.5 ATR from level |
| Wick-based | From candle body to wick extreme |

> **Source:** `analisis-teknikal.json`, General TA principles

## 2.6 Volume Confirmation on S/R

### At Support

- Price bounces from support with **increasing volume** = Strong support, valid bounce
- Price bounces from support with **low volume** = Weak bounce, may retest

### Breaking Support/Resistance

| Break Type | Volume | Interpretation |
|------------|--------|----------------|
| Breaks with **HIGH volume** | Valid breakout/breakdown |
| Breaks with **LOW volume** | Likely fake break, wait for confirmation |

> **Source:** `price-volume-wyckoff.md`

## 2.7 Bandar/Market Maker Manipulation at S/R

**Important for Indonesia market:** Market makers (bandar) know where retail traders place their stops. They deliberately break S/R levels to trigger stop losses before reversing.

### How Manipulation Works

1. **Retail behavior:** Most traders place stop loss just below support
2. **Bandar sees this:** They know where stop losses cluster
3. **The trap:** Price is pushed below support to trigger stop losses
4. **The reversal:** After stops are triggered (retail sells), bandar buys cheap and price reverses up
5. **Result:** Retail sold at the worst price, bandar bought at the best price

### S/R Levels as "Liquidity Pools"

Professional traders view S/R not as barriers, but as **liquidity pools** where they can:

- Trigger stop losses to buy cheap (at support)
- Trigger FOMO entries to sell high (at resistance)

> **Source:** `price-volume-wyckoff.md` (Hengky Trading Course)

## 2.8 Detecting and Handling False Breaks

Distinguish real breaks from fake breaks using volume:

| Scenario | Volume | Action |
|----------|--------|--------|
| S/R breaks + **LOW volume** | Likely fake break | Wait, don't react |
| S/R breaks + **HIGH volume** | Valid break | Act accordingly |

### Signs of Fake Break

- Quick recovery (same day/next day)
- Only wick breaks, body closes inside
- No follow-through next session

### How to Handle

- Give buffer on stops (don't place exactly at S/R)
- Wait for daily close confirmation
- Check volume before reacting

> **Source:** `price-volume-wyckoff.md` (Hengky Trading Course Day 2-3)

## 2.9 Role Reversal

When a support level is broken, it often becomes resistance (and vice versa).

**Example:** Stock breaks below 1000 support → 1000 now acts as resistance on any bounce attempt.

### Why It Works

- Traders who bought at 1000 are now underwater
- They want to sell at breakeven when price returns to 1000
- This creates selling pressure = resistance

> **Source:** General TA principles, `analisis-teknikal.json`

## 2.10 Fibonacci Retracement

Fibonacci is **NOT used to calculate S/R** directly. Instead, it identifies potential S/R zones during pullbacks within a trend.

### Key Fibonacci Levels

| Level | Usage |
|-------|-------|
| 23.6% | Shallow retracement, strong momentum |
| 38.2% | Common retracement in strong trends |
| 50.0% | Not Fibonacci but widely watched |
| 61.8% | "Golden ratio" - deep but still healthy |
| 78.6% | Very deep, borderline trend failure |

### How to Apply

1. Identify the most recent significant **swing high** and **swing low** (see Module 01)
2. In an uptrend: measure from low to high
3. In a downtrend: measure from high to low
4. Retracement levels show where pullback may find support

> **Source:** `fibonacci-retracement.md` (Investopedia), `analisis-teknikal.json`

## 2.11 Fibonacci as Confluence

Fibonacci is most powerful when it **aligns with other S/R levels** (confluence).

**Strong setup example:**

- Price pulls back to 61.8% Fib level
- AND that level coincides with a previous swing low (support)
- AND there's a round number nearby
- = High probability reversal zone

### Fibonacci Extensions (for profit targets)

| Level | Usage |
|-------|-------|
| 100% | Previous high/low |
| 127.2% | First extension target |
| 161.8% | Second extension target |
| 261.8% | Extended target |

> **Source:** `fibonacci-retracement.md`, `analisis-teknikal.json`

## Summary

| Concept | Rule |
|---------|------|
| Primary S/R method | Swing highs/lows from price history |
| Historical levels | 6+ months valid if reaction was significant |
| VPVR | HVN = strong S/R, POC = strongest, LVN = fast zones |
| Untested S/R | Untested levels are strongest |
| Repeated tests | 4+ touches = likely to break |
| Zones not lines | S/R spans 1-3% range |
| Volume on break | High volume = valid, Low volume = fake |
| Bandar manipulation | S/R used to trigger stops, check volume |
| Role reversal | Broken support becomes resistance |
| Fibonacci | Confluence tool, not standalone S/R |
