import type { Skill } from "../types.js";

export const portfolioManagement: Skill = {
  name: "portfolio-management",
  description:
    "Money management rules for stock investing: diversification guidelines by capital size, position sizing (50:30:10 rule), entry/exit strategies, and common mistakes to avoid.",
  content: `# Portfolio Management Framework

This skill provides structured guidelines for money management, position sizing, diversification, and entry/exit strategies for stock investing.

---

## 1. The Mathematics of Loss Recovery

Understanding why capital protection is critical:

| Loss Taken | Required Gain to Break Even |
|------------|----------------------------|
| 10% | 11% |
| 25% | 33% |
| 50% | 100% |
| 75% | 300% |
| 90% | 1000% |

**Key Principle**: Protecting capital is more important than chasing high returns. "Not losing money" beats speculative gains.

---

## 2. Common Money Management Mistakes

### Overdiversification
- Holding 30+ stocks severely limits portfolio growth
- Significant gains in one stock have negligible impact on total portfolio
- **Rule**: Quality over quantity

### Overconfidence (Under-diversification)
- Concentrating into single stock carries extreme risk
- If hypothesis is wrong, entire portfolio suffers
- **Rule**: Never put all eggs in one basket

### Sector Concentration
- Holding 4 different banks is NOT diversification
- Same-sector stocks react similarly to sector news
- **Rule**: True diversification means cross-sector exposure

### Imbalanced Position Sizing
- One stock at 50%, others at 2-5%
- Portfolio becomes dependent on single position
- **Rule**: Balance position sizes systematically

### Speculative Investing
- Buying into hype/FOMO without fundamental support
- These often experience rapid price collapses
- **Rule**: Have a thesis before entering

### Blue Chip Over-reliance
- Core stocks offer stability but lower returns
- All-blue-chip portfolio may underperform balanced mix
- **Rule**: Include value/growth stocks for alpha

### No Cash Reserves
- Cannot take advantage of market corrections
- Leads to psychological stress during downturns
- **Rule**: Always maintain cash buffer

---

## 3. Diversification Guidelines by Capital Size

Scale diversification based on investment capital:

| Capital Range | Max Stocks | Suggested Allocation |
|---------------|------------|---------------------|
| Under Rp 100 Million | 5 | 2 core stocks, 3 value stocks |
| Rp 100M – 1 Billion | 10 | 4 core stocks, 6 value stocks |
| Over Rp 1 Billion | 15 | 6 core stocks, 9 value stocks |

### Stock Categories

**Core Stocks**: Large-cap "Blue Chip" companies
- Mature and stable
- Long-term wealth preservation
- Lower growth but higher safety
- *Purpose*: Pension, inheritance, stability

**Value Stocks**: Mid-cap companies
- Consistent growth, less stability than core
- Used for asset accumulation
- *Purpose*: Portfolio growth

**Growth Stocks**: Above-average growth potential
- High upside but significant downside risk
- High volatility expected
- *Purpose*: Alpha generation (limited allocation)

---

## 4. Position Sizing Guidelines (50:30:10 Rule)

Structured limits for managing risk:

### 50% Minimum Rule
At least half of portfolio should be in stocks with **Margin of Safety (MoS) > 30%**
- Ensures bulk of capital is in undervalued positions
- Provides downside protection

### 30% Maximum Rule
No single stock should exceed **30% of total portfolio value**
- Maintains objectivity
- Prevents emotional attachment to single position
- Allows rational decision-making

### 10% Maximum Rule
Speculative or high-risk stocks limited to **10% of total portfolio**
- Contains downside from risky bets
- Prevents speculation from destroying portfolio

### Sector Limit
Generally hold **no more than 2 stocks within the same sector**
- True diversification across industries
- Reduces sector-specific risk

---

## 5. Entry Strategies (Scaling In)

### Dollar-Cost Averaging (DCA)
- **Best For**: Core/stable stocks
- **Method**: Fixed amount invested at regular intervals
- **Advantage**: Reduces timing risk, averages out volatility

### Lump Sum
- **Best For**: Value stocks with confirmed momentum
- **Method**: Full position entered at once
- **Advantage**: Maximizes exposure if timing is right

### Scaling Down (Averaging Down)
When a high-quality stock's price drops:

| Current Position Size | Trigger for Adding |
|-----------------------|-------------------|
| < 20% of portfolio | Every 10% price drop |
| > 20% of portfolio | Wait for 30% drop |

**Critical**: Only average down on fundamentally sound companies. Never average down on deteriorating businesses.

### Scaling Up (Adding to Winners)
If position is profitable but MoS still > 30%:
- **Triangle Concept**: Add smaller amounts as price increases
- First buy: Full position
- Second buy: 50% of first buy
- Third buy: 25% of first buy

---

## 6. Exit Strategies (Scaling Out)

### Profit Taking
Sell in stages as price approaches or exceeds intrinsic value:

| Price vs Intrinsic Value | Action |
|-------------------------|--------|
| 70-80% of IV | Hold |
| 90-100% of IV | Sell 30-50% |
| 100-120% of IV | Sell remaining |

### Early Exit (Before Reaching Intrinsic Value)
Acceptable to take profits early if:
1. Cash needed for a better opportunity
2. Portfolio cash level is too low
3. Market outlook is bearish
4. Position sizing exceeded limits

### Cut Loss Decision Framework

**When to Cut Loss**:
- Permanent fundamental change in company
- Good Corporate Governance (GCG) violation
- Significantly better opportunity available

**When NOT to Cut Loss**:
- Price fluctuation on healthy business
- Market-wide correction (not company-specific)
- Short-term noise without fundamental impact

---

## 7. Macroeconomic Asset Allocation

Adjust portfolio composition based on economic cycle:

### Recession / Downturn
| Asset Class | Allocation |
|-------------|------------|
| Stocks | ~40% (defensive focus) |
| Fixed Growth (Mutual Funds, P2P) | ~40% |
| Alternate (Gold, FX) | ~20% |

### Expansion / Bull Market
| Asset Class | Allocation |
|-------------|------------|
| Stocks | ~60% (include cyclicals) |
| Fixed Growth | ~25% |
| Alternate | ~15% |

---

## 8. Portfolio Review Triggers

**Red Flag**: If portfolio remains stagnant or red while IHSG reaches all-time highs:
- Current strategy needs fundamental overhaul
- Not capturing market upside indicates misalignment

**Periodic Review**:
- Monthly: Position sizing check
- Quarterly: Sector allocation review
- Annually: Full strategy assessment

---

## 9. Profit Realization Psychology

### Why Taking Profits Matters
- Continuous "portfolio rolling" without enjoying profits leads to burnout
- Periodically withdraw portion of gains to improve quality of life
- Makes trading meaningful beyond numbers on screen

### Profit Withdrawal Guidelines
- After significant gains (>50%), realize some in cash
- Use realized profits for personal goals (not just reinvestment)
- Maintain work-life balance with trading
`,
};
