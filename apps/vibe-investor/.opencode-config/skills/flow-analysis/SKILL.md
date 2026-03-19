---
name: flow-analysis
description: Broker-flow analysis helper for IDX stocks that derives sponsor quality, accumulation or distribution lean, trust regime, and flow-to-price context from daily broker summaries plus OHLCV.
---

## Scope

This skill owns:

- gross-versus-net reading discipline
- broker sponsor-quality features
- accumulation versus distribution lean
- concentration, persistence, anomaly, and trust features
- flow-to-price timing context for parent synthesis

This skill does not own:

- chart structure
- setup family
- trigger logic
- stop or target placement
- final trade action

Those remain under `technical-analysis` and the parent workflow.

## Inputs

Required dependencies:

1. `fetch-broker-flow` output JSON
2. `fetch-ohlcv` output JSON

If either fetch fails, stop. Do not improvise broker-flow analysis without both datasets.

## Deterministic Build

Always build deterministic context before interpretation.

Run:

```bash
python scripts/build_flow_context.py \
  --broker-flow {FETCH_BROKER_FLOW_OUTPUT_PATH} \
  --ohlcv {FETCH_OHLCV_OUTPUT_PATH} \
  --symbol {SYMBOL} \
  --output {FLOW_CONTEXT_OUTPUT_PATH} \
  --purpose-mode {INITIAL|UPDATE|POSTMORTEM}
```

Rules:

- use the exact JSON produced by `fetch-broker-flow`
- use the exact JSON produced by `fetch-ohlcv`
- output must be a UTF-8 `.json` file
- `60` fetched trading days provide:
  - `30D` active read for current sponsor behavior and direction
  - `60D` trust read for correlation and ticker usefulness
- if fewer than `60` sessions are available, trust is downgraded; do not hide that

## Deterministic Contract

The deterministic packet is intentionally narrow.

Core metrics:

- `coverage_buy_pct`
- `coverage_sell_pct`
- `net_flow_total_value`
- `net_flow_recent_value`
- `cadi_value`
- `cadi_trend`
- `cadi_slope_strength`
- `buy_avg_vs_vwap_pct`
- `sell_avg_vs_vwap_pct`
- `buy_execution_quality`
- `sell_execution_quality`
- `bs_spread_pct`
- `gvpr_buy_pct`
- `gvpr_sell_pct`
- `gvpr_pattern`
- `top_buyer_share_pct`
- `top_seller_share_pct`

Semantics:

- `coverage_*` measures visible top-25 side value as a share of total market value
- `buy_avg_vs_vwap_pct`, `sell_avg_vs_vwap_pct`, `gvpr_*`, and `top_*_share_pct` are selected-period aggregate metrics over the primary 30-session window
- `gvpr_*` and `top_*_share_pct` are anchored to total market value over that window, matching the source doctrine

Advanced signals:

- `persistence_score`
- `persistence_state`
- `buy_hhi`
- `sell_hhi`
- `concentration_asymmetry_state`
- `mfi_value`
- `mfi_state`
- `frequency_score`
- `frequency_profile`
- `flow_price_correlation_spearman`
- `flow_price_correlation_state`
- `divergence_state`
- `wash_risk_pct`
- `wash_risk_state`
- `anomaly_risk_state`

Trust and verdict:

- `liquidity_profile`
- `market_cap_profile`
- `market_cap_value`
- `ticker_flow_usefulness`
- `trust_level`
- `verdict_weight_profile`
- `trust_rationale`
- `verdict`
- `conviction_pct`
- `sponsor_quality`
- `strongest_support_factors`
- `strongest_caution_factors`
- `timing_relation`
- `signal_role`
- `integration_summary`
- `monitoring`

Historical series:

- `history.active_30d`
- `history.trust_60d`

Conditional update fields:

- `update_context.flow_status`
- `update_context.review_reason`

## Interpretation Order

Always interpret in this order:

1. `MODE`
2. `INPUT_SCOPE`
3. `GROSS_FIRST_READ`
4. `CORE_METRICS`
5. `ADVANCED_SIGNALS`
6. `TRUST_AND_REGIME`
7. `VERDICT`
8. `INTEGRATION_HOOK`
9. `MONITORING`

### 1. `MODE`

Use the same purpose modes as technical analysis:

- `INITIAL`
- `UPDATE`
- `POSTMORTEM`

### 2. `INPUT_SCOPE`

State:

- symbol
- as-of date
- actual trading-day window
- whether today’s broker snapshot is included
- this is always a multi-day read; do not present single-day mode

### 3. `GROSS_FIRST_READ`

Hard rule:

- read `gross` first
- use net only as a derived compression layer

Do not let net-only framing hide two-way broker activity.

### 4. `CORE_METRICS`

Answer:

- is visible broker pressure net constructive or net distributive?
- are buyers paying up or getting absorbed below VWAP?
- is participation concentrated enough to matter?
- is top-25 coverage strong enough to trust the visible picture?

Interpretation rules:

- rising `CADI` with positive recent net flow is constructive
- selected-period buy-vs-VWAP is the verdict input; daily execution path still lives in `history`
- `GVPR` and top-broker share are participation context, not standalone truth
- low coverage means the visible broker picture is partial

### 5. `ADVANCED_SIGNALS`

These refine the read.

Interpretation rules:

- persistence upgrades conviction; it does not replace direction
- `HHI` and top-k participation are the preferred concentration backbone
- `Frequency Profile` is included because raw broker frequency exists in the source data
- divergence is context only
- wash/anomaly risk is a discount, not a conclusion

### 6. `TRUST_AND_REGIME`

This layer decides whether broker flow deserves weight on this ticker.

Interpretation rules:

- `30D` tells you what brokers are doing now
- `60D` tells you whether broker-flow signals are generally trustworthy here
- liquidity and market cap must influence trust
- high anomaly risk or low coverage must discount trust
- `verdict_weight_profile` explains how factor weighting changes by ticker regime

### 7. `VERDICT`

The verdict is:

- `ACCUMULATION`
- `DISTRIBUTION`
- `NEUTRAL`

It is not:

- `BUY`
- `HOLD`
- `WAIT`
- `EXIT`

Treat it as broker-flow lean only.

### 8. `INTEGRATION_HOOK`

This is the bridge into parent synthesis.

Use:

- `lead`
- `confirm`
- `warning`
- `unclear`

Interpretation:

- `lead`: flow improved before price fully confirmed
- `confirm`: flow agrees with established price behavior
- `warning`: flow deteriorated while price still looks stronger
- `unclear`: timing relationship is mixed

Do not re-derive TA setup families or invalidate TA ownership here.

### 9. `MONITORING`

Always end with:

- what confirms the flow read
- what weakens it
- what invalidates it
- what next review window matters

When `purpose_mode = UPDATE`, also state:

- `flow_status`
- `review_reason`

## Output Contract

Keep the final report smaller than the HTML product UI.

Required sections:

1. `Decision Summary`
2. `Context`
3. `Core Metrics`
4. `Advanced Signals`
5. `Trust / Regime`
6. `Integration Hook`
7. `Monitoring`

### `Decision Summary`

Required fields:

- verdict
- conviction
- trust level
- sponsor-quality lean
- key caution
- integration signal
- next review trigger

### `Context`

Required fields:

- symbol
- as-of date
- active window
- today snapshot included or excluded
- gross-first note
- compact history availability for `30D` and `60D`

### `Core Metrics`

Summarize:

- `CADI`
- recent visible net flow
- buy vs VWAP
- sell vs VWAP
- `GVPR`
- top buyer / seller share
- coverage

If needed for inspection, refer to the compact historical block instead of re-reading raw broker rows.

### `Advanced Signals`

Summarize only what matters:

- persistence
- concentration asymmetry
- flow-price trust
- divergence
- wash or anomaly risk

### `Trust / Regime`

State:

- liquidity bucket
- market-cap bucket
- ticker usefulness
- trust rationale

### `Integration Hook`

State:

- lead / confirm / warning / unclear
- whether flow is aligned or contradictory to current price behavior
- why the parent workflow should care

### `Monitoring`

State:

- confirm-if
- weaken-if
- invalidate-if
- next review window

## Tone And Discipline

- be explicit about what is deterministic versus heuristic
- call out low coverage or high anomaly risk plainly
- do not oversell broker-flow as a stand-alone trigger engine
- keep flow verdict separate from technical execution
