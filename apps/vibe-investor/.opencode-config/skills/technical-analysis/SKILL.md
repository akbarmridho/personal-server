---
name: technical-analysis
description: Technical-analysis helper for IDX stocks used to refine entry, exit, timing, and risk inside a broader investment process, with deterministic preprocessing and bounded decision output.
---

## Scope

Use this skill to perform technical analysis for:

- entry timing
- exit timing
- invalidation
- trade path and risk map

Time horizon:

- swing
- medium-term position
- long-term position

Use:

- `daily[]` for thesis direction and main risk map
- `intraday[]` `60m` for trigger, confirmation, and tactical timing
- optional `corp_actions[]` when available

## Runtime Modes

### Purpose Mode

- `INITIAL`
- `UPDATE`
- `POSTMORTEM`

### Depth Mode

- `DEFAULT`
- `ESCALATED`

The meaning and rules for these modes are owned by:

- `references/workflow-spine.md`
- `references/policy-contract.md`

## Mandatory Load Order

For every run:

1. determine `purpose_mode`
2. determine whether the run stays in `DEFAULT` or requires `ESCALATED`
3. load `references/workflow-spine.md`
4. load `references/policy-contract.md`
5. load only the topic references required by the active branch
6. run deterministic preprocessing and chart generation
7. decide using the bounded contract
8. render the answer using `references/output-report-template.md`

Do not infer the workflow from topic references alone.

## Reference Routing

Always load:

- `references/workflow-spine.md`
- `references/policy-contract.md`

Load by need:

- `STATE` -> `references/market-structure-and-trend.md`
- `LOCATION` -> `references/levels.md`, `references/volume-profile-and-volume-flow.md`, `references/liquidity-draw-and-sweep.md`
- `SETUP`, `TRIGGER`, `CONFIRMATION` -> `references/setups-and-breakouts.md`
- `RISK`, `DECISION`, `MONITORING` -> `references/execution-and-risk-protocol.md`
- imbalance overlay -> `references/fair-value-gap-and-imbalances.md`
- `SMC/ICT` overlay -> `references/smart-money-concepts.md`
- validation only -> `references/checklists-and-red-flags.md`
- enums only -> `references/enums-and-glossary.md`
- output only -> `references/output-report-template.md`

## Required Data And Fail-Fast

Use `fetch-ohlcv` as the only chart-data source.

Required arrays:

- `daily[]`
- `intraday[]`

Optional array:

- `corp_actions[]`

Expected price fields:

- `timestamp`
- `datetime`
- `date`
- `open`
- `high`
- `low`
- `close`
- `volume`
- `value`

If any required array is missing or empty, stop analysis and report dependency failure.
If `fetch-ohlcv` fails, stop analysis.

Price-adjustment contract:

- prices are split-style adjusted
- prices are not dividend-adjusted

## Deterministic Runtime Steps

The deterministic layer is mandatory.

1. fetch and validate OHLCV
2. build `ta_context`
3. generate chart artifacts
4. read chart artifacts before final synthesis
5. cross-check chart observations against deterministic evidence

Do not skip chart generation.
Do not skip chart reading.

## Context Build

Run the context builder before policy reasoning.

```bash
python scripts/build_ta_context.py \
  --input {FETCH_OHLCV_OUTPUT_PATH} \
  --symbol {SYMBOL} \
  --outdir work \
  --modules core,vpvr,breakout
```

Use escalated modules only when the workflow requires them:

- add `imbalance` when imbalance overlay is active
- add `smc` when `SMC/ICT` overlay is active

Input contract:

- `--input` must use the exact JSON returned by `fetch-ohlcv`

Output contract:

- deterministic `ta_context` JSON for policy reasoning

If the active workflow specifies a retained artifact directory, write outputs there instead of `work/`.

## Chart Build

Run the chart generator before final reasoning.

```bash
python scripts/generate_ta_charts.py \
  --input {FETCH_OHLCV_OUTPUT_PATH} \
  --symbol {SYMBOL} \
  --outdir work \
  --modules core,vpvr \
  --overlays {OVERLAYS} \
  --ma-mode {DAILY_MA_MODE}
```

Use escalated chart modules only when required:

- add `imbalance` when imbalance overlay is active

Daily chart MA mode:

- `hybrid` -> `EMA21` + `SMA50` + `SMA200` plus highlighted chosen `SMA{n}`
- `baseline` -> `EMA21` + `SMA50` + `SMA200`

Rules:

- default to `hybrid`
- use `baseline` only when a lean static read is preferred
- hybrid charting does not by itself mean adaptive MA changed the decision
- read the chart evidence manifest for the selected MA mode, adaptive period, and respect details

Input contract:

- `--input` must use the exact JSON returned by `fetch-ohlcv`

Output contract:

- chart artifacts
- chart evidence JSON

The runtime should read the generated chart evidence manifest and use the artifact paths it provides.
Do not hardcode chart names in the final answer if the manifest already provides the paths.

## Core Runtime Rules

- treat `daily` as thesis authority
- treat `60m` as timing authority
- use one setup family or `NO_VALID_SETUP`
- use one final action: `BUY`, `HOLD`, `WAIT`, or `EXIT`
- default to `WAIT` under unresolved contradiction
- do not let overlays override structure, trigger, invalidation, and risk
- keep baseline MA context lean
- use overlays only when `workflow-spine.md` and `policy-contract.md` permit them
- treat hybrid charting as default visual context, not as automatic decision escalation

## Output Contract

The final answer must follow:

- `references/output-report-template.md`

The output must begin with a compact `Decision Summary`.

The answer must include:

- purpose mode
- depth mode
- selected setup family or `NO_VALID_SETUP`
- final action
- confidence
- invalidation
- next trigger
- monitoring conditions
- chart evidence references

## Execution Defaults

- parse JSON directly
- when invoked by a parent workflow, use the mode and output paths provided by that workflow
- for `UPDATE` and `POSTMORTEM`, require prior thesis context
- after the technical answer, add one short plain-language wrap-up with bias, key level, and immediate action
- for actionable output, always include invalidation and stop-loss
- when evidence is mixed, prefer `WAIT`

## Runtime Owners

This file owns:

- scope
- runtime load order
- deterministic tool invocation
- reference routing
- fail-fast behavior

This file does not own:

- phase sequencing detail
- action policy detail
- field-level state schema
- topic doctrine
- output layout detail

Those are owned by:

- `references/workflow-spine.md`
- `references/policy-contract.md`
- topic references
- `references/output-report-template.md`

## Runtime Files

- `references/workflow-spine.md`
- `references/policy-contract.md`
- `references/market-structure-and-trend.md`
- `references/levels.md`
- `references/volume-profile-and-volume-flow.md`
- `references/liquidity-draw-and-sweep.md`
- `references/setups-and-breakouts.md`
- `references/execution-and-risk-protocol.md`
- `references/fair-value-gap-and-imbalances.md`
- `references/smart-money-concepts.md`
- `references/checklists-and-red-flags.md`
- `references/enums-and-glossary.md`
- `references/output-report-template.md`
- `scripts/build_ta_context.py`
- `scripts/generate_ta_charts.py`
- `scripts/ta_common.py`
