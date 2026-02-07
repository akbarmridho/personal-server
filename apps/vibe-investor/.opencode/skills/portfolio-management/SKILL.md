---
name: portfolio-management
description: Trading desk and portfolio operations — position sizing (50:30:10 rule), entry/exit strategies, economic cycle rotation, trading plan templates, portfolio review checklists, watchlist management, and session logging format.
---

## Data Sources

- **`get-stock-fundamental`** — Current price for P&L calculation, basic stats.
- **`get-stock-financials`** — Dividend check for income positions.
- **Knowledge Base:** `search-documents`, `list-documents` for recent news/filings for position monitoring.
- **Filesystem:** Primary tool — heavy read/write to memory files.

### Memory Files

| File | Purpose |
|------|---------|
| `memory/notes/portfolio.md` | Open/closed positions, P&L tracking |
| `memory/notes/watchlist.md` | Stocks under observation with trigger conditions |
| `memory/tickers/{TICKER}.md` | Per-ticker trading plan, thesis, key levels |
| `memory/sessions/{DATE}.md` | Daily session logs |
| `memory/analysis/{TICKER}/` | Analysis outputs from all skills |

---

## Module 1: Capital Protection & Loss Math

### The Mathematics of Recovery

| Loss | Required Gain to Break Even |
|------|---------------------------|
| 10% | 11% |
| 25% | 33% |
| 50% | 100% |
| 75% | 300% |
| 90% | 1000% |

**Principle**: Protecting capital is more important than chasing returns. A 50% loss requires doubling your money just to get back to zero.

### Common Money Management Mistakes

| Mistake | Problem | Rule |
|---------|---------|------|
| Overdiversification (30+ stocks) | Significant gains in one stock have negligible portfolio impact | Quality over quantity |
| Under-diversification (1-2 stocks) | Wrong hypothesis = portfolio disaster | Never all eggs in one basket |
| Sector concentration | 4 banks is NOT diversification — same-sector stocks correlate | Cross-sector exposure required |
| Imbalanced sizing | One stock at 50%, others at 2-5% | Balance sizes systematically |
| Speculative FOMO | Buying hype without thesis | Always have a thesis before entering |
| All blue-chip | Stability but lower returns | Include value/growth for alpha |
| No cash reserves | Can't capitalize on corrections | Always maintain cash buffer |

---

## Module 2: Position Sizing

### Diversification by Capital Size

| Capital Range | Max Stocks | Allocation |
|--------------|------------|-----------|
| < Rp 100M | 5 | 2 core + 3 value |
| Rp 100M – 1B | 10 | 4 core + 6 value |
| > Rp 1B | 15 | 6 core + 9 value |

### Stock Categories

| Category | Profile | Purpose |
|----------|---------|---------|
| **Core** | Large-cap blue chip, stable, mature | Wealth preservation, dividends |
| **Value** | Mid-cap, consistent growth, moderate risk | Portfolio growth, accumulation |
| **Growth** | High upside, high volatility, higher risk | Alpha generation (limited allocation) |

### The 50:30:10 Rule

| Rule | Constraint | Rationale |
|------|-----------|-----------|
| **50% Minimum** | ≥50% of portfolio in stocks with MoS >30% | Ensures bulk of capital is in undervalued positions |
| **30% Maximum** | No single stock >30% of portfolio | Prevents emotional attachment, maintains objectivity |
| **10% Maximum** | Speculative/high-risk stocks ≤10% total | Contains downside from risky bets |
| **Sector Limit** | ≤2 stocks per sector | True cross-sector diversification |

### 1% Risk Rule (Per-Trade)

For tactical/technical entries:

```
Position Size = (Portfolio × 1%) / (Entry Price - Stop Loss)
```

- Max portfolio risk at any time ("portfolio heat"): 5-6% total open risk
- Adjust for conviction: high conviction = 1.5%, low = 0.5%

---

## Module 3: Entry & Exit Strategies

### Entry Strategies

**Dollar-Cost Averaging (DCA):**
- Best for: Core/stable stocks
- Method: Fixed amount at regular intervals
- Advantage: Reduces timing risk

**Lump Sum:**
- Best for: Value stocks with confirmed momentum
- Method: Full position at once
- Advantage: Maximizes exposure if timing is right

**Scaling Down (Averaging Down):**

| Current Position Size | Trigger |
|----------------------|---------|
| < 20% of portfolio | Every 10% price drop |
| > 20% of portfolio | Wait for 30% drop |

**Critical**: Only average down on fundamentally sound companies. Never average down on deteriorating businesses.

**Scaling Up (Adding to Winners):**

If position is profitable but MoS still >30%, use the triangle concept:

- First buy: Full position
- Second buy: 50% of first
- Third buy: 25% of first

### Exit Strategies

**Profit Taking (Staged):**

| Price vs Intrinsic Value | Action |
|-------------------------|--------|
| 70-80% of IV | Hold |
| 90-100% of IV | Sell 30-50% |
| 100-120% of IV | Sell remaining |

**Early Exit (Before IV):**

Acceptable if:
1. Better opportunity requires cash
2. Portfolio cash level too low
3. Market outlook is bearish
4. Position sizing exceeded limits

**Cut Loss Framework:**

| Cut Loss | Don't Cut Loss |
|----------|---------------|
| Permanent fundamental change | Price fluctuation on healthy business |
| GCG (governance) violation | Market-wide correction |
| Significantly better opportunity available | Short-term noise without fundamental impact |

---

## Module 4: Economic Cycle & Sector Rotation

### The 6-Stage Business Cycle

| Stage | GDP | Strategy |
|-------|-----|----------|
| **1. Start of Contraction** | Negative growth begins | Reduce equity, accumulate bonds |
| **2. Bottoming** | Still negative, rate slowing | Start accumulating blue chips |
| **3. Early Recovery** | Turns positive, below average | Move into mid-cap second-liners |
| **4. Expansion** | Exceeds average | Overweight cyclicals/offensive |
| **5. Topping Out** | At peak, starting to limit | Begin profit-taking, increase cash |
| **6. Early Recession** | Turns negative again | Heavy cash, defensive stocks only |

**Critical Insight**: The stock market cycle is *ahead* of the economic cycle. Stocks start rising when economy is at its worst (anticipating recovery) and start falling when economy peaks.

### Stock Market Cycle (4 Stages)

| Stage | Economic Phase | Behavior |
|-------|---------------|----------|
| **Accumulation** | Late recession / early recovery | Institutional/foreign entry, volume up, blue chips ascend |
| **Markup** | Early to mid expansion | Retail FOMO enters, broad gains |
| **Distribution** | Late expansion / early contraction | Institutional profit-taking, sideways volatility |
| **Markdown** | Mid to late contraction | Panic selling, rapid decline |

### Defensive vs Offensive Stocks

**Defensive (Recession-Resistant):**

| Sector | Tickers | Rationale |
|--------|---------|-----------|
| Consumer Goods | ICBP, INDF, UNVR | Essential daily needs |
| Finance (Banking) | BBCA, BBRI, BMRI | Always needed |
| Healthcare | SILO, KLBF | Non-discretionary |
| Energy | PGAS, AKRA | Essential utilities |
| Telecom | TLKM, EXCL | Communication necessity |

**Offensive (Cyclicals — Expansion Phase):**

| Sector | Tickers | Rationale |
|--------|---------|-----------|
| Commodities | Coal, Metals, Oil, CPO | Industrial demand surge |
| Property | BSDE, CTRA, SMRA | Big-ticket purchases |
| Construction | WIKA, PTPP, ADHI | Infrastructure spending |
| Cement | INTP, SMGR | Building materials demand |
| Retail | MAPI, RALS | Discretionary spending |
| Automotive | ASII, AUTO | Big-ticket consumer goods |

### Rotation Transitions

| Transition | Action |
|-----------|--------|
| Late Recession → Early Recovery | Accumulate blue chips, then early-cycle industrials |
| Early Recovery → Expansion | Rotate into mid-cap cyclicals, maximize equity exposure |
| Late Expansion → Early Recession | Take profits on cyclicals, shift to defensive, raise cash |

### Indonesian Market Indicators

**Global:**
- **PMI**: >50 = expansion, <50 = contraction
- **Fed Balance Sheet**: Expansion = bullish, Tapering = bearish
- **Fed Rate**: Low = acceleration, High = deceleration

**Domestic:**
- **Trade Balance**: Surplus strengthens IDR, deficit weakens
- **IDR/USD**: Weak Rupiah hurts USD-debt companies
- **Inflation**: BI targets 3% ± 1%
- **BI Rate**: Needs ~3% spread vs Fed Rate to prevent outflow
- **Bond Yields**: High yields = money exits stocks for bonds

### Macroeconomic Asset Allocation

| Phase | Stocks | Fixed Growth | Alternatives |
|-------|--------|-------------|-------------|
| Recession | ~40% (defensive) | ~40% | ~20% (gold, FX) |
| Expansion | ~60% (include cyclicals) | ~25% | ~15% |

---

## Module 5: Trading Plan Template

Every position must have a plan before entry. Write to `memory/tickers/{TICKER}.md`:

```markdown
# {TICKER} — Trading Plan

**Date**: {YYYY-MM-DD}
**Category**: {Core / Value / Growth / Speculative}
**Timeframe**: {Swing / Position / Long-term}

## Thesis
{1-2 sentences: WHY this stock, what's the edge}

## Tier Alignment
- Flow: {ACCUMULATION / DISTRIBUTION / NEUTRAL}
- Narrative: {STRONG / MODERATE / WEAK}
- Technical: {bullish setup / neutral / bearish}
- Fundamental: {undervalued / fair / overvalued}, MoS: {X%}
- Conviction: {HIGH / MEDIUM / LOW}

## Plan
- **Entry zone**: {price range}
- **Position size**: {X% of portfolio} ({amount})
- **Stop loss**: {price} (-{X%} from entry)
- **Risk per trade**: {Rp amount} ({X%} of portfolio)
- **Target 1**: {price} (+{X%}) — sell {X%}
- **Target 2**: {price} (+{X%}) — sell {X%}
- **Target 3**: {price} (+{X%}) — sell remaining

## Invalidation
{What conditions would kill this thesis — be specific}

## Notes
{Additional context, key dates, things to watch}
```

---

## Module 6: Portfolio Review & Session Logging

### Review Cadence

**Daily (Quick Check):**
- Check stop loss levels — any triggered?
- Scan news/filings for held positions
- Check flow changes on key positions
- Update P&L in portfolio.md

**Weekly:**
- Review all open positions — thesis still intact?
- Check position sizing vs limits (50:30:10)
- Update watchlist — any triggers hit?
- Log weekly P&L, portfolio heat

**Monthly:**
- Full performance review (realized + unrealized)
- Sector allocation check
- Strategy assessment — what's working, what's not
- Update memory/MEMORY.md with key learnings

### Portfolio Health Red Flag

If portfolio stays flat or red while IHSG hits all-time highs → strategy needs fundamental overhaul. Not capturing market upside indicates misalignment.

### Watchlist Management

| Status | Criteria | Action |
|--------|----------|--------|
| **Watching** | Interesting thesis but not ready | Monitor for catalyst/flow/price trigger |
| **Ready** | Trigger conditions approaching | Prepare trading plan, set alerts |
| **Active** | Triggered, position open | Execute plan, monitor |
| **Removed** | Thesis broken or better opportunity | Document reason for removal |

Write to `memory/notes/watchlist.md`:

```markdown
## Watchlist

| Ticker | Status | Thesis | Trigger | Added |
|--------|--------|--------|---------|-------|
| BBCA | Ready | Rate cut beneficiary | Break above 10,000 with volume | 2025-01-15 |
| ADRO | Watching | Coal cycle + restructuring | Foreign accumulation signal | 2025-01-20 |
```

### Session Log Template

Write to `memory/sessions/{YYYY-MM-DD}.md`:

```markdown
# Session: {YYYY-MM-DD}

## Market Context
- IHSG: {level} ({change%})
- Key news: {1-2 headlines}

## Actions Taken
- {action 1}
- {action 2}

## Positions Updated
| Ticker | Action | Price | Notes |
|--------|--------|-------|-------|
| ... | ... | ... | ... |

## Watchlist Changes
- Added: {tickers + reason}
- Removed: {tickers + reason}
- Triggered: {tickers}

## Key Observations
- {insight 1}
- {insight 2}

## Tomorrow's Plan
- {what to check/do next session}
```

### Profit Realization

- After significant gains (>50%), realize some in cash
- Continuous "portfolio rolling" without enjoying profits leads to burnout
- Periodically withdraw gains to improve quality of life — makes trading meaningful
