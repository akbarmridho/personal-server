# Flow Context Schema Draft

## Purpose

This document defines the first deterministic `flow_context` packet for the future `flow-analysis` skill.

The goal is:

- translate `idx-flow.html` into a compact machine-readable packet
- keep raw broker tables out of the LLM prompt
- preserve clear ownership boundaries with `technical-analysis`

This is an intermediate deterministic artifact, not the final human-facing report.

## Source Of Truth

This schema must stay anchored to:

- `idx-flow.html`
- `flow-analysis-skill-plan.md`
- `technical-analysis/SKILL.md`

Interpretation rule:

- `idx-flow.html` owns broker-flow doctrine
- `technical-analysis` owns chart structure and execution doctrine
- `flow_context` should express broker-flow state only, plus a narrow integration hook

## Ownership Boundary

### `flow-analysis` Owns

- gross-versus-net reading discipline
- broker participation and sponsor-quality features
- accumulation versus distribution lean
- concentration and persistence features
- flow-price relationship features
- trust and reliability features
- early warning / early turn / confirm / unclear classification

### `flow-analysis` Must Not Own

- support and resistance mapping
- BOS / CHOCH / HHHL / LHLL structure logic
- setup family selection
- trigger and confirmation from price action
- stop placement
- target ladder
- final trade action

Those remain under `technical-analysis`.

## Raw Inputs

Required:

1. normalized daily broker-flow series
2. daily OHLCV
3. latest market-cap value from daily `soxclose`

Optional later:

4. imported TA regime label for integration comparison

## Output Shape

```json
{
  "analysis": {},
  "window": {},
  "core_metrics": {},
  "advanced_signals": {},
  "trust_regime": {},
  "baseline_verdict": {},
  "integration_hook": {},
  "monitoring": {}
}
```

## Top-Level Sections

### `analysis`

Purpose:

- identify the symbol and packet mode

Required fields:

- `symbol`: string
- `as_of_date`: `YYYY-MM-DD`
- `purpose_mode`: `INITIAL` | `UPDATE` | `POSTMORTEM`
- `window_mode`: `single_day` | `multi_day`
- `trading_days`: integer

### `window`

Purpose:

- define the actual observation window used by the deterministic layer

Required fields:

- `from`: `YYYY-MM-DD`
- `to`: `YYYY-MM-DD`
- `requested_trading_days`: integer
- `actual_trading_days`: integer
- `primary_window_trading_days`: `30`
- `trust_window_trading_days`: `60`
- `today_snapshot_included`: boolean
- `today_snapshot_ready_after_wib`: `"19:00"`

Rules:

- use `30` trading days as the primary active read for direction, sponsor behavior, and current state
- use `60` trading days as the slower trust and stability window for correlation and ticker usefulness
- if `60` days are unavailable, degrade trust quality instead of silently pretending the trust layer is equally stable

### `core_metrics`

Purpose:

- hold the primary directional and execution-quality features derived from the daily broker series

Required fields:

- `gross_read_note`: `gross_primary_net_secondary`
- `coverage_buy_pct`: number
- `coverage_sell_pct`: number
- `net_flow_total_value`: number
- `net_flow_recent_value`: number
- `cadi_value`: number
- `cadi_trend`: `rising` | `falling` | `flat`
- `cadi_slope_strength`: `strong_positive` | `positive` | `neutral` | `negative` | `strong_negative`
- `buy_avg_vs_vwap_pct`: number
- `sell_avg_vs_vwap_pct`: number
- `buy_execution_quality`: `aggressive` | `constructive` | `neutral` | `passive`
- `sell_execution_quality`: `aggressive` | `constructive` | `neutral` | `passive`
- `bs_spread_pct`: number
- `bs_spread_trend`: `widening_buy_pressure` | `widening_sell_pressure` | `stable` | `mixed`
- `gvpr_buy_pct`: number
- `gvpr_sell_pct`: number
- `gvpr_pattern`: `buy_dominant` | `sell_dominant` | `balanced` | `mixed`
- `top_buyer_share_pct`: number
- `top_seller_share_pct`: number

Notes:

- this is the first layer that answers: who is accumulating, who is distributing, and are they paying up or getting favorable execution
- `coverage_*` is a first-class internal quality metric because top-25 broker data is truncated by design
- `MFI` is not part of the v1 deterministic packet until it has a defensible formula from the actual raw contract
- `Frequency` can be added later if it becomes stable and genuinely useful in the deterministic packet

### `advanced_signals`

Purpose:

- hold quality, trust, and lead-lag refinement features

Required fields:

- `persistence_score`: number
- `persistence_state`: `strong_buy_persistence` | `buy_persistence` | `mixed` | `sell_persistence` | `strong_sell_persistence`
- `buy_hhi`: number
- `sell_hhi`: number
- `concentration_asymmetry_state`: `buy_heavy` | `sell_heavy` | `balanced`
- `flow_price_correlation_spearman`: number
- `flow_price_correlation_state`: `strong` | `moderate` | `weak` | `minimal`
- `divergence_state`: `bullish_divergence` | `bearish_divergence` | `none` | `unclear`
- `wash_risk_pct`: number
- `wash_risk_state`: `low` | `moderate` | `high`
- `anomaly_risk_state`: `clean` | `watch` | `elevated`

Notes:

- these are trust filters, not standalone direction generators
- they should refine the lean, not replace it
- `HHI` and top-k participation are preferred over `Gini` in v1 because the broker universe is truncated to top-25 per side
- `SMT` is product-layer heuristic output, not the base deterministic truth for the first packet
- use the `60` day trust window for correlation and ticker-usefulness calculations; do not mix it with the `30` day active read

### `trust_regime`

Purpose:

- decide how much weight broker flow deserves on this ticker right now

Required fields:

- `liquidity_profile`: `high` | `medium` | `low` | `very_low`
- `market_cap_profile`: `large` | `mid` | `small` | `micro`
- `market_cap_value`: number
- `ticker_flow_usefulness`: `lead_capable` | `support_only` | `secondary` | `unreliable`
- `trust_level`: `high` | `medium` | `low`
- `trust_rationale`: string[]

Notes:

- derive `market_cap_value` from latest daily `soxclose`
- classify `market_cap_profile` using the `idx-flow.html` buckets:
  - `large`: `> Rp 10T`
  - `mid`: `Rp 1T - 10T`
  - `small`: `Rp 100B - 1T`
  - `micro`: `< Rp 100B`
- `trust_level` is not conviction
- a ticker can have a directional lean with low trust
- trust should primarily be driven by:
  - liquidity profile
  - market-cap profile
  - `60` day flow-price trust layer
  - coverage quality
  - anomaly / wash-risk discounts

### `baseline_verdict`

Purpose:

- expose the deterministic broker-flow lean without turning it into trade permission

Required fields:

- `verdict`: `ACCUMULATION` | `DISTRIBUTION` | `NEUTRAL`
- `conviction_pct`: number
- `sponsor_quality`: `strong` | `constructive` | `mixed` | `weak`
- `strongest_support_factors`: string[]
- `strongest_caution_factors`: string[]

Rules:

- this is a broker-flow lean only
- it must not map directly to `BUY` / `HOLD` / `WAIT` / `EXIT`

### `integration_hook`

Purpose:

- prepare the flow packet for parent synthesis with TA

Required fields:

- `timing_relation`: `lead` | `confirm` | `warning` | `unclear`
- `price_structure_alignment`: `aligned_bullish` | `aligned_bearish` | `flow_bullish_price_weaker` | `flow_bearish_price_stronger` | `mixed`
- `signal_role`: `confirmation` | `early_turn` | `early_warning` | `noise`
- `integration_summary`: string[]

Rules:

- this section may compare flow state to price behavior
- it must not re-derive TA setup families or invalidate TA structure ownership
- divergence stays contextual here; it is not a trigger or standalone trade instruction

### `monitoring`

Purpose:

- state what should confirm, weaken, or invalidate the current flow read next

Required fields:

- `confirm_if`: string[]
- `weaken_if`: string[]
- `invalidate_if`: string[]
- `next_review_window`: `next_session` | `3_sessions` | `5_sessions` | `10_sessions`
- `status_drift`: `improving` | `stalling` | `degrading` | `stable`

## Minimal V1 Computation Set

The first implementation should compute only the stable subset:

1. `window`
2. `coverage_buy_pct`
3. `coverage_sell_pct`
4. `net_flow_total_value`
5. `cadi_value`
6. `cadi_trend`
7. `buy_avg_vs_vwap_pct`
8. `sell_avg_vs_vwap_pct`
9. `bs_spread_pct`
10. `gvpr_buy_pct`
11. `gvpr_sell_pct`
12. `top_buyer_share_pct`
13. `top_seller_share_pct`
14. `persistence_score`
15. `buy_hhi`
16. `sell_hhi`
17. `flow_price_correlation_spearman`
18. `divergence_state`
19. `wash_risk_pct`
20. `liquidity_profile`
21. `market_cap_profile`
22. `trust_level`
23. `baseline_verdict`
24. `integration_hook`
25. `monitoring`

Everything else can be layered in later if the deterministic signal proves stable.

## What Stays Out Of V1

Do not put these in the first packet:

- raw broker tables rendered as prose
- broker distribution visualization output
- `MFI` without a defensible formula from the real raw contract
- `SMT` as a black-box source of truth
- `Gini` as a primary concentration metric under top-25 truncation
- named chart setups
- stop-loss and target logic
- final trade action
- full parent synthesis

## Suggested Build Target

The first builder should produce:

- `flow_context.json`

using:

- `fetch-broker-flow` output
- `fetch-ohlcv` output

That file then becomes the deterministic input to the future `flow-analysis` skill.
