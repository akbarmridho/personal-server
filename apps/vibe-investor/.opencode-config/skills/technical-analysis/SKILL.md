---
name: technical-analysis
description: Expert swing and position technical analysis for IDX stocks using chart-first Wyckoff and balance-imbalance logic, support-resistance and volume diagnostics, and auditable evidence-first output for human decision support.
---

## Scope

This skill is for swing and longer-horizon investing (days to months), not intraday scalping.

- Primary thesis: `daily[]`
- Tactical acceptance timing: `intraday[]` 60m (last 7 days)
- Context events: `corp_actions[]`
- Do not rescale daily candles into weekly candles.

## Analysis Modes (Human Workflow)

Pick one mode for each run:

- `INITIAL` - first full thesis build for a symbol.
- `UPDATE` - periodic refresh (for example weekly) against prior thesis.
- `THESIS_REVIEW` - explicit check whether thesis still holds.
- `POSTMORTEM` - review after invalidation/exit to improve process.

Mode requirements:

- `INITIAL`: full report using standard template.
- `UPDATE`: include previous-analysis context and mandatory delta section.
- `THESIS_REVIEW`: focus on thesis status and invalidation triggers.
- `POSTMORTEM`: include what failed, what was missed, and rule improvements.

## Required Data And Fail-Fast

Use `fetch-ohlcv` as the only chart-data source.

- `symbol`: 4 uppercase letters, example `BBCA`
- `output_path`: JSON file under `work/`
- JSON object required (never CSV)
- Required arrays: `daily[]`, `intraday[]`, `corp_actions[]`

If any required array is missing or empty, stop analysis and return dependency failure.
If `fetch-ohlcv` errors, stop analysis. Do not retry with alternate sources.

Expected fields:

- `timestamp`, `datetime`, `date`
- `open`, `high`, `low`, `close`, `volume`, `value`
- `foreign_buy`, `foreign_sell`, `foreign_flow`

Price-adjustment note:

- Trading prices are split-style adjusted (split, reverse split, rights issue), not dividend-adjusted.

## Preferred Workflow (Chart-First)

Use this flow by default, but adapt depth to context. The process is structured, not rigid.

1. `DATA_PREP` - Fetch, parse, validate data and build base features.
2. `PREV_CONTEXT` - For non-initial mode, extract prior thesis, action, invalidators, and evidence anchors.
3. `LEVEL_DRAFT` - Draft key levels/zones from daily structure and liquidity map.
4. `CHART_BUILD` - Generate chart outputs with lines/zones/labels (daily + intraday), including core artifacts and conditional module artifacts.
5. `CHART_READ` - Read the generated charts first; write chart observations before final decision.
6. `CROSS_CHECK` - Cross-check chart observations with numeric evidence (volume ratios, closes, retests).
7. `DELTA_ASSESS` - For non-initial mode, classify what changed vs previous analysis.
8. `SETUP_RISK` - Build setup and risk plan (or no-trade plan).
9. `DECISION` - Produce action, invalidation, and monitoring triggers.

Hard requirements:

- Do not skip `CHART_BUILD` and `CHART_READ`.
- Core chart artifacts are mandatory for every run; conditional chart artifacts are mandatory when their module is active.
- If data dependency fails, stop and report missing dependency.
- If no valid setup, output `WAIT` with conditions for re-entry review.
- Resolve contradictions explicitly: if chart-read and numeric checks differ, state which side is trusted and why.
- In `UPDATE` and `THESIS_REVIEW`, include explicit thesis delta and status.

Topic ownership (avoid overlap):

- Market state/regime/Wyckoff -> `references/market-structure-and-trend.md`
- Levels index -> `references/levels-support-resistance-and-vpvr.md`
- Levels moving-average dynamics -> `references/levels-moving-average-dynamics.md`
- Levels Fibonacci retracement/extension -> `references/levels-fibonacci-retracement-and-extension.md`
- Volume profile and participation flow -> `references/volume-profile-and-volume-flow.md`
- Liquidity draw and sweep framework -> `references/liquidity-draw-and-sweep.md`
- Fair value gap and imbalance handling -> `references/fair-value-gap-and-imbalances.md`
- Setup index -> `references/price-action-patterns-and-breakouts.md`
- Breakout quality filters -> `references/breakout-quality-filters.md`
- Level-to-level execution workflow -> `references/level-to-level-execution.md`
- SMC modules (OB/Breaker/FVG/IFVG/EQH-EQL/Premium-Discount) -> `references/smart-money-concepts-light.md`
- Risk/positioning/decision -> `references/execution-and-risk-protocol.md`
- Checklist and red-flag index -> `references/analysis-checklists-and-red-flags.md`
- Analysis lifecycle and framework modes -> `references/analysis-lifecycle-and-frameworks.md`
- Shared enums and glossary -> `references/enums-and-glossary.md`
- Output formatting contract -> `references/output-report-template.md`

## Reasoning Trace And Proof Contract

The output must include final decision plus concise, auditable reasoning.

Use markdown sections and tables, not JSON-like payloads.

- Include a `Workflow Trace` markdown table using the phases actually used.
- Each row should include:
  - `Phase`
  - `Key Observation`
  - `Rule Refs`
  - `Evidence Refs`
- Include an `Evidence Ledger` markdown table with concrete proof:
  - candle timestamps/date ranges
  - exact levels/ratios used
  - generated chart file path(s)
- Include `Confidence` and `Invalidators` as normal markdown bullets in final call.
- Include `Divergence Status` explicitly: `no_divergence`, `divergence_unconfirmed`, `divergence_confirmed`.

Keep trace concise, human-readable, and evidence-backed. Do not make unsupported conclusions.

## Reference Index

- [Market structure and trend](references/market-structure-and-trend.md)
- [Levels support resistance and VPVR (index)](references/levels-support-resistance-and-vpvr.md)
- [Levels moving-average dynamics](references/levels-moving-average-dynamics.md)
- [Levels Fibonacci retracement and extension](references/levels-fibonacci-retracement-and-extension.md)
- [Volume profile and volume flow](references/volume-profile-and-volume-flow.md)
- [Liquidity draw and sweep](references/liquidity-draw-and-sweep.md)
- [Fair value gap and imbalances](references/fair-value-gap-and-imbalances.md)
- [Price action patterns and breakouts (index)](references/price-action-patterns-and-breakouts.md)
- [Breakout quality filters](references/breakout-quality-filters.md)
- [Level to level execution](references/level-to-level-execution.md)
- [Smart money concepts light](references/smart-money-concepts-light.md)
- [Execution and risk protocol](references/execution-and-risk-protocol.md)
- [Analysis checklists and red flags (index)](references/analysis-checklists-and-red-flags.md)
- [Analysis lifecycle and frameworks](references/analysis-lifecycle-and-frameworks.md)
- [Enums and glossary](references/enums-and-glossary.md)
- [Output report template](references/output-report-template.md)

## Execution Defaults

- Parse JSON directly. Never use CSV readers.
- Declare `Mode` at top of output: `INITIAL`, `UPDATE`, `THESIS_REVIEW`, or `POSTMORTEM`.
- For non-initial mode, require previous analysis reference (path/date) and prior thesis snapshot.
- Daily drives thesis. Intraday refines timing and acceptance only.
- Primary lens is state: `balance` vs `imbalance`, then map to Wyckoff phase context.
- Reversal calls must follow BOS/CHOCH confirmation contract in market-structure reference.
- FVG usage must state type, bounds, CE behavior, and mitigation status.
- IBH/IBL is a structural acceptance tool, not a standalone signal.
- Map levels HTF-first then refine lower timeframe; keep level map minimal and actionable.
- When Fib is used, report explicit swing anchors and treat retracement/extension as confluence, not standalone permission.
- Treat charting as market map only; execution still requires setup, invalidation, and risk criteria.
- Use volume-profile context (POC/VAH/VAL/HVN/LVN) as decision support; prefer completed prior-session profiles for session references.
- Include liquidity draw map: current draw, opposing draw, sweep event, sweep outcome, and path state.
- Prefer level-to-level execution: entry near mapped zone, target next zone, explicit RR before action.
- For breakout setups, include base-quality and market-context filter notes before final action.
- Use `hybrid` MA mode by default: baseline stack (21/50/100/200) plus one adaptive MA when measurable respect exists.
- MA posture should be reported in levels context as dynamic support/resistance.
- Declare framework lens: `UNIFIED`, `CLASSICAL_TA`, `WYCKOFF`, `SMC_ICT_LIGHT`.
- If alternate lens is requested, include agreement/disagreement vs `UNIFIED` conclusion.
- When `SMC_ICT_LIGHT` is active, report used SMC modules and evidence for each used module.
- Every actionable output must include explicit invalidation and stop-loss.
- Always include generated chart artifacts in output (`work/{SYMBOL}_*.png`) and reference each artifact in evidence.
- Core chart artifacts (required every run):
  - `work/{SYMBOL}_daily_structure.png`
  - `work/{SYMBOL}_intraday_ibh_ibl.png`
  - `work/{SYMBOL}_ib_overlay.png`
  - `work/{SYMBOL}_structure_events.png`
  - `work/{SYMBOL}_liquidity_map.png`
  - `work/{SYMBOL}_trade_plan.png`
- Conditional chart artifacts (required when module is active):
  - `work/{SYMBOL}_vpvr_profile.png` when volume-profile context is used.
  - `work/{SYMBOL}_imbalance_fvg.png` when FVG/IFVG or imbalance context is used.
- Optional deep-dive artifact:
  - `work/{SYMBOL}_detail.png`
- In no-resistance conditions (new highs with no overhead supply), avoid fixed top calls; manage by structure until invalidated.

## Python Libraries

Reference code in this skill and its references uses:

- `json` (stdlib)
- `pandas`
- `numpy`
- `mplfinance`

## Reference Code

```python
import json
import pandas as pd


def load_ohlcv(path: str):
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    required = ["daily", "intraday", "corp_actions"]
    for key in required:
        if key not in raw or not isinstance(raw[key], list) or len(raw[key]) == 0:
            raise ValueError(f"Missing required dependency: {key}")

    df_daily = pd.DataFrame(raw["daily"]).sort_values("timestamp").reset_index(drop=True)
    df_intraday = pd.DataFrame(raw["intraday"]).sort_values("timestamp").reset_index(drop=True)
    df_corp = pd.DataFrame(raw["corp_actions"]).sort_values("timestamp").reset_index(drop=True)
    return df_daily, df_intraday, df_corp
```
