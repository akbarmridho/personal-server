# Technical Backtest

Daily-only replay runner for technical-analysis backtests.

Current scope:

- daily-only replay
- deterministic ablation policy only
- one symbol per scenario
- one replay window per scenario
- optional comparison against actual trade outcome

Not included yet:

- `1m -> 15m` replay
- LLM / full-vibe mode
- corporate-action replay
- portfolio-management constraints

## Files

- `backtest_manifest.py`
  Validates the scenario manifest.
- `build_daily_ta_context.py`
  Builds daily-only deterministic TA context for one visible snapshot.
- `policy_ablation.py`
  Maps daily context into deterministic `BUY` / `HOLD` / `WAIT` / `EXIT`.
- `execution.py`
  Handles pending setups, pending orders, open positions, exits, and trade serialization.
- `run_backtest.py`
  Main replay runner.
- `backtest-scenario-manifest.schema.json`
  JSON schema for the scenario manifest.
- `backtest-scenario-manifest.example.json`
  Example scenario manifest.
- `LLM_SCENARIO_PROMPT.md`
  Copy-paste prompt for asking another LLM to generate scenario JSON.

## Input Contract

The runner expects a manifest JSON with this shape:

```json
{
  "scenarios": [
    {
      "id": "bbca-2025-01-window-01",
      "symbol": "BBCA",
      "ohlcv_path": "data/bbca_2025_q1_daily.json",
      "window_start_date": "2025-01-10",
      "window_end_date": "2025-02-14",
      "initial_position": {
        "state": "long",
        "entry_date": "2025-01-08",
        "entry_price": 9875,
        "size": 1
      },
      "actual_trade": {
        "exit_date": "2025-02-03",
        "exit_price": 10350
      }
    }
  ]
}
```

Required scenario fields:

- `id`
- `symbol`
- `ohlcv_path`
- `window_start_date`
- `window_end_date`
- `initial_position`

`initial_position.state`:

- `flat`
- `long`

If `state = "long"`, include:

- `entry_date`
- `entry_price`

Optional:

- `size`
- `actual_trade`
- `notes`

## OHLCV File Contract

The runner uses daily-only OHLCV in the same JSON shape already used by the TA scripts.

Minimum required payload:

```json
{
  "daily": [
    {
      "timestamp": 1735779600,
      "datetime": "2025-01-02T09:00:00+07:00",
      "date": "2025-01-02",
      "open": 1000,
      "high": 1015,
      "low": 995,
      "close": 1010,
      "volume": 100000,
      "value": 100000000
    }
  ],
  "corp_actions": []
}
```

Notes:

- `intraday_1m` is not required for this runner
- `corp_actions` is currently ignored but allowed

## Validate The Manifest

```bash
python3 apps/vibe-investor/backtest/technical/backtest_manifest.py \
  --input apps/vibe-investor/backtest/technical/backtest-scenario-manifest.example.json
```

To also verify that each `ohlcv_path` exists:

```bash
python3 apps/vibe-investor/backtest/technical/backtest_manifest.py \
  --input path/to/manifest.json \
  --check-files
```

## Run The Backtest

```bash
python3 apps/vibe-investor/backtest/technical/run_backtest.py \
  --manifest path/to/manifest.json \
  --outdir path/to/output
```

Optional flags:

- `--modules core,vpvr,breakout`
- `--min-rr-required 1.2`
- `--check-files`

Example:

```bash
python3 apps/vibe-investor/backtest/technical/run_backtest.py \
  --manifest apps/vibe-investor/backtest/technical/backtest-scenario-manifest.example.json \
  --outdir apps/vibe-investor/backtest/technical/work/example-run
```

## Output Layout

The runner writes:

- `batch_result.json`
- one folder per scenario

Inside each scenario folder:

- `result.json`
- `contexts/*.json`

`batch_result.json` contains:

- batch summary
- all scenario results

Each scenario `result.json` contains:

- input scenario details
- `daily_action_log`
- `trade_ledger`
- `open_position` if still open at the end
- `scenario_summary`

## Execution Rules In V1

Current replay rules:

- daily-only signal processing
- next valid daily open entries
- one live long position per symbol
- stale setup expiry
- stop wins on same-bar ambiguity
- no same-day re-entry after exit

Current policy mode:

- deterministic ablation only
- no LLM calls

## Recommended First Run

Start with a small batch:

- 5 to 10 real trade windows
- mix of `flat` and `long` starts
- keep notes short

Use the first run to inspect:

- daily action sequence
- entry timing
- hold vs exit behavior
- stop / target handling
- comparison against your actual trade
