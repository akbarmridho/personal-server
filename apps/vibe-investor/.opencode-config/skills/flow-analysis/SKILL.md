---
name: flow-analysis
description: Broker-flow analysis helper for IDX stocks that derives sponsor quality, accumulation or distribution lean, trust regime, and flow-to-price context from daily broker summaries plus OHLCV.
---

## Scope

This skill owns broker-flow interpretation: gross-versus-net reading, sponsor quality, accumulation/distribution lean, concentration, persistence, anomaly and trust features, and flow-to-price timing context for parent synthesis.

This skill does not own chart structure, setup family, trigger logic, stop/target placement, or trade decisions.

## Role in Synthesis

Flow is **sizing context**, not an entry/exit vote. The flow score measures signal clarity and trust — how readable and trustworthy the flow picture is — NOT whether flow is bullish or bearish.

- Distribution is not automatically "don't enter." It may mean "size smaller" or "institutional rotation expected under this thesis."
- Accumulation is not automatically "buy." It may be wash trading or low-quality participation.
- The parent synthesis decides what flow means for the trade. This skill reports what brokers are doing and how much to trust that picture.

When producing the assessment, always include `decision_role`: one of `lead` (flow is thesis-critical, e.g., accumulation-driven rerating), `confirm` (flow supports the thesis direction), `sizing_modifier` (flow informs position size, not direction), or `noise` (flow is unreadable or irrelevant to this thesis).

## Inputs

Required: `fetch-broker-flow` output JSON + `fetch-ohlcv` output JSON for the stock.

Optional: `fetch-ohlcv` output JSON for `IHSG` when beta metrics are needed.

If any required fetch fails, stop.

## Deterministic Build

Always build deterministic context before interpretation.

```bash
python3 scripts/build_flow_context.py \
  --broker-flow {FETCH_BROKER_FLOW_OUTPUT_PATH} \
  --ohlcv {FETCH_STOCK_OHLCV_OUTPUT_PATH} \
  --symbol {SYMBOL} \
  --output {FLOW_CONTEXT_OUTPUT_PATH} \
  --purpose-mode {INITIAL|UPDATE|POSTMORTEM}
```

Include `--benchmark-ohlcv {FETCH_IHSG_OHLCV_OUTPUT_PATH}` when beta metrics are needed.

Output is a UTF-8 `.json` file. `60` fetched trading days provide a `30D` active window and a `60D` trust window. If fewer than `60` sessions are available, trust is downgraded.

## Key Semantics

Read the full `flow_context.json` output directly. These are the non-obvious semantics worth calling out:

- `coverage_*`: visible top-25 side value as share of total market value. Low coverage means the picture is partial.
- `net_accumulation_price`: VWAP of net-positive flow days. Compare `net_accumulation_vs_current_pct` to see if accumulators are in profit or underwater.
- `gvpr_*` and `top_*_share_pct`: anchored to total market value over the 30-session window.
- `persistence_drivers[]`: each item carries `broker`, `side`, `streak`, `active`, `flow_share_pct`, `contribution`. Name the top brokers.
- `gini_asymmetry_state`: primary concentration asymmetry read. HHI and top-k are secondary.
- `divergence_summary`: compact rollup of `cadi_divergence_state`, `mfi_divergence_state`, `freq_gini_divergence_state`. Divergence is context, not conclusion.
- `30D` tells you what brokers are doing now. `60D` tells you whether flow signals are trustworthy on this ticker.
- `verdict_weight_profile` explains how factor weighting changes by ticker regime.

## Interpretation Order

1. **MODE**: `INITIAL`, `UPDATE`, or `POSTMORTEM`.
2. **INPUT_SCOPE**: symbol, as-of date, window, today snapshot included.
3. **GROSS_FIRST_READ**: read gross first, net is a derived compression layer. Do not let net-only framing hide two-way activity.
4. **CORE_METRICS**: net pressure direction, execution quality vs VWAP, participation concentration, coverage trust.
5. **ADVANCED_SIGNALS**: persistence refines conviction. Divergence is context only. Wash/anomaly risk is a discount.
6. **TRUST_AND_REGIME**: decides whether flow deserves weight on this ticker. High anomaly risk or low coverage discounts trust. High `atr_pct` shifts factor mix to `high_volatility` (more MFI weight).
7. **FLOW_ASSESSMENT**: produce the output object (see below).
8. **INTEGRATION_HOOK**: bridge to parent synthesis — `lead`, `confirm`, `warning`, or `unclear`.
9. **PARTICIPANT_FLOW**: who is behind the flow (foreign/government/local). Context for the verdict, not a standalone signal. `classified_pct` below 0.70 means partial breakdown.
10. **MONITORING**: what confirms, weakens, invalidates the read. Next review window. For `UPDATE`: `flow_status` and `review_reason`.

## Flow Assessment

Produce one `flow_assessment` object:

```yaml
flow_assessment:
  conviction_score: 65
  confidence: MEDIUM
  verdict: DISTRIBUTION
  decision_role: sizing_modifier
  bull_factors: []
  bear_factors: []
  sponsor_quality: {}
  timing_context: {}
  trust_regime: {}
```

Scoring semantics:

`conviction_score` measures how clear, trustworthy, and informative the flow read is — not whether flow is bullish or bearish. Accumulation is not automatically good. Distribution is not automatically bad. The flow lens tells you what brokers are doing and how much you should trust that picture. The parent synthesis decides what it means for the trade.

Score rubric:

| Score | Meaning |
|-------|---------|
| 0-25 | Noisy, untrustworthy, or contradictory — low informational value |
| 26-45 | Weak signal — low coverage, high wash risk, or mixed signals |
| 46-60 | Readable with moderate trust — verdict clear but some factors conflict |
| 61-75 | Clear, trustworthy — verdict, persistence, and participation align |
| 76-90 | High-quality — strong trust, clear persistence, clean divergence reads |
| 91-100 | Exceptional clarity — all factors align, high trust and coverage |

Scoring rules:

- Start from `baseline_verdict.conviction_pct` as the base.
- Adjust up for: high trust, high coverage, clear persistence drivers, strong flow-price correlation (either direction), decisive participant breakdown.
- Adjust down for: low trust, partial coverage, elevated wash/anomaly risk, mixed divergence, weak correlation.
- `bull_factors` from `strongest_support_factors`, `bear_factors` from `strongest_caution_factors`.
- `confidence` from `trust_regime.trust_level`: `high -> HIGH`, `medium -> MEDIUM`, `low -> LOW`.
- Always include `verdict` (ACCUMULATION / DISTRIBUTION / NEUTRAL). Parent synthesis needs direction separately from quality.
- Always include `decision_role` (lead / confirm / sizing_modifier / noise) based on thesis context.
- Do not emit `BUY`, `HOLD`, `WAIT`, or `EXIT`.

## Output Report

Keep concise. Required sections: Flow Assessment Summary, Context, Core Metrics, Advanced Signals, Trust/Regime, Integration Hook, Participant Flow, Monitoring. Summarize only what matters from each section — the AI reads the full JSON, the report is for the parent workflow.

## Execution Defaults

- For `UPDATE` and `POSTMORTEM`, require prior thesis context.
- Be explicit about what is deterministic versus heuristic.
- Call out low coverage or high anomaly risk plainly.
- Do not oversell broker-flow as a standalone trigger engine.

## Artifact Persistence

Write the output report as `flow.md` and the deterministic context as `flow_context.json` to `memory/symbols/{SYMBOL}/` when the symbol has an existing plan or is in the coverage universe. Otherwise write to `work/`.
