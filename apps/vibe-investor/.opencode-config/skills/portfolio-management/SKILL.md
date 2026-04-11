---
name: portfolio-management
description: Internal trading-desk and portfolio operations subsystem for IDX equities, including desk-check reviews, position sizing, trading plans, watchlist process, and portfolio discipline routines.
---

## How To Use This Skill

1. Classify the request by workflow type (entry, desk-check, deep-review, exit, rebalance).
2. Resolve reference files for the selected workflow.
3. Read references before running the workflow.

Tool source of truth: `portfolio_state` for live holdings/cash/equity, `portfolio_trade_history` for trade rows and realized analytics, `portfolio_symbol_trade_journey` for symbol-level lifecycle, `get_state` for frontmatter lookup and derived portfolio-monitor state. Symbol memory is the durable operating plan, not the live ledger.

## Core Doctrine

- Protect capital and deploy capital with equal weight. Express through sizing, hard rails, and `regime_aggression`.
- Portfolio target: 4-6 positions, 8 absolute max. Concentrated book, not a diversified fund.
- Risk budgets before target weights: `risk_per_trade`, `portfolio_heat`, and hard caps are first-class controls.
- Liquidity-aware sizing: exits must remain feasible under stress.
- Regime-sensitive aggression: weaker market = lower aggression, slower adds, more cash.
- Review process quality separately from outcome.
- PM does not own entry decisions — the human decides whether to enter. PM owns portfolio-level sizing constraints, de-risking rails, and hard safety rails.
- PM does not own symbol-level exits. It owns portfolio-level sizing constraints, de-risking rails, and hard safety rails.
- Consume TA-owned invalidation; do not redefine chart-level TP rules.
- Durable symbol plan is the operating plan. Live holdings/P&L live in portfolio tools.

## Role in Synthesis

Portfolio management provides **constraint math and risk context** for the parent synthesis:

- Portfolio heat, concentration, and liquidity constraints
- Regime aggression from IHSG context
- Maximum position size available
- Hard rails that block action regardless of thesis quality
- Sizing math when the human decides to act (human picks conviction bucket, PM applies mechanical caps)

PM does not produce buy/sell recommendations. It tells the human "here's how much room you have and what the risk math looks like."

## Health Flags

`get_state` computes W01, W02, W10 deterministically. The rest are agent-checked during desk-check.

| Flag | Meaning | Severity |
|------|---------|----------|
| `PM-W01` | Single position exceeds 25% weight | `HIGH` |
| `PM-W02` | Speculative allocation exceeds 20% | `HIGH` |
| `PM-W04` | Sector limit breached (>2 per sector) | `MEDIUM` |
| `PM-W05` | Portfolio heat exceeds 10% (warning; hard block at 15% per main prompt) | `HIGH` |
| `PM-W06` | Correlation clustering (corr > 0.75) between large holdings | `MEDIUM` |
| `PM-W07` | Position size exceeds 5% of ADTV | `HIGH` |
| `PM-W08` | Portfolio flat/red while IHSG at new highs | `HIGH` |
| `PM-W09` | Multiple leaders invalidated in same window | `HIGH` |
| `PM-W10` | Thesis stale (no review within cadence) | `MEDIUM` |
| `PM-W11` | Cash ratio below IHSG cash target | `HIGH` |

## Portfolio Constraints Contract

```yaml
portfolio_constraints:
  heat_budget_remaining_pct: 5.0
  max_new_position_size_pct: 15.0
  regime_aggression: 0.8
  cash_target_status: above
  concentration_flags: []
  hard_rails_triggered: []
```

- `max_new_position_size_pct`: caps from concentration, correlation, liquidity, theme pressure.
- `regime_aggression` (0.4-1.5): caps from IHSG regime, breadth, beta, cash shortfall.
- `hard_rails_triggered`: binary stops only — `portfolio_heat_breach`, `single_position_cap_breach`, `thesis_invalidated`, `very_low_liquidity`, `pilot_slot_limit`.

## Sizing

- `risk_per_trade`: default 2% of equity. High conviction 3%, low conviction 1%.
- `portfolio_heat`: operating target 10-12% total open risk. Hard block at 15% (main prompt).
- `final_size_pct = min(base_size_pct, max_new_position_size_pct) * regime_aggression`.
- Hard-loss fallback: 7-8% from entry when no clean TA invalidation exists. Reduce size instead of widening risk.
- Holding mode changes posture, not hard limits: `TACTICAL` (smallest, fastest trim), `HYBRID` (middle), `THESIS` (most patience).

Position caps:

| Rule | Constraint |
|------|------------|
| Single position | Max 25% of portfolio |
| Speculative total | Max 20% of portfolio |
| Sector | Max 2 stocks per sector |

Concentration checks: correlation > 0.75 with large holding → compress sharply. Theme/cluster crowding → compress and flag. Liquidity: >5% of ADTV → hard rail; 1-5% → staged exits.

## Regime Aggression

Resolve before any new long. Evidence: IHSG OHLCV + leader basket from `get_state`.

| IHSG state | Base | Improving breadth | Deteriorating breadth |
|------------|------|-------------------|-----------------------|
| Above all key MAs, healthy | 1.2 | 1.5 | 1.0 |
| Above SMA50, below EMA21 | 0.8 | 1.0 | 0.7 |
| Below SMA50, above SMA200 | 0.5 | 0.7 | 0.4 |
| Below SMA200 | 0.4 | 0.5 | 0.4 |

Floor is 0.4. Adjust for leader health, breakdown clustering, rate of change, and portfolio-weighted beta. If deteriorating, reduce before damage is fully expressed.

IHSG cash overlay (soft budget, not hard wall):

- Below EMA21: target 30% cash (escalated 40%)
- Below SMA50: target 50% cash (escalated 60%)
- Below SMA200: target 70% cash (escalated 80%)

Escalate +10pp when multiple health warnings, clustering breakdowns, or negative news flow. Pilots (≤ 5%) always allowed regardless of cash target.

## Pilot Entry

Use when the human decides to take a pilot position.

- Base size: 3% of equity, capped at 5% before `regime_aggression`.
- Gates: thesis quality ≥ MEDIUM, evidence grade 1-3, TA invalidation exists, `regime_aggression >= 0.4`, liquidity acceptable, no hard rail triggered.
- No harvest on pilots. First action is "add to STARTER" or "exit."
- Escalation: when price holds above stop for 5 sessions + narrative intact, flag to human that add to STARTER is available. Human decides.
- Expiry: no progress for 3+ desk-checks → flag to human for decision (exit or hold with fresh rationale).
- Max 2 active pilots.

## Entry, Exit, Rebalance

Entry: prefer drawdowns when thesis intact. Do not average down after thesis break. Pyramid only when prior tranche is green and structure valid.

Exit: PM consumes symbol-level exits and applies portfolio hard rails. Exit source must be documented (symbol baseline vs portfolio rail). Post-exit: evaluate process, not outcome.

Rebalance: quarterly baseline. Drift trigger >20%. Event trigger on thesis break, governance risk, or liquidity deterioration. Skip tiny trades with no material risk impact.

## References

| File | Topics |
|------|--------|
| [trading-plan-template.md](references/trading-plan-template.md) | Per-symbol plan structure, trade classification, underwriting fields, invalidation, winner management |
| [review-watchlist-and-review-logging.md](references/review-watchlist-and-review-logging.md) | Review cadence, watchlist management, benchmark discipline, re-entry, postmortem loop |

## Common Workflows

### New Position Entry

1. Resolve `regime_aggression`. Check IHSG cash target vs current cash ratio.
2. Choose `entry_type` (FULL or PILOT). Validate sizing against constraints.
3. Load `trading-plan-template.md`, fill required fields, write to symbol memory.

### Desk Check

1. Load `review-watchlist-and-review-logging.md`. Call `portfolio_state`. If missing, stop.
2. For each position: check thesis health, stops, scenarios, sizing compliance, review cadence.
3. For READY symbols: track price movement, thesis changes, and missed moves for opportunity-cost ledger.
4. Check portfolio-level: heat, concentration, regime, cash target, opportunity cost.
5. Return `portfolio_constraints`, findings, and items requiring human attention to parent workflow.

### Deep Review

1. Full holdings review + stale/neglected name resurfacing + system quality audit.
2. Check realized vs unrealized mix, style drift, process debt, best-ideas density.
3. Return findings and cleanup proposals.

### Position Exit

1. Document exit source (symbol baseline vs portfolio rail). Update symbol memory. Evaluate process.

### Rebalance

1. Check drift and event triggers. Validate replacement correlation. Skip immaterial trades.

## Execution Defaults

- Portfolio tools first. Temporary scripts in `work/` only for one-off calculations.
- Write concrete outputs to memory, not only narrative answers.
- Constraints are a separate layer after symbol analysis: PM caps size and reduces aggression but does not redefine the symbol-level exit engine.
- Flag health warnings when detected during any workflow.
