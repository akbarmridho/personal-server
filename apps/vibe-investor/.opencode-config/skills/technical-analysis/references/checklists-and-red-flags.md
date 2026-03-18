# Checklists And Red Flags

## Objective

Use this file as a validation layer.

It does not own the workflow order.

## Hard Mandatory Gates

1. `G1_MODE` purpose mode is explicit.
2. `G2_DATA` required data is present and usable.
3. `G3_STATE` daily state and regime are classifiable enough to proceed.
4. `G4_LOCATION` price is at a meaningful area or the result is `WAIT`.
5. `G5_SETUP` exactly one setup family or `NO_VALID_SETUP` is selected.
6. `G6_TRIGGER` actionable decisions require a real trigger.
7. `G7_INVALIDATION` actionable decisions require explicit invalidation.
8. `G8_PATH` actionable decisions require a clear next-zone path.
9. `G9_RR` actionable decisions require acceptable reward-to-risk.
10. `G10_CONFLICTS` chart and numeric contradictions are resolved explicitly.
11. `G11_WAIT` unresolved decision-critical ambiguity defaults to `WAIT`.

## Conditional Gates

Activate only when relevant.

1. `C1_PRIOR_CONTEXT` `UPDATE` and `POSTMORTEM` include prior thesis context.
2. `C2_DELTA` `UPDATE` includes thesis status, review reason, and delta log.
3. `C3_POSTMORTEM` `POSTMORTEM` includes failure point and handling improvement.
4. `C4_BREAKOUT` breakout setups include breakout quality and follow-through.
5. `C5_VOLUME_PROFILE` VPVR usage includes POC, VAH, VAL, and acceptance state.
6. `C6_ADAPTIVE_MA` adaptive MA reporting includes period, justification, and chart mode when charting is used.

## Advisory Diagnostics

- Prefer `WAIT` over forcing a low-quality narrative.
- Downgrade confidence when `15m` timing conflicts with the daily thesis.
- Treat mid-range noise as a weak location state.
- Treat weak follow-through as a veto or delay, not as proof.

## Red Flags

### Core Red Flags

- `F1_STRUCTURE_BREAK`
- `F2_DISTRIBUTION`
- `F3_WEAK_BREAKOUT`
- `F4_LEVEL_EXHAUSTION`
- `F5_MARKET_CONTEXT_MISMATCH`
- `F6_MA_BREAKDOWN`
- `F7_POSITION_RISK`
- `F8_NO_NEARBY_SUPPORT`
- `F9_UNCONFIRMED_STRUCTURE_SHIFT`
- `F10_NO_NEXT_ZONE_PATH`
- `F11_LIQUIDITY_MAP_MISSING`
- `F12_BREAKOUT_STALLING`

### Red-Flag Severity Guidance

- `F6_MA_BREAKDOWN` is `medium` when price loses `21EMA` only
- `F6_MA_BREAKDOWN` is `high` when price loses `50SMA`
- `F6_MA_BREAKDOWN` is `high` when price is below both `21EMA` and `50SMA`
- `F3_WEAK_BREAKOUT` should be treated more severely when continuation structure is no longer intact

### Conditional Red Flags

- `F13_VOLUME_CONFLUENCE_WEAK`
- `F14_BREAKOUT_FILTER_WEAK`
- `F15_MA_WHIPSAW`

## Severity

- `low`
- `medium`
- `high`
- `critical`

## Trace Requirements

Every red flag should include:

- `flag_id`
- `severity`
- `why`

Also include an overall risk summary with one short rationale.
