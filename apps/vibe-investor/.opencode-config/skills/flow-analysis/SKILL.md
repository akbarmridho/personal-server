# Flow Analysis

Build deterministic broker-flow context for Indonesian stocks from normalized daily broker summaries and daily OHLCV.

## Scope

This skill owns:

- gross-versus-net broker-flow reading discipline
- broker sponsor-quality features
- accumulation versus distribution lean
- concentration, persistence, anomaly, and trust features
- flow-to-price timing context for parent synthesis

This skill does not own:

- chart structure
- setup family
- trigger logic
- stop or target placement
- final trade action

Those remain under `technical-analysis` and the parent workflow.

## Required Inputs

1. `fetch-broker-flow` output JSON
2. `fetch-ohlcv` output JSON

If either fetch fails, stop.

## Deterministic Builder

Run:

```bash
python3 apps/vibe-investor/.opencode-config/skills/flow-analysis/scripts/build_flow_context.py \
  --broker-flow {FETCH_BROKER_FLOW_OUTPUT_PATH} \
  --ohlcv {FETCH_OHLCV_OUTPUT_PATH} \
  --symbol {SYMBOL} \
  --output {FLOW_CONTEXT_OUTPUT_PATH} \
  --purpose-mode {INITIAL|UPDATE|POSTMORTEM}
```

Rules:

- use the exact JSON produced by `fetch-broker-flow`
- use the exact JSON produced by `fetch-ohlcv`
- the builder produces deterministic `flow_context.json`
- `30` trading days is the primary read
- `60` trading days is the trust window when available

## V1 Focus

The first builder keeps scope narrow:

- `CADI`
- broker-side `VWAP` deviation
- `GVPR`
- top buyer / seller share
- `HHI`
- persistence
- overlap-based wash / anomaly risk
- liquidity and market-cap trust regime
- lead / confirm / warning timing context

These stay out of v1 deterministic truth:

- `MFI` without a defensible raw-contract formula
- `SMT` as a base truth source
- `Gini` as the primary concentration backbone under top-25 truncation
