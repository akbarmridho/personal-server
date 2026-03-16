You are helping me build scenario manifests for a daily-only technical backtest engine.

Your task is to produce scenario JSON for real-trade replay windows.

Output requirements:

- Output JSON only.
- The root object must contain a `scenarios` array.
- Each scenario must represent one symbol and one replay window.
- Use only real trade periods from my history.
- Do not invent synthetic scenarios.
- Do not add commentary outside the JSON.

Scenario rules:

- Backtest v1 is daily-only.
- One symbol per scenario.
- One replay window per scenario.
- A scenario may start either `flat` or `long`.
- Use `flat` when the window is meant to test whether the system should enter.
- Use `long` when the window begins after I already entered and the goal is to test hold, take-profit, or cut-loss behavior.
- Prefer focused windows around actual trade episodes or management periods.
- Keep optional notes short and useful.
- If actual trade details are incomplete, omit unknown fields instead of inventing them.

Required JSON shape:

```json
{
  "scenarios": [
    {
      "id": "string",
      "symbol": "ABCD",
      "ohlcv_path": "string",
      "window_start_date": "YYYY-MM-DD",
      "window_end_date": "YYYY-MM-DD",
      "initial_position": {
        "state": "flat"
      }
    }
  ]
}
```

Allowed scenario fields:

- `id`
- `symbol`
- `ohlcv_path`
- `window_start_date`
- `window_end_date`
- `initial_position`
- `actual_trade`
- `notes`

`initial_position` rules:

- `state` must be `flat` or `long`
- if `state` is `long`, include:
  - `entry_date`
  - `entry_price`
  - optional `size`

`actual_trade` rules:

- include only when I want comparison against what I actually did
- may include:
  - `entry_date`
  - `entry_price`
  - `exit_date`
  - `exit_price`
  - `notes`

What I want from you:

1. Propose a clean batch of replay scenarios based on my real trades.
2. Choose replay windows that are long enough to evaluate the decision, but still focused on the trade.
3. Decide whether each scenario should start `flat` or `long`.
4. Fill `actual_trade` only when the historical details are known.
5. Use placeholder `ohlcv_path` values if the final filenames are not known yet, but keep them realistic and consistent.

Formatting rules:

- Use uppercase 4-letter symbols.
- Use ISO dates in `YYYY-MM-DD`.
- Keep IDs stable and readable.
- Keep the output compact and valid.

Example output:

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
      },
      "notes": "Management window after the original entry."
    },
    {
      "id": "tlkm-2025-02-window-01",
      "symbol": "TLKM",
      "ohlcv_path": "data/tlkm_2025_q1_daily.json",
      "window_start_date": "2025-02-03",
      "window_end_date": "2025-03-07",
      "initial_position": {
        "state": "flat",
        "size": 1
      },
      "actual_trade": {
        "entry_date": "2025-02-10",
        "entry_price": 2780,
        "exit_date": "2025-02-24",
        "exit_price": 2860
      }
    }
  ]
}
```
