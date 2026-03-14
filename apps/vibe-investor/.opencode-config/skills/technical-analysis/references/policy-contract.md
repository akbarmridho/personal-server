# Policy Contract

## Objective

This file is the runtime decision contract for technical analysis.

It defines:

- required inputs
- allowed actions
- allowed setup families
- uncertainty handling
- escalation recording
- minimum decision outputs
- the concrete future `ta_context` schema

## Action Space

Allowed final actions:

- `BUY`
- `HOLD`
- `WAIT`
- `EXIT`

This is a long-only action space.

## Setup Space

Allowed setup families:

- `S1` breakout and retest continuation
- `S2` pullback to demand in intact uptrend
- `S3` sweep and reclaim reversal
- `S4` range edge rotation
- `S5` Wyckoff spring with reclaim
- `NO_VALID_SETUP`

## Required Runtime Inputs

The policy requires:

- one `ta_context` packet matching the schema in this file
- current position state
- prior thesis snapshot for `UPDATE` and `POSTMORTEM`

If a required input is missing, stop and report missing dependency.

## Decision Rules

### `BUY`

`BUY` is allowed only when all are true:

- `analysis.position_state = flat`
- `setup.primary_setup != NO_VALID_SETUP`
- location is meaningful
- trigger is active
- confirmation is not rejected
- invalidation is explicit
- next-zone path exists
- `risk_map.best_rr >= risk_map.min_rr_required`

### `HOLD`

`HOLD` is allowed only when all are true:

- `analysis.position_state = long`
- thesis remains valid
- no exit trigger is active
- no critical contradiction requires immediate reduction or exit

### `WAIT`

`WAIT` is the default action when any decision prerequisite is unresolved.

Common `WAIT` cases:

- state is unclear
- location is poor
- `NO_VALID_SETUP`
- trigger is absent
- confirmation is mixed
- invalidation is unclear
- next-zone path is unclear
- reward-to-risk is below threshold

### `EXIT`

`EXIT` is allowed only when all are true:

- `analysis.position_state = long`
- invalidation has failed, or
- thesis is invalidated, or
- trigger failure plus confirmation breakdown materially damages the thesis, or
- critical red flag changes the action from `HOLD` to `EXIT`

## Uncertainty Handling

When evidence is mixed:

- prefer `WAIT`
- lower confidence
- state the unresolved contradiction
- escalate only if an overlay can resolve a decision-relevant question

## Escalation Contract

If `analysis.depth_mode = ESCALATED`, the decision record must include:

- `was_escalated`
- `trigger_class`
- `reason_code`
- `reason_text`
- `overlay_records[]`
- `changed_decision_surface[]`

Allowed `reason_code` values:

- `user_requested_deeper_analysis`
- `reversal_interpretation_needed`
- `trap_or_sweep_interpretation_needed`
- `default_read_conflicted`
- `thesis_degradation_review`
- `postmortem_forensic_review`
- `adaptive_ma_needed`
- `divergence_check_needed`
- `imbalance_check_needed`
- `smc_ict_needed`

## Minimum Final Decision Output

Every final decision must include:

- `purpose_mode`
- `depth_mode`
- `action`
- `bias`
- `setup_family`
- `key_active_level`
- `trigger_status`
- `invalidation`
- `next_trigger`
- `confidence`
- `monitoring_triggers`
- `chart_artifact_refs`

Conditional output:

- prior thesis delta for `UPDATE`
- postmortem findings for `POSTMORTEM`
- overlay sections only when active

## `ta_context` Packet

The future deterministic packet is a compact structured state for AI policy and backtesting.

Top-level shape:

```json
{
  "analysis": {},
  "prior_thesis": {},
  "daily_thesis": {},
  "intraday_timing": {},
  "location": {},
  "setup": {},
  "trigger_confirmation": {},
  "risk_map": {},
  "escalation": {},
  "red_flags": []
}
```

Packet rules:

- required top-level sections must always be present except `prior_thesis`
- `prior_thesis` is required for `UPDATE` and `POSTMORTEM`
- omit inactive optional fields instead of filling them with placeholder nulls
- keep field names stable and machine-readable

## Schema Appendix

### A. `analysis`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `symbol` | string | yes | uppercase ticker, example `BBCA` |
| `as_of_date` | string | yes | `YYYY-MM-DD` |
| `purpose_mode` | string | yes | `INITIAL`, `UPDATE`, `POSTMORTEM` |
| `depth_mode` | string | yes | `DEFAULT`, `ESCALATED` |
| `intent` | string | yes | `entry`, `maintenance`, `postmortem` |
| `position_state` | string | yes | `flat`, `long` |
| `daily_timeframe` | string | yes | `1d` |
| `intraday_timeframe` | string | yes | `60m` |
| `min_rr_required` | number | yes | positive decimal threshold |
| `requested_overlays` | string[] | no | `divergence`, `adaptive_ma`, `imbalance`, `smc_ict` |
| `thesis_status` | string | conditional | `intact`, `improving`, `degrading`, `invalidated`; required for `UPDATE` |
| `review_reason` | string | conditional | `routine`, `contradiction`, `level_break`, `regime_change`, `trigger_failure`; required for `UPDATE` |

### B. `prior_thesis`

Required in:

- `UPDATE`
- `POSTMORTEM`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `reference` | string | yes | prior report path or run id |
| `prior_action` | string | yes | `BUY`, `HOLD`, `WAIT`, `EXIT` |
| `prior_bias` | string | yes | `bullish`, `bearish`, `neutral` |
| `prior_setup_family` | string | yes | `S1`, `S2`, `S3`, `S4`, `S5`, `NO_VALID_SETUP` |
| `thesis_summary` | string[] | yes | 1 to 3 short bullets |
| `invalidation_level` | number | yes | prior hard invalidation |
| `key_levels` | number[] | yes | prior active levels |
| `prior_thesis_status` | string | no | `intact`, `improving`, `degrading`, `invalidated` |

### C. `daily_thesis`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `state` | string | yes | `balance`, `imbalance` |
| `regime` | string | yes | `trend_continuation`, `range_rotation`, `potential_reversal`, `no_trade` |
| `trend_bias` | string | yes | `bullish`, `bearish`, `neutral` |
| `structure_status` | string | yes | `trend_intact`, `range_intact`, `transitioning`, `damaged`, `unclear` |
| `current_wyckoff_phase` | string | yes | `accumulation`, `markup`, `distribution`, `markdown`, `unclear` |
| `wyckoff_current_confidence` | integer | yes | `0` to `100` |
| `wyckoff_current_maturity` | string | yes | `fresh`, `maturing`, `mature`, `degrading` |
| `wyckoff_history` | object[] | yes | last `3` to `8` segments, schema in section `L` |
| `baseline_ma_posture` | object | yes | schema in section `J` |
| `adaptive_ma` | object | no | schema in section `K`; include only when active |

### D. `intraday_timing`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `timing_bias` | string | yes | `bullish`, `bearish`, `neutral` |
| `intraday_structure_state` | string | yes | `aligned`, `conflicted`, `counter_thesis`, `unclear` |
| `acceptance_state` | string | yes | `accepted_above_level`, `accepted_below_level`, `reclaimed_level`, `rejected_at_level`, `inside_noise`, `unclear` |
| `follow_through_state` | string | yes | `strong`, `adequate`, `weak`, `failing`, `unclear` |
| `timing_window_state` | string | yes | `active`, `developing`, `late`, `stale`, `unclear` |

### E. `location`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `location_state` | string | yes | `near_support_in_bullish_structure`, `near_resistance_in_bearish_structure`, `at_range_edge`, `accepted_above_resistance`, `accepted_below_support`, `mid_range_noise` |
| `support_zones` | object[] | yes | schema in section `M` |
| `resistance_zones` | object[] | yes | schema in section `M` |
| `value_area` | object | yes | schema in section `N` |
| `liquidity_map` | object | yes | schema in section `O` |
| `time_levels` | object | yes | `daily_open`, `weekly_open`, `monthly_open` |
| `round_levels` | object[] | no | schema in section `P` |

### F. `setup`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `primary_setup` | string | yes | `S1`, `S2`, `S3`, `S4`, `S5`, `NO_VALID_SETUP` |
| `candidate_setups` | string[] | yes | one or more allowed setup families |
| `setup_side` | string | yes | `long`, `neutral` |
| `setup_validity` | string | yes | `valid`, `watchlist_only`, `invalid` |
| `setup_drivers` | string[] | yes | short machine-readable reasons |

### G. `trigger_confirmation`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `trigger_state` | string | yes | `not_triggered`, `watchlist_only`, `triggered`, `failed` |
| `trigger_type` | string | yes | `breakout_close`, `retest_hold`, `reclaim`, `sweep_reclaim`, `choch_bos_reversal`, `range_edge_rejection`, `spring_reclaim`, `none` |
| `trigger_level` | number | conditional | required when `trigger_type != none` |
| `trigger_ts` | string | conditional | ISO timestamp when triggered |
| `confirmation_state` | string | yes | `confirmed`, `mixed`, `rejected`, `not_applicable` |
| `participation_quality` | string | yes | `strong`, `adequate`, `weak`, `contradictory` |
| `value_acceptance_state` | string | yes | `accepted_above_vah`, `accepted_below_val`, `probe_above_vah`, `probe_below_val`, `inside_value`, `failed_acceptance_back_inside`, `not_applicable` |
| `latest_structure_event` | object | no | schema in section `Q` |
| `breakout_quality` | object | no | schema in section `R`; include only for breakout cases |

### H. `risk_map`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `actionable` | boolean | yes | whether the packet supports action now |
| `entry_zone` | object | conditional | schema in section `M`; required when actionable or watchlist |
| `invalidation_level` | number | conditional | required when actionable or watchlist |
| `stop_level` | number | conditional | required when actionable |
| `next_zone_target` | number | conditional | required when actionable |
| `target_ladder` | number[] | no | ordered targets |
| `rr_by_target` | number[] | no | ordered RR values aligned to `target_ladder` |
| `best_rr` | number | conditional | required when actionable |
| `min_rr_required` | number | yes | copied from policy input for easy audit |
| `risk_status` | string | yes | `valid`, `insufficient_rr`, `no_clear_invalidation`, `no_clear_path`, `wait` |
| `stale_setup_condition` | string | yes | short machine-readable expiry condition |

### I. `escalation`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `was_escalated` | boolean | yes | `true` or `false` |
| `trigger_class` | string | conditional | `explicit`, `context`; required when escalated |
| `reason_code` | string | conditional | required when escalated |
| `reason_text` | string | conditional | required when escalated |
| `overlay_records` | object[] | no | schema in section `S` |
| `changed_decision_surface` | string[] | no | `action`, `confidence`, `invalidation`, `interpretation` |

### J. `baseline_ma_posture`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `above_ema21` | boolean | yes | baseline posture |
| `above_sma50` | boolean | yes | baseline posture |
| `above_sma200` | boolean | yes | baseline posture |
| `ema21_role` | string | yes | `support`, `resistance`, `noise` |
| `sma50_role` | string | yes | `support`, `resistance`, `noise` |
| `sma200_role` | string | yes | `support`, `resistance`, `noise` |

### K. `adaptive_ma`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `period` | integer | yes | selected MA period |
| `ma_type` | string | yes | `ema`, `sma` |
| `respect_score` | number | yes | symbol-specific respect measure |
| `role` | string | yes | `support`, `resistance`, `timing_refinement` |
| `justification` | string | yes | short reason for activation |

### L. `wyckoff_history[]`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `phase` | string | yes | `accumulation`, `markup`, `distribution`, `markdown`, `unclear` |
| `start_ts` | string | yes | ISO timestamp |
| `end_ts` | string | yes | ISO timestamp |
| `duration_bars` | integer | yes | positive count |
| `price_low` | number | yes | segment low |
| `price_high` | number | yes | segment high |
| `price_change_pct` | number | yes | segment percent change |
| `confidence` | integer | yes | `0` to `100` |
| `maturity` | string | yes | `fresh`, `maturing`, `mature`, `degrading` |
| `trend_strength` | string | yes | `weak`, `moderate`, `strong` |

### M. `zone`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `label` | string | yes | short identifier |
| `kind` | string | yes | `support`, `resistance`, `demand`, `supply`, `value`, `liquidity` |
| `low` | number | yes | zone floor |
| `high` | number | yes | zone ceiling |
| `mid` | number | yes | zone midpoint |
| `timeframe` | string | yes | `1d`, `60m` |
| `strength` | string | yes | `weak`, `moderate`, `strong` |
| `source` | string | yes | `horizontal`, `swing`, `vpvr`, `ma`, `liquidity`, `opening_level` |

### N. `value_area`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `poc` | number | yes | point of control |
| `vah` | number | yes | value area high |
| `val` | number | yes | value area low |
| `acceptance_state` | string | yes | `accepted_above_vah`, `accepted_below_val`, `probe_above_vah`, `probe_below_val`, `inside_value`, `failed_acceptance_back_inside` |
| `major_hvn` | number[] | no | major high-volume nodes |
| `major_lvn` | number[] | no | major low-volume nodes |

### O. `liquidity_map`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `current_draw` | number | no | next likely draw |
| `opposing_draw` | number | no | opposing liquidity |
| `last_sweep_type` | string | yes | `none`, `eqh_swept`, `eql_swept`, `trendline_swept`, `swing_swept` |
| `last_sweep_outcome` | string | yes | `accepted`, `rejected`, `unresolved`, `not_applicable` |
| `path_state` | string | yes | `external_to_internal`, `internal_to_external`, `unclear` |

### P. `round_level`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `price` | number | yes | round number |
| `label` | string | yes | example `round_above` |

### Q. `latest_structure_event`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `event_type` | string | yes | `CHOCH`, `BOS`, `RECLAIM`, `SWEEP`, `NONE` |
| `side` | string | yes | `up`, `down`, `neutral` |
| `level` | number | no | broken or reclaimed level |
| `timestamp` | string | no | ISO timestamp |
| `relevance` | string | yes | `setup_trigger`, `confirmation`, `warning`, `none` |

### R. `breakout_quality`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `status` | string | yes | `clean`, `adequate`, `stalling`, `failed` |
| `trigger_vol_ratio` | number | no | trigger bar volume ratio |
| `follow_through_close` | number | no | follow-through close |
| `base_quality` | string | yes | `strong`, `adequate`, `weak` |
| `market_context` | string | yes | `supportive`, `neutral`, `adverse` |

### S. `overlay_record`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `overlay` | string | yes | `divergence`, `adaptive_ma`, `imbalance`, `smc_ict` |
| `reason_code` | string | yes | use escalation reason codes |
| `question` | string | yes | what the overlay was resolving |
| `outcome` | string | yes | `confirmed_default_read`, `refined_entry`, `changed_confidence`, `changed_invalidation`, `changed_action` |

### T. `red_flags[]`

| Field | Type | Required | Allowed values / notes |
|---|---|---:|---|
| `code` | string | yes | short machine-readable code |
| `severity` | string | yes | `low`, `medium`, `high`, `critical` |
| `summary` | string | yes | short explanation |
| `evidence_refs` | string[] | no | evidence ids or artifact refs |
