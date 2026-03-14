# Technical Analysis Implementation State

## Snapshot

- Date: `2026-03-14`
- Scope: `apps/vibe-investor/.opencode-config/skills/technical-analysis`
- Status: contract layer, script-cleanup pass, adaptive MA chart modes, and review-sync fixes implemented

## What Has Been Read

- `apps/vibe-investor/plan/technical-analysis-skill-ai-restructuring-plan.md`
- `apps/vibe-investor/plan/technical-analysis-refactor-summary.md`
- `apps/vibe-investor/plan/technical-analysis-script-migration-plan.md`
- `apps/vibe-investor/plan/human-technical-analyst-workflow.md`
- `apps/vibe-investor/plan/backtesting-and-system-design.md`
- `apps/vibe-investor/plan/wyckoff-historical-state-design.md`
- `apps/vibe-investor/plan/technical-analysis-core-contract-decisions.md`
- `apps/vibe-investor/.opencode-config/skills/technical-analysis/SKILL.md`
- current live references and scripts under `apps/vibe-investor/.opencode-config/skills/technical-analysis/`

## Current Repo Reality

The live technical-analysis skill now follows the new contract for the core runtime path.

Remaining gaps:

- no real Wyckoff history state implementation in this packet
- no Wyckoff history chart artifact yet
- no backtest engine work yet

New contract layer now exists:

- `references/workflow-spine.md`
- `references/policy-contract.md`
- field-level future `ta_context` schema in `policy-contract.md`

## Decision

Do not start with script edits.

Because the skill has not been updated yet, the next work must be contract-first inside the skill docs. The script migration plan also says script cleanup should wait until the field-level `ta_context.json` target schema is explicit.

## Immediate Next Step

Implement Wyckoff historical-state support:

1. add `current_wyckoff_phase` support beyond the single label
2. add `wyckoff_history`
3. add `wyckoff_current_confidence` and `wyckoff_current_maturity` with stronger logic
4. add the future Wyckoff history chart artifact

The first blocking contract dependency is now present:

- `references/workflow-spine.md`
- `references/policy-contract.md`
- concrete future `ta_context` schema inside `policy-contract.md`
- router-style `SKILL.md` pointing to the new contract files

## Recommended Execution Order

1. Create `workflow-spine.md`.
2. Create `policy-contract.md` with the target `ta_context` schema.
3. Trim `SKILL.md` into a router aligned to `INITIAL` / `UPDATE` / `POSTMORTEM` and `DEFAULT` / `ESCALATED`.
4. Merge `analysis-lifecycle-and-frameworks.md` into `workflow-spine.md`.
5. Merge `level-to-level-execution.md` into `execution-and-risk-protocol.md`.
6. Clean supporting references:
   - `output-report-template.md`
   - `checklists-and-red-flags.md`
   - `enums-and-glossary.md`
   - `setups-and-breakouts.md`
   - `levels.md`
   - `execution-and-risk-protocol.md`
7. Only then update scripts:
   - `build_ta_context.py`
   - `generate_ta_charts.py`
8. After script contract is stable, start backtesting design implementation.

## Next Concrete Writing Target

The first artifact to write should define:

- canonical phase order: `MODE -> STATE -> LOCATION -> SETUP -> TRIGGER -> CONFIRMATION -> RISK -> DECISION -> MONITORING`
- purpose mode: `INITIAL` / `UPDATE` / `POSTMORTEM`
- depth mode: `DEFAULT` / `ESCALATED`
- daily vs `60m` authority split
- escalation rules and reason codes
- required evidence before `BUY`, `HOLD`, `WAIT`, `EXIT`
- allowed setup family space: `S1` to `S5` or `NO_VALID_SETUP`
- baseline MA posture: `21EMA`, `50SMA`, `200SMA`
- conditional overlay rules for divergence, imbalance, adaptive MA, and `SMC/ICT`
- Wyckoff historical-state packet fields

## Not Started Yet

- Wyckoff history state implementation
- Wyckoff history chart artifact implementation
- backtest engine work

## Done

- created `references/workflow-spine.md`
- created `references/policy-contract.md`
- locked the first concrete future `ta_context` packet schema
- rewrote `SKILL.md` into a thin router aligned to `INITIAL` / `UPDATE` / `POSTMORTEM` and `DEFAULT` / `ESCALATED`
- merged lifecycle requirements from `analysis-lifecycle-and-frameworks.md` into `references/workflow-spine.md`
- merged `level-to-level-execution.md` into `references/execution-and-risk-protocol.md`
- removed standalone `references/level-to-level-execution.md`
- cleaned `references/output-report-template.md`
- cleaned `references/checklists-and-red-flags.md`
- cleaned `references/enums-and-glossary.md`
- cleaned `references/setups-and-breakouts.md`
- cleaned `references/levels.md`
- cleaned `build_ta_context.py` baseline payload
- cleaned `generate_ta_charts.py` baseline artifact set
- validated script outputs using `script-test/BUMI_ohlcv_20260311.json`
- moved adaptive MA selection into shared script helpers
- replaced daily chart MA modes with `hybrid` default and `baseline` alternative
- upgraded adaptive MA selection from simple slope bias to a respect-score model
- updated runtime docs so hybrid charting is the default visual context
- validated baseline and hybrid chart outputs using `script-test/BUMI_ohlcv_20260311.json`
- added `F19_MA_WHIPSAW` so repeated MA crossing is surfaced in `ta_context`
- validated whipsaw red-flag output using `script-test/MEDC_ohlcv_20260311.json`
- aligned red-flag IDs between runtime docs and scripts
- removed chart-artifact attachment from `ta_context`; chart generation stays a separate step
- kept `wyckoff_history` as `[]` because historical Wyckoff state belongs to a separate state layer
- aligned `value_acceptance_state` enums between packet schema and runtime output
- wired the `smc` module into the main deterministic pipeline for enrichment checks

## Guardrails

- Do not edit scripts before the target runtime schema is locked.
- Do not carry forward lens-system residue into the new contract.
- Do not carry forward default Fib / `OTE` sections into the new contract.
- Do not keep `100SMA` in the lean default baseline.
- Do not keep divergence as a mandatory baseline step.
