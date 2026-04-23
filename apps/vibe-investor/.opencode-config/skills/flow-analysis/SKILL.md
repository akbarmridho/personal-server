---
name: flow-analysis
description: Broker-flow analysis helper for IDX stocks that derives sponsor quality, accumulation or distribution lean, trust regime, and flow-to-price context from daily broker summaries plus OHLCV.
---

## Scope

This skill owns broker-flow interpretation: gross-versus-net reading, sponsor quality, accumulation/distribution lean, concentration, persistence, anomaly and trust features, and flow-to-price timing context for parent synthesis.

This skill does not own chart structure, setup family, trigger logic, stop/target placement, or trade decisions.

## Role in Synthesis

Flow reports what informed participants are doing. Trust calibration determines how much weight to give it. The parent synthesis decides what it means for the trade.

The flow score measures signal clarity and trust — how readable and trustworthy the flow picture is — NOT whether flow is bullish or bearish. Accumulation is not automatically good. Distribution is not automatically bad.

When producing the assessment, always include `decision_role` assigned mechanically from trust regime and flow-price correlation:

| Condition | Role |
|-----------|------|
| Trust LOW or flow-price correlation < 0.15 | `noise` — flow is unreadable on this ticker, ignore it |
| Trust MEDIUM+ and flow aligns with thesis direction | `confirmation` — informed money agrees with the thesis |
| Trust MEDIUM+ and flow opposes thesis direction | `warning` — someone informed is on the other side of the trade |
| Trust MEDIUM+ and divergence detected (CADI or MFI) | `early_signal` — flow is shifting before price shows it |

When multiple conditions match, prefer `warning` > `early_signal` > `confirmation` > `noise`.

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

Read the `flow_context.json` output directly. The JSON is ordered verdict-first: `verdict` → `trust_context` → `flow_signals` → `participant_flow` → `monitoring` → `history`. Start from the verdict and drill into supporting signals only when needed.

**verdict** — the conclusion. Read this first:

- `verdict`: ACCUMULATION / DISTRIBUTION / NEUTRAL.
- `conviction_pct`: mechanical signal clarity score (0-100). Higher means the signal is clearer and more trustworthy, not that it's more bullish.
- `decision_role`: your role assignment for the parent synthesis — `confirmation`, `warning`, `early_signal`, or `noise`.
- `sponsor_quality`: strong / constructive / mixed / weak.
- `strongest_support_factors` / `strongest_caution_factors`: the script's top reasons for and against the verdict.

**trust_context** — how much to trust the verdict:

- `trust_level`: HIGH / MEDIUM / LOW. When LOW, the verdict is unreliable.
- `cadi_reliability`: HIGH / MODERATE / LOW. When LOW, CADI was mechanically deweighted — do not anchor on it.
- `controller_risk.flagged`: when true, a single broker dominates flow on a thin-float name. CADI was discounted 50%.
- `volume_regime.regime_shift_risk`: when true, recent breakout volume contradicts the 30-day CADI direction. The verdict may be stale.
- `anomaly_risk_state`: elevated / watch / clean.

**flow_signals** — supporting detail, grouped by signal type:

- `cadi.*`: cumulative flow direction, trend, recency (last 5 sessions), acceleration (slope fading). `slope_r2` measures how well the trend line fits — low R² means the trend is noisy and the slope is unreliable.
- `persistence.*`: how consistently brokers stay on one side, recency-weighted (recent days count more). `drivers[]` names the top brokers.
- `concentration.*`: Gini/HHI asymmetry between buy and sell sides. `gini_asymmetry_state` is the primary read.
- `execution.*`: are buyers/sellers paying above or below VWAP.
- `mfi.*`: money flow exhaustion (low = bullish for price, high = bearish for price).
- `frequency.*`: ticket size profile (institutional vs retail).
- `coverage.*`: how much of the day's activity is visible in the top-25 broker data.
- `net_flow.*`: total and recent net flow values, net accumulation price.
- `divergence.*`: CADI, MFI, and frequency-Gini divergence states. Context, not conclusion.
- `wash_risk.*`: `soft_pct` is the continuous wash probability; `pct` is the strict binary count. Values of `soft_pct` above 5% warrant caution.
- `correlation.*`: flow-price relationship over the trust window. `spearman` measures monotonic rank correlation on cumulative levels (can be inflated by shared trends). `pearson_changes` measures linear correlation on daily changes (CADI increment vs price return) — more honest but noisier. When `spearman` is moderate but `pearson_changes` is near zero, the level correlation is likely spurious.

**participant_flow** — who is behind the flow (foreign/government/local). `classified_pct` below 0.70 means partial breakdown.

**history** — raw daily series at the bottom. Reference when you need to verify a specific day or trace a trend visually. Do not interpret these series line-by-line in the lens summary.

## Interpretation Order

1. **MODE**: `INITIAL`, `UPDATE`, or `POSTMORTEM`.
2. **INPUT_SCOPE**: symbol, as-of date, window, today snapshot included.
3. **VERDICT_FIRST**: read `verdict` block. Note the direction, conviction, decision role, and caution factors. This is the script's conclusion — your job is to validate or adjust it, not rebuild it from scratch.
4. **TRUST_CHECK**: read `trust_context`. If `trust_level` is LOW or `cadi_reliability` is LOW, the verdict is mechanically weakened — note this. Check `controller_risk`, `volume_regime`, and `anomaly_risk_state` for active flags.
5. **SIGNAL_DRILL** (only when needed): check `flow_signals` to understand why the verdict is what it is, or when trust flags suggest the verdict may be wrong. Do not walk through every signal — focus on what's unusual or contradictory. When `cadi_reliability` is LOW, anchor on `persistence`, `concentration`, and `execution` instead of `cadi`.
6. **PARTICIPANT_FLOW**: who is behind the flow. Context for the verdict, not a standalone signal.
7. **FLOW_ASSESSMENT**: produce the output object (see below).
8. **MONITORING**: what confirms, weakens, invalidates the read. For `UPDATE`: `flow_status` and `review_reason`.

## Flow Assessment

Produce one `flow_assessment` object:

```yaml
flow_assessment:
  conviction_score: 65
  confidence: MEDIUM
  verdict: DISTRIBUTION
  decision_role: warning
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

- Start from `verdict.conviction_pct` as the base.
- Adjust based on your holistic read of whether the mechanical verdict captures reality. The script already applied mechanical discounts for controller risk, weak correlation, volume regime, momentum shift, and momentum fading — these are reflected in `conviction_pct` and `strongest_caution_factors`. Your adjustment should reflect what the script cannot see: whether the participant breakdown tells a coherent story, whether the flow picture makes sense given the narrative context, and whether any IDX-specific caveat applies.
- Typical adjustment range: ±10 points. Explain your adjustment in 1-2 sentences.
- `bull_factors` from `verdict.strongest_support_factors`, `bear_factors` from `verdict.strongest_caution_factors`. Add your own only when you see something the script missed.
- `confidence` from `trust_context.trust_level`: `high -> HIGH`, `medium -> MEDIUM`, `low -> LOW`.
- Always include `verdict` (ACCUMULATION / DISTRIBUTION / NEUTRAL). Parent synthesis needs direction separately from quality.
- Always include `decision_role` from `verdict.decision_role`.
- Do not emit `BUY`, `HOLD`, `WAIT`, or `EXIT`.

## Output

This skill produces:

1. **`flow_context.json`** — deterministic preprocessing output. System of record for all flow structured data (verdict, trust context, flow signals, participant flow, monitoring, history). Written by the preprocessing script.
2. **Lens summary for `plan.md`** — the LLM's unique interpretation, written directly into the symbol's `plan.md` under the `## Flow ({score}) — {role}` section.

The lens summary contains ONLY what the LLM uniquely contributes — interpretation of what flow means for the thesis, tensions between mechanical verdict and participant reality, and reasoning continuity via history entries. It must NOT restate structured data that already lives in `flow_context.json` (core metrics tables, persistence driver tables, concentration metrics, trust regime rationale, divergence details, etc.).

### Required fields in the lens summary

- Score, role (assigned mechanically per the role table), verdict, confidence
- Current state interpretation (3-5 sentences)
- Key participant read (who is driving flow and why it matters)
- Monitoring triggers (confirm/weaken/invalidate)
- History entry (date, score, 1-3 sentences of reasoning)

### Writing to plan.md

- **INITIAL mode**: write the full Flow section using `write` (as part of creating the entire `plan.md`).
- **UPDATE mode**: use `edit` to surgically update only what changed — score in the header, state paragraph if interpretation materially changed, and append a history entry. Never rewrite the whole section if only the score shifted.
- **If nothing material changed**: do not touch the Flow section. No update is a valid outcome.

See `memory/symbols/README.md` for the full plan template, edit protocol, and statefulness rules.

## IDX-Specific Caveats

IDX broker-flow is structurally different from developed markets. "Informed flow" in IDX can be any of the following, and the data alone cannot distinguish between them:

1. **Controller maneuvering** — free float games, cross-trading between related parties. Common on small/micro-cap tickers. When `trust_context.controller_risk.flagged` is true, CADI extremes are suspect. When a single `persistence.drivers[]` entry holds >40% `flow_share_pct`, the "conviction" may be one actor, not the market.
2. **Foreign ETF rebalancing** — passive index weight changes that look like accumulation or distribution but carry no conviction. When `participant_flow.foreign_net` is large but `classified_pct` is low (<0.70), the foreign flow may be ETF-driven rather than active.
3. **Broker internalization** — related-party flow routed through a single broker that appears as accumulation but is internal transfer. Elevated `flow_signals.wash_risk.soft_pct` with low `flow_signals.wash_risk.pct` (strict thresholds not met) is the signal.
4. **Retail herd behavior** — concentrated buying or selling through dominant retail brokers. High frequency with low ticket size on one side (`flow_signals.frequency.profile: sell_heavy` or `buy_heavy`) combined with low HHI suggests retail-driven flow.
5. **Binary event days** — RUPSLB, ex-dividend, MSCI rebalance announcements. Flow on these days is mechanically driven and does not reflect conviction. When the as-of date or recent sessions coincide with known binary events (check narrative context), discount the flow read and note it explicitly.

When interpreting flow, always consider which of these five explanations fits the data before attributing flow to "smart money conviction."

## Execution Defaults

- For `UPDATE` and `POSTMORTEM`, require prior thesis context.
- Be explicit about what is deterministic versus heuristic.
- Call out low coverage or high anomaly risk plainly.
- Do not oversell broker-flow as a standalone trigger engine.

## Artifact Persistence

Write `flow_context.json` to `memory/symbols/{SYMBOL}/` when the symbol has an existing plan or is in the coverage universe. Otherwise write to `work/`.
