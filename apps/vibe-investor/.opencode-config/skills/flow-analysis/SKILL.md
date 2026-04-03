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
python3 scripts/build_flow_context.py \
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

The deterministic packet is intentionally narrow and grouped by section.

Core metrics:

- `core_metrics.coverage_buy_pct`
- `core_metrics.coverage_sell_pct`
- `core_metrics.net_flow_total_value`
- `core_metrics.net_flow_recent_value`
- `core_metrics.cadi_value`
- `core_metrics.cadi_trend`
- `core_metrics.cadi_slope_strength`
- `core_metrics.buy_avg_vs_vwap_pct`
- `core_metrics.sell_avg_vs_vwap_pct`
- `core_metrics.buy_execution_quality`
- `core_metrics.sell_execution_quality`
- `core_metrics.bs_spread_pct`
- `core_metrics.gvpr_buy_pct`
- `core_metrics.gvpr_sell_pct`
- `core_metrics.gvpr_pattern`
- `core_metrics.top_buyer_share_pct`
- `core_metrics.top_seller_share_pct`
- `core_metrics.net_accumulation_price`
- `core_metrics.net_accumulation_vs_current_pct`

Semantics:

- `core_metrics.coverage_*` measures visible top-25 side value as a share of total market value
- `core_metrics.buy_avg_vs_vwap_pct`, `core_metrics.sell_avg_vs_vwap_pct`, `core_metrics.gvpr_*`, and `core_metrics.top_*_share_pct` are selected-period aggregate metrics over the primary 30-session window
- `core_metrics.gvpr_*` and `core_metrics.top_*_share_pct` are anchored to total market value over that window, matching the source doctrine
- `core_metrics.net_accumulation_price` is the VWAP of net-positive flow days in the primary window; compare `core_metrics.net_accumulation_vs_current_pct` to see whether visible accumulators are in profit

Advanced signals:

- `advanced_signals.persistence_score`
- `advanced_signals.persistence_state`
- `advanced_signals.buy_hhi`
- `advanced_signals.sell_hhi`
- `advanced_signals.buy_gini`
- `advanced_signals.sell_gini`
- `advanced_signals.gini_asymmetry`
- `advanced_signals.gini_asymmetry_state`
- `advanced_signals.mfi_value`
- `advanced_signals.mfi_state`
- `advanced_signals.frequency_score`
- `advanced_signals.frequency_profile`
- `advanced_signals.flow_price_correlation_spearman`
- `advanced_signals.flow_price_correlation_state`
- `advanced_signals.cadi_divergence_state`
- `advanced_signals.mfi_divergence_state`
- `advanced_signals.freq_gini_divergence_state`
- `advanced_signals.divergence_summary`
- `advanced_signals.divergence_state`
- `advanced_signals.wash_risk_pct`
- `advanced_signals.wash_risk_state`
- `advanced_signals.anomaly_risk_state`

Trust and assessment:

- `trust_regime.liquidity_profile`
- `trust_regime.market_cap_profile`
- `trust_regime.market_cap_value`
- `trust_regime.ticker_flow_usefulness`
- `trust_regime.trust_level`
- `trust_regime.verdict_weight_profile`
- `trust_regime.trust_rationale`
- `baseline_verdict.verdict`
- `baseline_verdict.conviction_pct`
- `baseline_verdict.sponsor_quality`
- `baseline_verdict.strongest_support_factors`
- `baseline_verdict.strongest_caution_factors`
- `integration_hook.timing_relation`
- `integration_hook.price_structure_alignment`
- `integration_hook.signal_role`
- `integration_hook.integration_summary`
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
- `net_accumulation_price` below current price means visible accumulators are sitting in profit; above current price means they are underwater
- `GVPR` and top-broker share are participation context, not standalone truth
- low coverage means the visible broker picture is partial

### 5. `ADVANCED_SIGNALS`

These refine the read.

Interpretation rules:

- persistence upgrades conviction; it does not replace direction
- `gini_asymmetry_state` is the primary concentration asymmetry read; `HHI` and top-k participation are secondary confirmation
- `Frequency Profile` is included because raw broker frequency exists in the source data
- read `cadi_divergence_state`, `mfi_divergence_state`, and `freq_gini_divergence_state` separately, then use `divergence_summary` as the compact rollup
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

### 7. `FLOW_ASSESSMENT`

Produce one `flow_assessment` object as the broker-flow output contract:

```yaml
flow_assessment:
  conviction_score: 45
  confidence: LOW
  bull_factors: []
  bear_factors: []
  sponsor_quality: {}
  timing_context: {}
  trust_regime: {}
```

Scoring rules:

- Use `baseline_verdict.conviction_pct` from `flow_context.json` as the primary 0-100 score source.
- Use `baseline_verdict.strongest_support_factors` as `bull_factors` and `baseline_verdict.strongest_caution_factors` as `bear_factors`.
- Map `trust_regime.trust_level` into `confidence`: `high -> HIGH`, `medium -> MEDIUM`, `low -> LOW`.
- Populate `sponsor_quality` from `baseline_verdict.sponsor_quality`, `timing_context` from `integration_hook`, and `trust_regime` from the deterministic trust packet.
- If `baseline_verdict.verdict` is useful for readability, keep it only as a derived convenience label inside the prose summary; `conviction_score` is the primary output.
- Treat this as broker-flow assessment only. Do not emit `BUY`, `HOLD`, `WAIT`, or `EXIT`.

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

1. `Flow Assessment Summary`
2. `Context`
3. `Core Metrics`
4. `Advanced Signals`
5. `Trust / Regime`
6. `Integration Hook`
7. `Monitoring`

### `Flow Assessment Summary`

Required fields:

- `flow_assessment.conviction_score`
- `flow_assessment.confidence`
- `flow_assessment.bull_factors`
- `flow_assessment.bear_factors`
- `flow_assessment.sponsor_quality`
- `flow_assessment.timing_context`
- `flow_assessment.trust_regime`
- `monitoring.next_review_window`

### `Context`

Required fields:

- `analysis.symbol`
- `analysis.as_of_date`
- `window.from` / `window.to`
- `window.today_snapshot_included`
- `core_metrics.gross_read_note`
- compact history availability for `30D` and `60D`

### `Core Metrics`

Summarize:

- `core_metrics.cadi_value`
- `core_metrics.net_flow_recent_value`
- `core_metrics.buy_avg_vs_vwap_pct`
- `core_metrics.sell_avg_vs_vwap_pct`
- `core_metrics.net_accumulation_price`
- `core_metrics.net_accumulation_vs_current_pct`
- `core_metrics.gvpr_buy_pct` / `core_metrics.gvpr_sell_pct`
- `core_metrics.top_buyer_share_pct` / `core_metrics.top_seller_share_pct`
- `core_metrics.coverage_buy_pct` / `core_metrics.coverage_sell_pct`

If needed for inspection, refer to the compact historical block instead of re-reading raw broker rows.

### `Advanced Signals`

Summarize only what matters:

- `advanced_signals.persistence_state`
- `advanced_signals.gini_asymmetry_state`
- `advanced_signals.gini_asymmetry`
- `advanced_signals.flow_price_correlation_state`
- `advanced_signals.cadi_divergence_state`
- `advanced_signals.mfi_divergence_state`
- `advanced_signals.freq_gini_divergence_state`
- `advanced_signals.divergence_summary`
- `advanced_signals.divergence_state`
- `advanced_signals.wash_risk_state` / `advanced_signals.anomaly_risk_state`

### `Trust / Regime`

State:

- `trust_regime.liquidity_profile`
- `trust_regime.market_cap_profile`
- `trust_regime.ticker_flow_usefulness`
- `trust_regime.trust_rationale`

### `Integration Hook`

State:

- `integration_hook.timing_relation`
- `integration_hook.price_structure_alignment`
- `integration_hook.integration_summary`

### `Monitoring`

State:

- `monitoring.confirm_if`
- `monitoring.weaken_if`
- `monitoring.invalidate_if`
- `monitoring.next_review_window`

## Tone And Discipline

- be explicit about what is deterministic versus heuristic
- call out low coverage or high anomaly risk plainly
- do not oversell broker-flow as a stand-alone trigger engine
- keep `flow_assessment` separate from technical execution
