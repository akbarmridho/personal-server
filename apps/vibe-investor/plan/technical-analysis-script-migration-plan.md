# Technical Analysis Script Migration Plan

## Purpose

This file records the script migration status after the first refactor pass and isolates the remaining script work.

It is no longer a pre-migration planning document.

## Completed Script Migration Work

The first script migration pass is already done.

### `build_ta_context.py`

Completed:

- moved to the new packet structure
- removed `fib_context`
- removed `above_sma100`
- removed `informed_money`
- aligned baseline MA posture to:
  - `EMA21`
  - `SMA50`
  - `SMA200`
- made divergence non-baseline
- aligned red-flag IDs and packet enums
- kept `wyckoff_history` as `[]` in the packet because historical Wyckoff state belongs to a separate module
- kept chart artifacts out of `ta_context`

### `generate_ta_charts.py`

Completed:

- removed `daily_structure_fib`
- removed `SMA100` from the retained daily chart
- removed the old `detail` chart from the default contract
- retained the default artifact set around:
  - `daily_structure`
  - `intraday_structure`
  - `structure_events`
  - `trade_plan`
  - optional `vpvr_profile`
  - optional `imbalance_fvg`
- switched daily MA charting to:
  - `hybrid` default
  - `baseline` alternative
- localized daily S/R and trade-plan lines instead of full-width horizontals

### Shared helper work

Completed:

- moved adaptive MA selection into shared helpers
- upgraded adaptive MA selection to a respect-score model
- added `F19_MA_WHIPSAW`

## Current Script Reality

The scripts are already aligned with the current contract more than the old plan assumed.

The remaining script work is no longer about the original cleanup pass.
It is about doctrine freeze, venue realism, and separate-state expansion.

## Remaining Script Work

### 1. Do not expand non-core overlays in the core path

Current doctrine direction says:

- `SMC/ICT` is not part of the preferred core methodology
- divergence is not part of the preferred core methodology
- adaptive MA and `FVG / imbalance` are non-core unless justified later

So the next script phase should not add more dependence on those layers.

### 2. Add `60m` liquidity gating

The timing layer should not operate the same way on thin intraday data.

Needed work:

- define a minimum tradability / liquidity threshold for `60m`
- downgrade or disable timing authority when intraday data quality is too weak

### 3. Keep corporate-action handling out of ad hoc chart logic

Current runtime may keep `corp_actions[]` optional, but backtesting should not.

Needed work:

- define corporate-action-aware handling in replay / backtest logic
- avoid embedding fake fixes inside chart rendering or the current `ta_context` packet

### 4. Build Wyckoff as a separate module

The next real feature addition should not be more fields inside `build_ta_context.py`.

It should be a separate deterministic module that emits:

- current cycle state
- current Wyckoff phase
- confidence
- maturity
- recent phase history

This should follow:

- `wyckoff-historical-state-design.md`
- `wyckoff-research-gpt.md` as primary design input

### 5. Optional cleanup after doctrine freeze

After the docs are frozen, decide whether to:

- disable or remove `smc` from ordinary runtime script paths
- disable or remove divergence from ordinary runtime script paths
- simplify optional overlay interfaces to match the frozen doctrine

## What This File Should Not Do

This file should not re-open already settled contract questions.

Those are now owned by:

- `technical-analysis-core-contract-decisions.md`
- `technical-analysis-next-steps-summary.md`
- the live skill references
