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
- `--policy-mode deterministic|llm_dry_run|llm_hybrid` — ablation replay mode
- `--llm-model gpt-5.4-mini` — Codex model for LLM replay modes
- `--llm-max-parallel 4` — max concurrent scenario workers in LLM replay modes
- `--llm-infer-soft-limit 10` — per-scenario soft budget before the gate becomes stricter
- `--scenario-id <ID>` — run only selected scenario ids
- `--ablation-only` — run only the ablation strategy

Low-usage dry-run sample:

```bash
python3 run_backtest.py \
  --manifest scenario-data/scenario.json \
  --outdir work/llm-dry-run-one \
  --policy-mode llm_dry_run \
  --ablation-only \
  --scenario-id ptba-2026-03-manage-01 \
  --llm-max-parallel 1 \
  --llm-infer-soft-limit 10
```

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
  LLM_BACKTEST_PLAN.md
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

In LLM replay modes, each scenario also gets:

- `<scenario_id>/codex/prompts/` — doctrine and per-bar prompt artifacts
- `<scenario_id>/codex/packets/` — per-bar compact state packets
- `<scenario_id>/codex/charts/` — daily-only chart attachments for infer-worthy bars
- `<scenario_id>/codex/responses/` — Codex response payloads and JSONL event logs
- `<scenario_id>/codex/cache/` — cache entries keyed by prompt and packet signature
- `<scenario_id>/codex/work/` — isolated scenario workdir for `codex exec`

## LLM Modes

`llm_dry_run`:

- runs the `worth_to_infer` gate
- does not call Codex
- records how many bars would have triggered inference
- is the recommended first pass before any live LLM replay

`llm_hybrid`:

- runs deterministic TA preprocessing first
- replays the ablation path sequentially per scenario
- calls Codex only on infer-worthy bars
- carries forward explicit memory from prior inference

The gate becomes stricter after `--llm-infer-soft-limit` inferred bars in a scenario:

- before the soft limit, both critical and secondary state changes may trigger inference
- after the soft limit, only critical state changes trigger inference
