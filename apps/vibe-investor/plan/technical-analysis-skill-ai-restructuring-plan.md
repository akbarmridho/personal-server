# Technical Analysis Skill AI Restructuring Plan

## Purpose

This file records the restructuring result of the `technical-analysis` skill and the remaining cleanup work.

It is no longer a proposal for adding the core contract layer.
That work is already complete.

## Completed Restructuring

The major AI-facing restructuring is already done.

Completed outcomes:

- `SKILL.md` is now a thin router
- `workflow-spine.md` exists and owns runtime sequencing
- `policy-contract.md` exists and owns the runtime decision contract
- lifecycle content was merged into `workflow-spine.md`
- level-to-level execution content was merged into `execution-and-risk-protocol.md`
- supporting references were cleaned to match the new contract

This means the skill no longer requires the AI to reconstruct the main workflow from scattered files the way it did before.

## Current Skill Shape

### Top-level owner

- `SKILL.md`

### Runtime contract owners

- `references/workflow-spine.md`
- `references/policy-contract.md`

### Supporting doctrine refs

- `market-structure-and-trend.md`
- `levels.md`
- `volume-profile-and-volume-flow.md`
- `liquidity-draw-and-sweep.md`
- `setups-and-breakouts.md`
- `execution-and-risk-protocol.md`
- `checklists-and-red-flags.md`
- `enums-and-glossary.md`
- `output-report-template.md`

## What Still Needs Cleanup

The remaining work is not structural centralization anymore.
It is doctrine cleanup.

### 1. Freeze the core doctrine

Core should remain:

- structure and trend
- support/resistance and location
- daily thesis plus `60m` timing
- lean MA regime
- trigger / confirmation / invalidation / risk

### 2. Mark non-core layers more aggressively

The skill docs should now reflect the accepted direction:

- adaptive MA is non-core unless later proven

### 3. Narrow Wyckoff

Wyckoff should remain:

- a slower separate state layer
- a contextual read
- support for `S5`

Wyckoff should not continue drifting toward a dominant doctrine inside the ordinary runtime path.

### 4. Align docs with IDX backtest reality

The skill plan set should now reflect:

- session and auction awareness
- ARB / ARA aware execution assumptions
- liquidity and board eligibility gates
- mandatory corporate-action handling for backtesting

## Recommended Documentation Priority

The next documentation cleanup should focus on:

1. `backtesting-and-system-design.md`
2. `technical-analysis-approach-brief-for-validation.md`
3. `wyckoff-historical-state-design.md`

## What This File No Longer Needs To Contain

This file should not continue carrying:

- long proposals for adding `workflow-spine.md`
- long proposals for adding `policy-contract.md`
- merge plans that are already completed
- old future-state descriptions that conflict with the live repo state
