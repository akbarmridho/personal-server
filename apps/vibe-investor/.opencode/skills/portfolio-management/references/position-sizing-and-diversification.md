# Position Sizing And Diversification

## Diversification By Capital Size

| Capital Range | Max Stocks | Allocation |
|--------------|------------|-----------|
| < Rp 100M | 5 | 2 core + 3 value |
| Rp 100M - 1B | 10 | 4 core + 6 value |
| > Rp 1B | 15 | 6 core + 9 value |

## Stock Categories

| Category | Profile | Purpose |
|----------|---------|---------|
| Core | Large-cap blue chip, stable, mature | Wealth preservation, dividends |
| Value | Mid-cap, consistent growth, moderate risk | Portfolio growth, accumulation |
| Growth | High upside, high volatility, higher risk | Alpha generation (limited allocation) |

## The 50:30:10 Rule

| Rule | Constraint | Rationale |
|------|-----------|-----------|
| 50% Minimum | >=50% of portfolio in stocks with MoS >30% | Keeps most capital in undervalued positions |
| 30% Maximum | No single stock >30% of portfolio | Prevents attachment and concentration |
| 10% Maximum | Speculative/high-risk stocks <=10% total | Contains downside from risky bets |
| Sector Limit | <=2 stocks per sector | Enforces true diversification |

## Correlation-Aware Diversification (IDX Practical)

Diversification quality is driven by co-movement, not ticker count.

- Prioritize lower correlation of daily returns.
- Same-theme IDX names can move together during stress, even across subsectors.
- Treat correlation as a sizing modifier, not a hard include/exclude filter.

Sizing adjustments:

- Corr > 0.75 with an existing large holding: reduce target size or skip.
- Corr 0.40-0.75: allow with reduced size and explicit portfolio role.
- Corr < 0.40: strongest diversification benefit.
- In broad risk-off periods, assume correlations rise toward 1.0 and increase cash buffer.

## Liquidity-Based Sizing (Exit First)

Weekly-monthly positions must assume exits can be required in days.

Use this rulebook directly:

- [Liquidity three-board rule](liquidity-three-board-rule.md)

Practical guardrail: if size is too large relative to liquidity, prefer smaller size, staged exits, or skip.

## 1% Risk Rule (Per Trade)

For tactical entries:

```text
Position Size = (Portfolio x 1%) / (Entry Price - Stop Loss)
```

- Max portfolio heat: 5-6% total open risk.
- Conviction scaling guide: high conviction 1.5%, low conviction 0.5%.
