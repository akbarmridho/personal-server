# Technical Analysis Implementation State

## Snapshot

- Date: `2026-03-15`
- Scope: `apps/vibe-investor/.opencode-config/skills/technical-analysis`
- Status: core contract refactor and first script migration pass complete; doctrine freeze and backtest-contract cleanup are next

## What Has Been Read

- `apps/vibe-investor/plan/technical-analysis-skill-ai-restructuring-plan.md`
- `apps/vibe-investor/plan/technical-analysis-script-migration-plan.md`
- `apps/vibe-investor/plan/human-technical-analyst-workflow.md`
- `apps/vibe-investor/plan/backtesting-and-system-design.md`
- `apps/vibe-investor/plan/wyckoff-historical-state-design.md`
- `apps/vibe-investor/plan/technical-analysis-methodology-validation-memo.md`
- `apps/vibe-investor/plan/technical-analysis-methodology-validation-deep-research-prompt.md`
- `apps/vibe-investor/plan/technical-analysis-approach-brief-for-validation.md`
- `apps/vibe-investor/plan/technical-analysis-next-steps-summary.md`
- `apps/vibe-investor/plan/technical-analysis-core-contract-decisions.md`
- `apps/vibe-investor/.opencode-config/skills/technical-analysis/SKILL.md`
- current live references and scripts under `apps/vibe-investor/.opencode-config/skills/technical-analysis/`

## Current Repo Reality

The live technical-analysis skill now follows the new contract for the core runtime path.

Remaining gaps:

- no real Wyckoff history state implementation in this packet
- no Wyckoff history chart artifact yet
- no backtest engine work yet
- doctrine stack still needs cleanup to reflect the accepted core vs non-core split
- IDX-specific backtest realism is not yet written into the active execution rules

New contract layer now exists:

- `references/workflow-spine.md`
- `references/policy-contract.md`
- field-level future `ta_context` schema in `policy-contract.md`

Current direction is now frozen at a higher level:

- keep the core method structure-first and risk-first
- treat `adaptive MA` as non-core unless later backtests prove value
- keep Wyckoff as a narrower separate state layer plus `S5`, not as the main thesis engine
- tighten the backtest plan around IDX-specific mechanics and simpler baselines

## Active Next Step

Clean the active plan and doctrine files so they reflect the current accepted direction:

- freeze the core doctrine
- mark non-core layers clearly
- narrow Wyckoff to the separate-state role
- add IDX-specific backtest assumptions
- define the three required simple baselines before more feature expansion

## Not Started Yet

- Wyckoff history state implementation
- Wyckoff history chart artifact implementation
- backtest engine work
- formal simple-baseline rule specs:
  - trend plus pullback
  - breakout plus volume
  - range-reclaim
- liquidity gate for `60m` timing
- corporate-action-aware backtest behavior
- IDX-specific execution assumptions in the backtest design

## Done

- added `technical-analysis-approach-brief-for-validation.md`
- added `technical-analysis-methodology-validation-memo.md`
- added `technical-analysis-methodology-validation-deep-research-prompt.md`
- added `technical-analysis-next-steps-summary.md`
- created `references/workflow-spine.md`
- created `references/policy-contract.md`
- removed obsolete `technical-analysis-refactor-summary.md`
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
- completed external methodology and Wyckoff research review
- tightened the runtime overlays to adaptive MA only
- decided to treat `adaptive MA` as non-core unless later backtests justify it
- decided to keep Wyckoff in a narrower role: separate historical-state layer plus `S5`

## Guardrails

- Do not reintroduce old contract sequencing that has already been completed.
- Do not carry forward lens-system residue into the new contract.
- Do not carry forward default Fib / `OTE` sections into the new contract.
- Do not keep `100SMA` in the lean default baseline.
