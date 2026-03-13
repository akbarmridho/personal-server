# Technical Analysis Refactor Summary

## Goal

Simplify the `technical-analysis` skill for now.

This summary is a future-state implementation target.
It is the current discussion outcome, not a statement that the live skill has already been brought into alignment.

The immediate objective is not to make it complete.
The immediate objective is to make it:

- cleaner for AI
- smaller in default scope
- more consistent in workflow
- less noisy in default analysis

## Core Direction

Keep the skill focused on chart-based technical analysis.

Default workflow spine:

1. state
2. location
3. setup family
4. trigger
5. confirmation
6. risk
7. action

The AI should stay adaptive, but the default path should stay lean.

## What Stays In The Default Backbone

- market structure and regime
- horizontal support and resistance zones
- chart-first reading
- breakout quality and follow-through
- Wyckoff as context
- Wyckoff historical phase timeline, not only current state
- VPVR and value-area context
- level-to-level execution
- risk-first discipline
- daily thesis with `60m` timing refinement
- lean MA context using `21EMA` and `50SMA`

## What Stays But Not In The Default Path

- adaptive MA as a symbol-specific overlay
- divergence as a conditional diagnostic
- `FVG`
- `IFVG`
- `OB`
- `Breaker`
- premium/discount
- `SMC/ICT` modules

These remain available inside technical analysis, but only when:

- the user explicitly asks
- the LLM judges they are necessary
- or clear escalation conditions are met

## What Is Removed For Now

- Fibonacci from the active default system
- `OTE`
- first-hour volume reaches 70 percent of average daily volume
- large default MA stack
- mandatory divergence scanning

## MA Policy

Use two layers:

- baseline MA context: `21EMA` and `50SMA`
- adaptive MA: optional overlay only when justified

Adaptive MA should not replace baseline regime context.

## Divergence Policy

Divergence is not a mandatory baseline step.

Use it only for:

- extended moves
- reversal review
- thesis degradation
- postmortem

## SMC/ICT Policy

`SMC/ICT` remains inside technical analysis.

It is not default.

It may be invoked when:

- the user explicitly asks for it
- the LLM judges it necessary for the chart
- reversal, trap, sweep, or deviation interpretation is central
- the basic structure-first read cannot resolve the chart cleanly
- postmortem or thesis review needs deeper structural detail

## Wyckoff Requirement

Wyckoff should include:

- current state
- historical phase sequence
- segment duration
- segment confidence
- maturity or degradation context

The target artifact is:

- a chart with historical phase bands
- a compact phase table

## Planned Skill Structure

Keep the skill compact.

Target structure:

- `SKILL.md`
- `references/workflow-spine.md` new
- `references/policy-contract.md` new
- existing doctrine references kept where useful

Planned consolidation:

- merge `analysis-lifecycle-and-frameworks.md` into `workflow-spine.md`
- merge `level-to-level-execution.md` into `execution-and-risk-protocol.md`

Optional advanced references should still remain present.

## Planned Implementation Order

1. Create `workflow-spine.md`
2. Create `policy-contract.md`
3. Trim `SKILL.md` into a clearer router
4. Remove low-impact concepts from the default path
5. Keep optional overlays available behind explicit or adaptive escalation
6. Add Wyckoff historical-state support to the runtime state model

## Backtesting Direction

Use two evaluation modes:

- `full vibe`
- `ablation`

First test technical analysis in isolation with static execution assumptions.
Portfolio-management integration comes later as a second-stage desk evaluation.

## Current Status

This summary reflects the current discussion outcome.

It is the implementation target for the next skill refactor pass.
