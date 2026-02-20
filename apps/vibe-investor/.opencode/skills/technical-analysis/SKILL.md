---
name: technical-analysis
description: Technical analysis for IDX stocks using Wyckoff, structure and trend diagnostics, support/resistance and volume context, execution risk protocols, and chart-first decision workflow.
---

## Scope Guardrail (IDX Only)

- This skill is for Indonesian Stock Exchange (IDX/BEI) technical analysis.
- Focus on structure, levels, price-volume behavior, and execution risk.
- Use chart evidence first, then narrative reasoning.

## Data And Workflow

Use `fetch-ohlcv` as the only chart-data source.

- `symbol`: 4 uppercase letters, e.g. `BBCA`
- `output_path`: JSON file under `work/`
- Output format: JSON object, not CSV
- If `fetch-ohlcv` fails, stop analysis

OHLCV object shape:

- `daily[]`: daily candles (`interval: 1d`)
- `intraday[]`: 60m candles (`interval: 60m`, partial bar possible)
- `corp_actions[]`: dividend and other corporate actions

Key fields:

- `timestamp`, `datetime`, `date`
- `open`, `high`, `low`, `close`, `volume`, `value`
- `foreign_buy`, `foreign_sell`, `foreign_flow`

Load pattern:

```python
import json
import pandas as pd

with open('work/BBCA_ohlcv.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

df_daily = pd.DataFrame(raw['daily']).sort_values('timestamp')
df_intraday = pd.DataFrame(raw['intraday']).sort_values('timestamp')
df_corp_actions = pd.DataFrame(raw['corp_actions']).sort_values('timestamp')
```

Operating sequence:

1. Fetch data
2. Build indicators and levels
3. Generate charts
4. Read charts
5. Run checklist and red-flag scan
6. Synthesize action and risk

## Reference Index

- [Market structure and trend](references/market-structure-and-trend.md)
- [Levels support resistance and VPVR](references/levels-support-resistance-and-vpvr.md)
- [Price action patterns and breakouts](references/price-action-patterns-and-breakouts.md)
- [Execution and risk protocol](references/execution-and-risk-protocol.md)
- [Analysis checklists and red flags](references/analysis-checklists-and-red-flags.md)
- [Output report template](references/output-report-template.md)

## Execution Defaults

- Parse JSON directly. Never use CSV readers.
- Always generate and read charts before final calls.
- Report divergence status explicitly: `No divergence`, `Divergence (unconfirmed)`, or `Divergence (confirmed)`.
- Keep stop-loss explicit in every actionable output.
