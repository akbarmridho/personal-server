# Enums And Glossary

## Objective

Single source of truth for shared statuses and enum labels used across references and reports.

## Modes

- `INITIAL`
- `UPDATE`
- `THESIS_REVIEW`
- `POSTMORTEM`

## Lens

- `UNIFIED`
- `CLASSICAL_TA`
- `WYCKOFF`
- `SMC_ICT_LIGHT`

## State And Regime

- `state`: `balance`, `imbalance`
- `regime`: `trend_continuation`, `range_rotation`, `potential_reversal`, `no_trade`
- `trend_bias`: `bullish`, `bearish`, `neutral`

## Wyckoff Context

- `accumulation`
- `markup`
- `distribution`
- `markdown`
- `unclear`

## Structure Status

- `no_signal`
- `choch_only`
- `choch_plus_bos_confirmed`

## Divergence Status

- `no_divergence`
- `divergence_unconfirmed`
- `divergence_confirmed`

## Setup IDs

- `S1` breakout and retest continuation
- `S2` pullback to demand in intact uptrend
- `S3` sweep and reclaim reversal
- `S4` range edge rotation
- `S5` cup-and-handle continuation
- `S6` Wyckoff spring with reclaim
- `NO_VALID_SETUP`

## Actions

- `BUY`
- `HOLD`
- `WAIT`
- `EXIT`

## IB States

- `accepted_above_ibh`
- `accepted_below_ibl`
- `failed_break_above_ibh`
- `failed_break_below_ibl`
- `inside_ib_range`

## Liquidity Fields

- `sweep_event`: `none`, `eqh_swept`, `eql_swept`, `trendline_swept`, `swing_swept`
- `sweep_outcome`: `accepted`, `rejected`, `unresolved`
- `liquidity_path`: `external_to_internal`, `internal_to_external`, `unclear`

## Volume-Profile Acceptance

- `accepted_above_vah`
- `accepted_below_val`
- `probe_above_vah`
- `probe_below_val`
- `inside_value`

## Imbalance Types And Mitigation

- `imbalance_type`: `FVG`, `VOLUME_IMBALANCE`, `OPENING_GAP`, `IFVG`
- `mitigation_state`: `unmitigated`, `partially_mitigated`, `fully_mitigated`

## Thesis Status

- `intact`
- `improving`
- `degrading`
- `invalidated`

## Red-Flag Severity

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`
