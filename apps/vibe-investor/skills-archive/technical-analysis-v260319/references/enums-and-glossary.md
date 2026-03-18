# Enums And Glossary

## Objective

Single source of truth for shared enum labels used across runtime references.

## Purpose Mode

- `INITIAL`
- `UPDATE`
- `POSTMORTEM`

## State And Regime

- `state`: `balance`, `imbalance`
- `regime`: `trend_continuation`, `range_rotation`, `potential_reversal`, `no_trade`
- `trend_bias`: `bullish`, `bearish`, `neutral`

## Thesis Status

- `intact`
- `improving`
- `degrading`
- `invalidated`

## Review Reason

- `routine`
- `contradiction`
- `level_break`
- `regime_change`
- `trigger_failure`

## Wyckoff

- `cycle_phase`: `accumulation`, `markup`, `distribution`, `markdown`, `unclear`
- `schematic_phase`: `A`, `B`, `C`, `D`, `E`, `unclear`, `not_applicable`
- `maturity`: `fresh`, `maturing`, `mature`, `degrading`

## Structure Status

- `trend_intact`
- `range_intact`
- `transitioning`
- `damaged`
- `unclear`

## Setup IDs

- `S1` breakout and retest continuation
- `S2` pullback to demand in intact uptrend
- `S3` sweep and reclaim reversal
- `S4` range edge rotation
- `S5` Wyckoff spring with reclaim
- `NO_VALID_SETUP`

## Actions

- `BUY`
- `HOLD`
- `WAIT`
- `EXIT`

## Trigger State

- `not_triggered`
- `watchlist_only`
- `triggered`
- `failed`

## Trigger Type

- `breakout_close`
- `retest_hold`
- `reclaim`
- `sweep_reclaim`
- `choch_bos_reversal`
- `range_edge_rejection`
- `spring_reclaim`
- `none`

## Confirmation State

- `confirmed`
- `mixed`
- `rejected`
- `not_applicable`

## Participation Quality

- `strong`
- `adequate`
- `weak`
- `contradictory`

## Location State

- `near_support_in_bullish_structure`
- `near_resistance_in_bearish_structure`
- `at_range_edge`
- `accepted_above_resistance`
- `accepted_below_support`
- `mid_range_noise`

## Liquidity Fields

- `sweep_event`: `none`, `eqh_swept`, `eql_swept`, `trendline_swept`, `swing_swept`
- `sweep_side`: `up`, `down`
- `sweep_outcome`: `accepted`, `rejected`, `unresolved`, `not_applicable`
- `path_state`: `external_to_internal`, `internal_to_external`, `unclear`

## Value-Area Acceptance

- `accepted_above_vah`
- `accepted_below_val`
- `probe_above_vah`
- `probe_below_val`
- `inside_value`
- `failed_acceptance_back_inside`
- `not_applicable`

## Breakout Quality

- `status`: `clean`, `adequate`, `stalling`, `failed`
- `base_quality`: `strong`, `adequate`, `weak`
- `market_context`: `supportive`, `neutral`, `adverse`

## Baseline MA Roles

- `support`
- `resistance`
- `noise`

## Adaptive MA

- selected period is stored in `daily_thesis.adaptive_ma.period`

## Risk Status

- `valid`
- `insufficient_rr`
- `poor_location`
- `no_clear_invalidation`
- `no_clear_path`
- `wait`

## Red-Flag Severity

- `low`
- `medium`
- `high`
- `critical`
