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
2. `LEVEL_DRAFT` - Draft key levels/zones from daily structure and liquidity map.
3. `CHART_BUILD` - Generate chart outputs with lines/zones/labels (daily + intraday).
4. `CHART_READ` - Read the generated charts first; write chart observations before final decision.
5. `CROSS_CHECK` - Cross-check chart observations with numeric evidence (volume ratios, closes, retests).
6. `SETUP_RISK` - Build setup and risk plan (or no-trade plan).
7. `DECISION` - Produce action, invalidation, and monitoring triggers.

Hard requirements:

- Do not skip `CHART_BUILD` and `CHART_READ`.
- If data dependency fails, stop and report missing dependency.
- If no valid setup, output `WAIT` with conditions for re-entry review.
- Resolve contradictions explicitly: if chart-read and numeric checks differ, state which side is trusted and why.

Topic ownership (avoid overlap):

- Market state/regime/Wyckoff -> `references/market-structure-and-trend.md`
- Levels/VPVR/IBH-IBL -> `references/levels-support-resistance-and-vpvr.md`
- Setup quality/patterns -> `references/price-action-patterns-and-breakouts.md`
- Risk/positioning/decision -> `references/execution-and-risk-protocol.md`
- Checklist/red flags -> `references/analysis-checklists-and-red-flags.md`
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
- [Levels support resistance and VPVR](references/levels-support-resistance-and-vpvr.md)
- [Price action patterns and breakouts](references/price-action-patterns-and-breakouts.md)
- [Execution and risk protocol](references/execution-and-risk-protocol.md)
- [Analysis checklists and red flags](references/analysis-checklists-and-red-flags.md)
- [Output report template](references/output-report-template.md)

## Execution Defaults

- Parse JSON directly. Never use CSV readers.
- Daily drives thesis. Intraday refines timing and acceptance only.
- Primary lens is state: `balance` vs `imbalance`, then map to Wyckoff phase context.
- IBH/IBL is a structural acceptance tool, not a standalone signal.
- Every actionable output must include explicit invalidation and stop-loss.
- Always include generated chart artifacts in output (`work/{SYMBOL}_*.png`) and reference them in evidence.
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
