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

Planned analysis modes:

- `DEFAULT`
- `ESCALATED`

`DEFAULT` is the normal chart-first path.
`ESCALATED` is the context-triggered extension path when deeper overlays are needed.

Canonical workflow spine:

1. mode
2. state
3. location
4. setup family
5. trigger
6. confirmation
7. risk
8. decision
9. monitoring

The older 7-step summary is only the compressed operational core.
`mode` and `monitoring` should be treated as explicit wrapper phases in the future contract.

In that spine:

- daily owns thesis direction, setup context, and the main risk map
- `60m` owns trigger quality, confirmation, follow-through, and tactical timing

The AI should stay adaptive, but the default path should stay lean.

## Mode Meaning

### `DEFAULT`

Use for ordinary technical-analysis work:

- initial thesis build
- routine update
- challenged or routine thesis re-check
- most continuation and pullback reads
- normal `WAIT` decisions

It should rely on the lean default backbone only.

### `ESCALATED`

Use when the normal read is not enough.

Typical triggers:

- the user explicitly asks for deeper analysis
- reversal is central
- trap, sweep, deviation, or liquidity behavior dominates the interpretation
- the basic read cannot resolve the chart cleanly
- postmortem needs deeper structural detail
- the LLM judges that additional overlays are necessary

`ESCALATED` is not a separate doctrine bundle.
It is the same system with additional overlays or diagnostics activated.

Trigger rule:

- stay in `DEFAULT` unless an unresolved decision-relevant question requires an overlay

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
- lean MA context using `21EMA`, `50SMA`, and `200SMA`

## What Stays But Not In The Default Path

- adaptive MA as a symbol-specific overlay
- divergence as a conditional diagnostic
- imbalance as a separate context-triggered overlay path
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

`FVG` and `IFVG` should be treated under the imbalance overlay path, not silently folded into `SMC/ICT`.

## What Is Removed For Now

- Fibonacci from the active default system
- `OTE`
- first-hour volume reaches 70 percent of average daily volume
- broad default MA stack beyond the lean baseline
- mandatory divergence scanning

## MA Policy

Use two layers:

- baseline MA context: `21EMA`, `50SMA`, and `200SMA`
- adaptive MA: optional overlay only when justified

`100SMA` is not part of the lean baseline for now.

Adaptive MA should not replace baseline regime context.

Use it only when symbol-specific rhythm clearly matters for a rhythm-sensitive setup and the baseline MA context is not enough.

## Divergence Policy

Divergence is not a mandatory baseline step.

Use it only for:

- extended moves
- reversal review
- thesis degradation
- postmortem

It is a diagnostic overlay for exhaustion or weakening, not a standard ritual scan.

## SMC/ICT Policy

`SMC/ICT` remains inside technical analysis.

It is not default.

It may be invoked when:

- the user explicitly asks for it
- the LLM judges it necessary for the chart
- reversal, trap, sweep, or deviation interpretation is central
- the basic structure-first read cannot resolve the chart cleanly
- postmortem or challenged-update work needs deeper structural detail

Its role is to resolve ambiguity around liquidity behavior, not to decorate an already clear chart.

## Wyckoff Requirement

Wyckoff should include:

- current state
- historical phase sequence
- segment duration
- segment price range
- segment confidence
- maturity or degradation context

The target artifact is:

- a chart with historical phase bands
- a compact phase table

Practical interpretation:

- low-confidence fresh phases should be treated as forming context
- Wyckoff should behave as a slower context layer than trigger and confirmation logic

## Chart Artifact Direction

Keep the default daily map simple:

- use `daily_structure` as the retained daily structure artifact
- remove `daily_structure_fib` from the future default artifact set

## Timeframe Reconciliation

Recommended future rule:

- daily owns thesis
- `60m` owns trigger, confirmation, and tactical timing

Daily should control:

- state
- location
- setup family
- main risk map

`60m` should control:

- trigger quality
- follow-through
- reclaim or acceptance
- tactical timing

If daily and `60m` disagree:

- daily keeps directional authority
- `60m` may delay, downgrade, or keep the system in `WAIT`
- `60m` should not create a trade against the daily thesis by itself

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

Merge scope:

- `analysis-lifecycle-and-frameworks.md` contributes lifecycle modes, prior-context requirements, thesis-status handling, delta requirements, and non-initial trace requirements
- remove the formal lens system, alternate-lens disagreement rules, and lens-compare requirement from the future state
- relocate level-to-level path requirement into execution and risk
- relocate liquidity-draw requirement into the core workflow or liquidity references
- `level-to-level-execution.md` contributes zone-to-zone execution rules, operational workflow, trace requirements, and any helper logic worth preserving
- after merge, the standalone `analysis-lifecycle-and-frameworks.md` and `level-to-level-execution.md` files should disappear

Optional advanced references should still remain present.

## Output Contract Direction

Future output should be organized as:

- always required
- conditional
- escalated only

Every report should begin with a compact `Decision Summary` so the reader can understand the outcome before reading the detail.

Future template shape should be rewritten around the new spine:

1. `Decision Summary`
2. `Context`
3. `State And Location`
4. `Setup And Trigger`
5. `Risk And Decision`
6. `Delta And Monitoring` when non-initial
7. `Conditional Overlays` when used
8. `Evidence`

Baseline output should stay small and decision-oriented.

Recommended `Decision Summary` fields:

- action
- bias
- setup
- key level now
- invalidation
- next trigger
- confidence

Remove from the future default output contract:

- Fib sections
- `OTE`
- lens-comparison sections
- mandatory divergence section in every run
- `Lens`
- `SMC_ICT_LIGHT`
- old MA mode taxonomy such as `baseline_stack`, `adaptive_primary`, or `hybrid`
- `100SMA` from default MA posture
- `daily_structure_fib`

Reference cleanup notes:

- `setups-and-breakouts.md` must change its divergence language from always-on scanning to conditional use
- `execution-and-risk-protocol.md` must remove or conditionalize existing Fib and `OTE` residue
- `enums-and-glossary.md` must be updated for `DEFAULT` and `ESCALATED`, removed lens terms, removed default Fib and `OTE`, and new Wyckoff segment enums

When analysis moves into `ESCALATED`, record:

- escalation reason code
- escalation reason text
- overlays used
- whether escalation came from explicit request or model judgment

## Checklist And Red-Flag Direction

Future validation should be split into:

- hard mandatory gates
- conditional gates
- advisory diagnostics

Hard mandatory gates should focus on:

- valid data
- clear state
- meaningful location
- valid setup
- explicit invalidation
- next-zone path for actionable trades
- proper `WAIT` behavior when no clean path exists

Conditional gates should activate only when the related concept is used, such as:

- divergence
- `SMC/ICT`
- imbalance
- breakout filters
- adaptive MA

Fib-specific and lens-specific default gates should be removed.

## Final Mode Model

Use two axes:

### Purpose Mode

- `INITIAL`
- `UPDATE`
- `POSTMORTEM`

Within `UPDATE`, the runtime should carry:

- `thesis_status`: `intact`, `improving`, `degrading`, or `invalidated`
- `review_reason`: `routine`, `contradiction`, `level_break`, `regime_change`, or `trigger_failure`

### Depth Mode

- `DEFAULT`
- `ESCALATED`

The system should use both together rather than forcing one mode system to do both jobs.

## Planned Implementation Order

1. Create `workflow-spine.md`
2. Create `policy-contract.md`
3. Trim `SKILL.md` into a clearer router
4. Remove low-impact concepts from the default path
5. Keep optional overlays available behind explicit or adaptive escalation
6. Add Wyckoff historical-state support to the runtime state model

Wyckoff implementation note:

- the contract is defined in `wyckoff-historical-state-design.md`
- full segmentation logic and exact confidence weighting remain later-stage items

## Backtesting Direction

Use two evaluation modes:

- `full vibe`
- `ablation`

Before implementation, explicitly define:

- the state packet as a concrete schema
- daily replay versus `60m` replay responsibilities
- execution simulator assumptions
- evaluator baseline bands for judging results

Later-stage refinements may still wait:

- full Wyckoff segmentation details
- exact Wyckoff confidence weighting
- advanced backtest threshold tuning by scenario or regime

First test technical analysis in isolation with static execution assumptions.
Portfolio-management integration comes later as a second-stage desk evaluation.

In LLM-mode backtesting, record whether `ESCALATED` mode was invoked on each decision step and why.

## Current Status

This summary reflects the current discussion outcome.

It is the implementation target for the next skill refactor pass.
