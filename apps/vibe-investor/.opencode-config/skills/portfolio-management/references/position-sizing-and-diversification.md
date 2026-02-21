# Position Sizing And Diversification

## Objective

Size positions using risk-first math, enforce diversification constraints, and prevent hidden concentration.

## Diversification By Capital Size

| Capital Range | Max Stocks | Allocation |
|---------------|------------|------------|
| < Rp 100M | 5 | 2 core + 3 value |
| Rp 100M - 1B | 10 | 4 core + 6 value |
| > Rp 1B | 15 | 6 core + 9 value |

## The 50:30:10 Rule

| Rule | Constraint | Rationale |
|------|------------|-----------|
| 50% Minimum | >=50% of portfolio in stocks with MoS >30% | Keeps most capital in undervalued positions |
| 30% Maximum | No single stock >30% of portfolio | Prevents attachment and concentration |
| 10% Maximum | Speculative/high-risk stocks <=10% total | Contains downside from risky bets |
| Sector Limit | <=2 stocks per sector | Enforces true diversification |

## Correlation-Aware Diversification (IDX Practical)

Diversification quality is driven by co-movement, not ticker count.

- Same-theme IDX names can move together during stress, even across subsectors.
- Treat correlation as a sizing modifier, not a hard include/exclude filter.

Sizing adjustments:

- Corr > 0.75 with an existing large holding: reduce target size or skip.
- Corr 0.40-0.75: allow with reduced size and explicit portfolio role.
- Corr < 0.40: strongest diversification benefit.
- In broad risk-off periods, assume correlations rise toward 1.0 and increase cash buffer.

## Liquidity-Based Sizing (Exit First)

Weekly-monthly positions must assume exits can be required in days. Size for the exit you might need, not the entry you want.

ADTV sizing anchor:

| Position size vs ADTV | Liquidity risk |
|------------------------|----------------|
| ≤ 1% of ADTV | Low |
| 1-5% of ADTV | Medium (needs staged exits) |
| > 5% of ADTV | High (assume slippage + long exit time) |

If size is too large relative to liquidity, prefer smaller size, staged exits, or skip.

## 1% Risk Rule (Per Trade)

```text
Position Size = (Portfolio x 1%) / (Entry Price - Stop Loss)
```

- Max portfolio heat: 5-6% total open risk.
- Conviction scaling: high conviction 1.5%, low conviction 0.5%.

## Hard-Loss Fallback (When Invalidation Is Ambiguous)

Primary stop should come from thesis/structure invalidation. If no clean invalidation level exists, enforce a hard-loss cap.

- Default fallback cap: 7-8% from entry.
- If volatility/liquidity is unusually high, reduce position size instead of widening risk.
- Never let fallback cap override a tighter, higher-quality technical invalidation.

## Implementation Note

Enforcement: agent workflow during New Position Entry and Weekly Review workflows (see SKILL.md). Deterministic checks: position weight vs 30% cap, portfolio heat sum, correlation from `fetch-ohlcv`, ADTV from tool data, 50:30:10 compliance from memory state. Triggers health flags PM-W01 through PM-W07 when breached.
