# Module 1: Market Structure & Trend

**Description:** Identifying market direction (uptrend, downtrend, sideways) using price structure, moving averages, trendlines, and understanding market cycles.

## 1.1 The Market Lifecycle (Wyckoff)

Markets move through predictable phases of accumulation, markup, distribution, and markdown. Understanding where you are in the cycle is the first step of analysis.

### The Four Phases

| Phase | Description | Who's Active |
|-------|-------------|--------------|
| **Accumulation** | Smart money quietly buying. Sideways range after downtrend. | Institutions BUY, Retail SELLS (in fear). |
| **Markup** | Price rises, trend established. Highs occur on high volume. | Everyone joins. Public participation begins. |
| **Distribution** | Smart money quietly selling. Sideways range after uptrend. | Institutions SELL, Retail BUYS (FOMO). |
| **Markdown** | Price falls. Supply exceeds demand. | Retail left holding. Panic selling. |

> **Source:** `price-volume-wyckoff.md` (Wyckoff principles)

## 1.2 Trend Definition

### Uptrend

- Price makes **Higher Highs (HH)** and **Higher Lows (HL)**
- Price stays above key Moving Averages
- Trendline connecting higher lows remains intact

### Downtrend

- Price makes **Lower Highs (LH)** and **Lower Lows (LL)**
- Price stays below key Moving Averages
- Trendline connecting lower highs remains intact

### Sideways (Range)

- Price oscillates between horizontal support and resistance
- No clear HH/HL or LH/LL pattern
- Moving Averages flatten and intertwine

> **Source:** General TA principles, synthesized from `dynamic-ma-trendline.md`

## 1.3 Swing Point Identification (HH, HL, LH, LL)

To identify trend direction, you must first identify **Swing Points** - the peaks and valleys in price movement.

### Definition

| Term | Definition |
|------|------------|
| **Swing High** | A candle where the high is higher than the highs of N candles on both left and right sides |
| **Swing Low** | A candle where the low is lower than the lows of N candles on both left and right sides |

### The N=2 Method (Simple Rule)

Use N=2 for practical swing point identification:

```
Swing High: Current High > 2 previous highs AND Current High > 2 following highs
Swing Low:  Current Low < 2 previous lows AND Current Low < 2 following lows
```

### Example

Candle sequence highs: 100, 102, **105**, 103, 101

The "105" is a **Swing High** because:

- It's higher than 2 candles before (100, 102)
- It's higher than 2 candles after (103, 101)

### Identifying Trend from Swing Points

| Trend | Swing High Pattern | Swing Low Pattern |
|-------|-------------------|-------------------|
| **Uptrend** | Each new Swing High > Previous Swing High (HH) | Each new Swing Low > Previous Swing Low (HL) |
| **Downtrend** | Each new Swing High < Previous Swing High (LH) | Each new Swing Low < Previous Swing Low (LL) |
| **Sideways** | No clear higher/lower pattern | No clear higher/lower pattern |

### Trend Break Detection

| Current Trend | Break Signal |
|---------------|--------------|
| Uptrend breaks | Price **closes below** the most recent Swing Low |
| Downtrend breaks | Price **closes above** the most recent Swing High |

**Important:** A wick/shadow below the swing low is NOT a confirmed break. The candle body must close below/above for confirmation.

> **Source:** [LuxAlgo - Swing Highs and Lows](https://www.luxalgo.com/blog/swing-highs-and-lows-basics-for-traders/), [StoneX Futures - Swing Highs and Lows](https://futures.stonex.com/blog/how-to-identify-and-trade-swing-highs-and-swing-lows)

## 1.4 Moving Averages as Trend Filter

A Moving Average (MA) represents the average price over a specific period. The "Dynamic MA" concept involves finding the specific MA line that a particular stock respects during its trend.

### Function

- In an **uptrend**, the MA acts as **dynamic support** (floor the price bounces off)
- In a **downtrend**, the MA acts as **dynamic resistance** (ceiling the price rejects from)

### Common Dynamic MAs

| Stock Behavior | Typical MA |
|----------------|------------|
| Fast-moving stocks | MA3, MA5, MA10 |
| Medium stocks | MA20 |
| Slow stocks | MA50 |

### The Rule

As long as the stock price stays **above** its Dynamic MA, the trend is considered intact and the stock should be held.

> **Source:** `dynamic-ma-trendline.md` (Chart Investor Academy - IFEF 2021)

## 1.5 Trendlines

Trendlines are diagonal lines drawn connecting swing points to visualize the trend direction.

### How to Draw Uptrend Trendline

1. Identify at least **2 Swing Lows** (see Section 1.3)
2. Draw a straight line connecting these Swing Lows
3. Extend the line forward into the future
4. The line acts as **dynamic support** - price should bounce off it

```
        /\
       /  \    /\
      /    \  /  \
     /      \/    \
    *--------*-------> (trendline connecting swing lows)
```

### How to Draw Downtrend Trendline

1. Identify at least **2 Swing Highs** (see Section 1.3)
2. Draw a straight line connecting these Swing Highs
3. Extend the line forward into the future
4. The line acts as **dynamic resistance** - price should reject from it

```
    *--------*-------> (trendline connecting swing highs)
     \      /\    /
      \    /  \  /
       \  /    \/
        \/
```

### Trendline Validity Rules

| Factor | More Valid | Less Valid |
|--------|------------|------------|
| Number of touches | 3+ touches | Only 2 touches |
| Angle | Moderate slope (30-45°) | Very steep (>60°) |
| Time span | Longer duration | Very short |
| Respect | Clean bounces | Many false breaks |

### Trendline Break Confirmation

A trendline break is confirmed when:

1. Price **closes** beyond the trendline (not just wick)
2. Ideally with **volume confirmation** (see Module 03)

### Convergence Signal (Strong)

When price breaks below **BOTH** the Dynamic MA **AND** the Trendline = strong sell signal. This double confirmation reduces false signals.

> **Source:** `dynamic-ma-trendline.md` (Chart Investor Academy - IFEF 2021)

## Summary

| Concept | Rule |
|---------|------|
| Swing High | High > 2 candles on each side |
| Swing Low | Low < 2 candles on each side |
| Uptrend | HH + HL pattern, Price > MA |
| Downtrend | LH + LL pattern, Price < MA |
| Trend break | Close below recent Swing Low (uptrend) or above Swing High (downtrend) |
| Trendline | Connect 2+ swing lows (up) or swing highs (down) |
| Trend intact | Price respects Dynamic MA + Trendline |
| Trend broken | Price breaks MA + Trendline with close |
