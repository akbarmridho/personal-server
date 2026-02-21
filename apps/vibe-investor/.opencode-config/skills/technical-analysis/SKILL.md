---
name: technical-analysis
description: Swing and position technical analysis for IDX stocks using dual-horizon structure, liquidity, volume, and risk workflow with mandatory reasoning trace and evidence output.
---

## Scope

This skill is for swing and longer-horizon investing (days to months), not intraday trading.

- Primary context: `daily[]`
- Tactical confirmation: `intraday[]` 60m (last 7 days)
- Do not rescale daily candles into weekly candles.

## Required Data And Fail-Fast

Use `fetch-ohlcv` as the only chart-data source.

- `symbol`: 4 uppercase letters, example `BBCA`
- `output_path`: JSON file under `work/`
- JSON object required (never CSV)
- Required arrays: `daily[]`, `intraday[]`, `corp_actions[]`

If any required array is missing or empty, stop analysis and return dependency failure.

Expected fields:

- `timestamp`, `datetime`, `date`
- `open`, `high`, `low`, `close`, `volume`, `value`
- `foreign_buy`, `foreign_sell`, `foreign_flow`

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
- Daily drives thesis. Intraday refines timing and acceptance.
- IBH/IBL is a structural acceptance tool, not a standalone signal.
- Divergence status must be explicit: `no_divergence`, `divergence_unconfirmed`, `divergence_confirmed`.
- Every actionable output must include explicit invalidation and stop-loss.
- Always include generated chart artifacts in output (`work/{SYMBOL}_*.png`) and reference them in evidence.

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
