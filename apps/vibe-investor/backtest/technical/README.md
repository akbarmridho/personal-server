# Technical Backtest

Daily-only replay runner for technical-analysis backtests.

## Usage

```bash
python3 run_backtest.py \
  --manifest path/to/manifest.json \
  --outdir path/to/output
```

Flags:

- `--modules core,vpvr,breakout` — TA modules (default: `core,vpvr,breakout`)
- `--min-rr-required 1.2` — minimum RR for actionable entry (default: `1.2`)
- `--check-files` — require OHLCV files to exist before starting

## Structure

```
technical/
  run_backtest.py                  # single entrypoint
  lib/
    manifest.py                    # scenario manifest dataclasses + loader
    execution.py                   # position/trade dataclasses + helpers
    policy.py                      # ablation policy (PolicyDecision + evaluate)
    strategies.py                  # baseline strategies + dispatchers
    context.py                     # daily TA context builder (subprocess)
    report.py                      # markdown report builder
  backtest-scenario-manifest.schema.json
  backtest-scenario-manifest.example.json
  LLM_SCENARIO_PROMPT.md
```

## Manifest shape

```json
{
  "scenarios": [{
    "id": "bbca-2025-01-window-01",
    "symbol": "BBCA",
    "ohlcv_path": "data/bbca_2025_q1_daily.json",
    "window_start_date": "2025-01-10",
    "window_end_date": "2025-02-14",
    "initial_position": { "state": "long", "entry_date": "2025-01-08", "entry_price": 9875, "size": 1 },
    "actual_trade": { "exit_date": "2025-02-03", "exit_price": 10350 }
  }]
}
```

`initial_position.state`: `flat` or `long`. If `long`, include `entry_date` and `entry_price`.

## Output

- `batch_result.json` — full results with strategy comparisons
- `batch_report.md` — readable markdown report
- `<scenario_id>/result.json` — per-scenario result
- `<scenario_id>/contexts/*.json` — daily TA context snapshots
