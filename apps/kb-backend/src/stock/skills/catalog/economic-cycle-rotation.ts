import type { Skill } from "../types.js";

export const economicCycleRotation: Skill = {
  name: "economic-cycle-rotation",
  description:
    "Framework for sector rotation based on economic cycle phases: 6-stage economic cycle, stock market cycle timing, defensive vs offensive stocks, and phase-specific investment strategies.",
  content: `# Economic Cycle & Sector Rotation Framework

This skill provides a systematic framework for rotating sector allocations based on economic phases. Understanding the relationship between economic cycles and stock market cycles is essential for optimizing portfolio timing.

## 1. The Economic Business Cycle (6 Stages)

The economy cycles through **Expansion** and **Contraction** phases, with GDP growth as the primary indicator.

### Stage 1: Start of Contraction
- **GDP**: Negative growth begins
- **Stocks**: Indices falling
- **Commodities**: Prices falling
- **Bonds**: Begin to rise (flight to safety)
- **Strategy**: Reduce equity exposure, accumulate bonds

### Stage 2: Bottoming
- **GDP**: Still negative but rate of decline slowing
- **Commodities**: Hit lowest points
- **Stocks**: Some stocks begin rising despite poor economy
- **Bonds**: Continue rising
- **Strategy**: Start accumulating blue-chip stocks

### Stage 3: Early Recovery
- **GDP**: Turns positive but stays below average
- **Commodities**: Prices increase
- **Stocks**: Broader market gains
- **Bonds**: Begin trending downward
- **Strategy**: Move into mid-cap "second-liner" stocks

### Stage 4: Expansion
- **GDP**: Growth exceeds average levels
- **Commodities**: Continue rising
- **Stocks**: Continue rising
- **Bonds**: Continue falling (money exits bonds for equities)
- **Strategy**: Overweight offensive/cyclical stocks

### Stage 5: Topping Out
- **GDP**: At peak but starting to limit
- **Commodities**: Hit highest points
- **Stocks**: Broad indices slow; some stocks start declining
- **Bonds**: Still falling
- **Strategy**: Begin profit-taking, increase cash positions

### Stage 6: Early Recession
- **GDP**: Turns negative again
- **Commodities**: Begin falling
- **Stocks**: Investors take profits, prices decline
- **Bonds**: Also decline as investors move toward cash
- **Strategy**: Heavy cash position, defensive stocks only

## 2. Economic Phase Characteristics

### Early Recession
- Trade balance volume decreases
- Currency (Rupiah) weakens
- Consumption drops
- Inflation slows
- Interest rates typically lowered to stimulate growth

### Full Recession
- Significant trade volume drops
- Potential deflation
- Government stimulus policies (tax incentives for property/automotive)
- Interest rates hit "bottom"

### Early Recovery
- Consumption and inflation begin creeping up
- Government policies take effect
- GDP starts improving
- Commodity prices rise

### Full/Late Recovery
- High trade volume
- Stable currency
- High consumption across all social levels
- Higher inflation
- Government moves toward restrictive policies (raising rates to prevent overheating)

## 3. Stock Market Cycle vs Economic Cycle

**Critical Insight**: The stock market cycle is **well ahead** of the economic cycle.

- Stocks often **start rising** when economy is at its worst (anticipating recovery)
- Stocks often **start falling** when economy is at its peak (anticipating downturn)

### The 4 Stages of Stock Market Cycle

#### Stage A: Accumulation
- Institutional and foreign investors begin entering
- Trading volume increases
- Blue-chip stocks start slow ascent
- **Economic Phase**: Usually late recession / early recovery

#### Stage B: Markup (Participation)
- Retail investors enter due to FOMO
- Broad market gains across blue-chip and mid-cap
- **Economic Phase**: Usually early to mid expansion

#### Stage C: Distribution
- Institutional investors begin taking profits
- Index becomes volatile and moves sideways
- Professional selling meets retail buying
- **Economic Phase**: Usually late expansion / early contraction

#### Stage D: Markdown (Capitulation)
- Market enters bearish phase
- Fear sets in among retail investors
- Panic selling and rapid price decline
- **Economic Phase**: Usually mid to late contraction

## 4. Defensive vs Offensive Stocks

### Defensive Stocks (Recession-Resistant)
Best during **Recessions or Contractions**. People continue consuming regardless of economic conditions.

| Sector | Examples | Rationale |
|--------|----------|-----------|
| **Consumer Goods** | ICBP, INDF, UNVR | Essential daily needs |
| **Finance (Banking)** | BBCA, BBRI, BMRI | Financial services always needed |
| **Healthcare** | SILO, KLBF | Health spending non-discretionary |
| **Energy** | PGAS, AKRA | Essential utilities |
| **Telecommunications** | TLKM, EXCL | Communication is necessity |

### Offensive Stocks (Cyclicals)
Best during **Expansion**. Benefit directly from increased industrial activity and consumer spending power.

| Sector | Examples | Rationale |
|--------|----------|-----------|
| **Commodities** | Coal, Metals, Oil, CPO | Industrial demand surge |
| **Property** | BSDE, CTRA, SMRA | Big-ticket purchases increase |
| **Construction** | WIKA, PTPP, ADHI | Infrastructure spending |
| **Cement** | INTP, SMGR | Building materials demand |
| **Retail** | MAPI, RALS | Discretionary spending rises |
| **Automotive** | ASII, AUTO | Big-ticket consumer goods |

## 5. Sector Rotation Strategy

### Transition to Late Recession → Early Recovery
- **Action**: Start accumulating blue-chip stocks
- **Focus**: Defensive sectors first, then early-cycle industrials
- **Rationale**: Market anticipates recovery before economy shows it

### Transition to Early Recovery → Expansion
- **Action**: Rotate into "second-liner" / mid-cap stocks
- **Focus**: Offensive/cyclical sectors
- **Rationale**: Maximum risk appetite, maximum upside potential

### Transition to Late Expansion → Early Recession
- **Action**: Increase cash positions
- **Action**: Take profits on high-growth cyclicals
- **Focus**: Shift back toward defensive sectors
- **Rationale**: Protect gains before market turns

## 6. Indonesian Market Indicators

### Global Leading Indicators
- **PMI (Purchasing Managers' Index)**: >50 = expansion, <50 = contraction
- **Fed Balance Sheet**: Expansion = bullish, Tapering = bearish
- **Fed Rate**: Low = acceleration, High = deceleration

### Domestic Leading Indicators
- **Trade Balance**: Surplus strengthens IDR, deficit weakens
- **IDR/USD**: Weak Rupiah hurts companies with USD debt
- **Inflation**: BI targets 3% ± 1% as healthy range
- **BI Rate**: Watch spread vs Fed Rate (needs ~3% spread to prevent outflow)
- **Bond Yields**: High yields often see money exit stocks for bonds

## Key Principle

> "Be fearful when others are greedy, and be greedy when others are fearful."
> — Warren Buffett

The best time to buy is when markets are pessimistic and prices are low. The best time to sell is when everyone is euphoric.
`,
};
