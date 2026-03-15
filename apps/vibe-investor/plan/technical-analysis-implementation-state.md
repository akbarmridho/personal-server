# Technical Analysis Implementation State

## Snapshot

- Date: `2026-03-15`
- Scope: `apps/vibe-investor/.opencode-config/skills/technical-analysis`
- Status: core contract and first script simplification pass are done; remaining work is backtest realism and separate-state expansion

## Remaining Work

### 1. Add `60m` liquidity gating

Still needed:

- minimum intraday data-quality threshold
- fallback behavior when intraday timing is too weak
- consistent use in live TA and backtest replay
- action downgrade path:
  - daily-only timing
  - or `WAIT` when tradability is too weak

This is the next implementation step and should be treated as a prerequisite for credible backtesting.

### 2. Define the simple baseline rule specs

Still needed:

- trend plus pullback
- breakout plus volume
- range-reclaim

These need concrete deterministic entry, invalidation, exit, and RR rules.

### 3. Define corporate-action-aware backtest behavior

Still needed:

- required `corp_actions[]` handling for backtests
- replay behavior around splits and ex-dividend windows
- return and invalidation treatment across event windows

### 4. Start the backtest engine

Still needed:

- rule replay engine
- execution assumptions tied to IDX mechanics
- baseline comparison harness
- doctrine audit metrics

## Script-Level Scope

The next script work should stay focused on:

- `60m` liquidity gating
- corporate-action-aware replay behavior
- backtest and comparison tooling

Do not expand `build_ta_context.py` with broad new doctrine layers.

## Skill-Level Scope

Future skill/doc edits should preserve the narrowed runtime:

- structure and trend
- support/resistance and location
- daily thesis plus `60m` timing
- lean MA regime
- trigger, confirmation, invalidation, and risk

Backtest-specific mechanics should stay in the replay and evaluation layer, not get pushed back into prompt bloat.

## Active Next Step

Implement `60m` liquidity gating in the TA scripts so intraday timing can be downgraded to daily-only or `WAIT` before backtest work proceeds.

## Guardrails

- keep the core stack structure-first and risk-first
- keep `ta_context` and chart generation separate
- keep Wyckoff narrow in decision authority even though its history is now integrated into the default TA pipeline
- do not re-expand the core skill with removed doctrine layers
