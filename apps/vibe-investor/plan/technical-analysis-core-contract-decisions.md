# Technical Analysis Core Contract Decisions

## Purpose

This document isolates the two most important refactor decisions:

- `workflow-spine.md` scope and canonical phase order
- `policy-contract.md` scope and decision contract

This is a future-state planning note.
It is intended to stay shorter and more operational than the broader restructuring documents.

## 1. `workflow-spine.md` Scope

`workflow-spine.md` should be the single source of truth for how the AI performs technical analysis in order.

It should own:

- the canonical analysis phase order
- what each phase is trying to answer
- what evidence is required before moving forward
- what decisions are allowed at each phase
- when to stop and output `WAIT`
- when to stay in `DEFAULT`
- when to move into `ESCALATED`
- how non-initial modes fit into the same flow
- how daily thesis and `60m` timing interact
- how current and historical Wyckoff state fit into the flow

The detailed future contract for historical Wyckoff state should live in:

- `wyckoff-historical-state-design.md`

It should absorb orchestration currently scattered across:

- `SKILL.md`
- `analysis-lifecycle-and-frameworks.md`
- parts of `checklists-and-red-flags.md`

From `analysis-lifecycle-and-frameworks.md`, keep:

- mode definitions
- prior-analysis input contract
- thesis status model
- delta requirements for non-initial modes
- non-initial trace requirements

From `analysis-lifecycle-and-frameworks.md`, remove from future state:

- the formal lens system
- alternate-lens disagreement rules
- any lens-compare requirement

Relocate:

- level-to-level path requirement into execution and risk
- liquidity-draw requirement into the workflow spine or liquidity references

It should not own:

- deep doctrine details for every concept
- output formatting rules
- script implementation details
- large glossary sections

Those belong elsewhere.

## 2. Canonical Phase Order

The canonical workflow should be:

1. `MODE`
2. `STATE`
3. `LOCATION`
4. `SETUP`
5. `TRIGGER`
6. `CONFIRMATION`
7. `RISK`
8. `DECISION`
9. `MONITORING`

This is the recommended compressed spine.

### Phase Meaning

#### 1. `MODE`

Question:

- what job is being done right now?

Possible values:

- `INITIAL`
- `UPDATE`
- `THESIS_REVIEW`
- `POSTMORTEM`

This phase determines:

- whether prior thesis context is required
- whether delta assessment is required
- whether the output is oriented toward entry, maintenance, invalidation, or learning

#### 2. `STATE`

Question:

- what is the market state and regime?

Core outputs:

- `state`
- `regime`
- `trend_bias`
- `wyckoff_context`
- `wyckoff_history`

This phase is daily-first.

It should answer:

- trend, range, or transition
- whether price is in value or repricing
- whether the current Wyckoff phase is early, mature, or degrading

#### 3. `LOCATION`

Question:

- where is price relative to important decision zones?

Core outputs:

- support and resistance zones
- value-area context
- liquidity draw map
- baseline MA posture
- optional adaptive MA overlay when justified

This phase should answer:

- is price at a meaningful area or in mid-range noise?

If location is poor, the system should be allowed to lean toward `WAIT` early.

#### 4. `SETUP`

Question:

- what setup family, if any, matches the current state and location?

Core outputs:

- `S1`, `S2`, `S3`, `S4`, `S5`, or `NO_VALID_SETUP`

This phase should map context to a setup family before tactical trigger logic.

#### 5. `TRIGGER`

Question:

- has the setup actually triggered?

Core outputs:

- trigger condition status
- structure-event relevance
- whether the setup is still watchlist-only

This is where `60m` timing becomes important.

Daily still owns thesis.
`60m` refines acceptance, reclaim, follow-through, and tactical timing.

#### 6. `CONFIRMATION`

Question:

- does the evidence support the trigger strongly enough?

Core outputs:

- breakout quality
- participation quality
- value acceptance or rejection
- divergence only when conditionally relevant
- `SMC/ICT` only when the LLM judges it necessary or trigger conditions are met

This phase is where optional overlays can enter.

If the default read is sufficient, stay in `DEFAULT`.
If not, the system may move to `ESCALATED`.

## 2A. Daily And `60m` Reconciliation Rule

The recommended future rule is:

- daily owns thesis
- `60m` owns trigger, confirmation, and tactical timing

### Daily Owns

- `STATE`
- `LOCATION`
- `SETUP`
- the main risk map

This means daily decides:

- trend, range, or reversal context
- whether the area is meaningful
- whether there is a valid setup family at all
- the main invalidation and level-to-level path

### `60m` Owns

- `TRIGGER`
- `CONFIRMATION`
- reclaim behavior
- follow-through quality
- local acceptance or rejection
- tactical entry timing

### Authority Rule

Daily has final authority on thesis direction.

`60m` may:

- delay action
- downgrade confidence
- keep the system in `WAIT`
- refine timing

`60m` should not:

- create a trade against the daily thesis by itself
- override a clear daily directional thesis without a daily-level reason

### Conflict Rule

If daily and `60m` disagree:

- daily keeps directional authority
- `60m` can veto timing
- unresolved timing conflict should lean toward `WAIT`

This keeps the system aligned with:

- daily thesis
- `60m` timing refinement

instead of allowing lower-timeframe noise to dominate the analysis.

#### 7. `RISK`

Question:

- where is the thesis wrong, and is the path worth trading?

Core outputs:

- invalidation
- stop basis
- next-zone target
- target ladder
- expected reward-to-risk

If invalidation or target path is unclear, default to `WAIT`.

#### 8. `DECISION`

Question:

- what is the action now?

Allowed actions:

- `BUY`
- `HOLD`
- `WAIT`
- `EXIT`

This phase should also record:

- confidence
- invalidators
- whether analysis remained in `DEFAULT` or moved to `ESCALATED`
- escalation reason when escalation happened

#### 9. `MONITORING`

Question:

- what should trigger the next review?

Core outputs:

- thesis confirmation triggers
- invalidation triggers
- next review conditions
- stale-setup conditions

This keeps the workflow from ending at action alone.

## 3. `DEFAULT` And `ESCALATED`

These are the planned runtime analysis modes.

### `DEFAULT`

Use for the ordinary lean path.

Included by default:

- state and regime
- zones and location
- Wyckoff context and history
- VPVR/value-area context
- lean MA baseline
- setup family
- trigger and follow-through
- risk and action

### `ESCALATED`

Use only when:

- the user explicitly asks for deeper analysis
- the LLM judges deeper analysis is necessary
- reversal is central
- trap, sweep, deviation, or liquidity behavior dominates the chart
- the default read cannot resolve the chart cleanly
- postmortem or thesis review needs deeper forensics

Possible overlays:

- `SMC/ICT`
- `FVG`
- `IFVG`
- `OB`
- `Breaker`
- premium/discount
- adaptive MA
- divergence diagnostics

`ESCALATED` is not a different philosophy.
It is the same workflow with additional tools activated.

Overlay-family note:

- `FVG` and `IFVG` should belong to the imbalance overlay path
- `SMC/ICT` should remain a separate overlay path
- the policy contract should not silently treat all imbalance concepts as part of `SMC/ICT`

### Escalation Trigger Model

Use two trigger classes:

#### Explicit Trigger

- the user explicitly asks for deeper analysis
- the user explicitly asks for reversal, trap, sweep, deviation, postmortem, or `SMC/ICT`
- the review or backtest scenario explicitly requests escalated analysis

#### Context Trigger

Escalate only when the default read is insufficient to resolve a decision-relevant question.

Examples:

- setup classification remains ambiguous
- trigger appears real, but confirmation evidence conflicts
- reversal thesis is plausible, but still unresolved
- sweep, trap, or deviation behavior is central to the interpretation
- the default structure-first read leaves multiple competing explanations
- thesis update reveals degradation or contradiction versus the prior thesis
- postmortem requires a more forensic explanation than the default path can provide

Core rule:

- do not escalate just because the chart is complex
- escalate only when the unresolved issue affects action, confidence, invalidation, or setup family

## 4. `policy-contract.md` Scope

`policy-contract.md` should be the single source of truth for what the AI is allowed to decide and what evidence is required.

It should own:

- runtime input contract
- action space
- setup-family space
- mode model
- `DEFAULT` vs `ESCALATED` decision rules
- mandatory evidence requirements
- uncertainty handling
- escalation recording requirements
- minimum output decision fields
- concrete runtime state-packet schema or a pointer to a dedicated schema appendix

It should not own:

- detailed doctrine explanations
- output formatting structure
- chart-generation details

## 5. Decision Contract

The policy contract should define the following clearly.

### Required Inputs

At minimum:

- analysis mode
- current market-state packet
- prior thesis snapshot when relevant
- available setup families
- allowed actions
- chart artifacts or chart evidence references

### Allowed Actions

- `BUY`
- `HOLD`
- `WAIT`
- `EXIT`

No other final action labels.

### Allowed Setup Values

- `S1`
- `S2`
- `S3`
- `S4`
- `S5`
- `NO_VALID_SETUP`

No multi-setup final answer.

The AI may consider multiple candidates internally, but the final output should choose one or none.

### Minimum Evidence For Action

For any actionable decision, the contract should require:

- state/regime clarity
- meaningful location
- valid setup family
- trigger or confirmation evidence
- explicit invalidation
- explicit target path
- acceptable reward-to-risk

If these are not present, default to `WAIT`.

### Uncertainty Handling

When evidence is mixed:

- prefer `WAIT`
- reduce confidence
- record the unresolved contradiction
- escalate only when that escalation may actually resolve the contradiction

### Escalation Contract

If analysis moves from `DEFAULT` to `ESCALATED`, record:

- escalation happened: yes/no
- escalation reason code
- escalation reason text
- overlays used
- whether escalation came from explicit request or model judgment

This is required for transparency and backtesting logs.

Recommended reason codes:

- `user_requested_deeper_analysis`
- `reversal_interpretation_needed`
- `trap_or_sweep_interpretation_needed`
- `default_read_conflicted`
- `thesis_degradation_review`
- `postmortem_forensic_review`
- `adaptive_ma_needed`
- `divergence_check_needed`
- `smc_ict_needed`

Recording rule:

- every escalation should declare what question triggered it
- every overlay should declare what it was helping resolve
- the record should make it clear whether escalation changed action, confidence, invalidation, or interpretation only

## 6. What `policy-contract.md` Must Make Explicit

It should explicitly define:

- divergence is conditional, not mandatory
- `SMC/ICT` is optional and adaptive, not baseline
- baseline MA is `21EMA`, `50SMA`, and `200SMA`
- `100SMA` is not part of the lean baseline for now
- adaptive MA is optional and justified only when symbol-specific rhythm is evident
- Fib and `OTE` are not part of the active default system
- Wyckoff includes both current state and historical phase sequence
- `daily_structure_sr` remains the default daily structure chart artifact
- `daily_structure_fib` is not part of the future baseline artifact set

For backtesting and runtime use, this should become a field-level contract rather than a narrative list.

For Wyckoff specifically:

- keep the segment schema and confidence bands explicit
- defer exact segmentation and scoring weights until later implementation

### Overlay Trigger Rules

#### Adaptive MA

Trigger question:

- does symbol-specific rhythm matter for this setup?

Activate only when all are true:

- the review is focused on one symbol, not broad screening
- baseline `21EMA`, `50SMA`, and `200SMA` context is not enough
- the setup is rhythm-sensitive, such as a pullback, trend-support, or tactical continuation case
- the stock shows repeated respect to a specific MA or cadence
- the extra MA changes timing, support interpretation, or trade management meaningfully

Do not activate when:

- baseline context already gives a clean answer
- the chart is mostly range noise
- the MA choice is only being used post hoc to explain price

#### Divergence

Trigger question:

- is momentum exhaustion or weakening relevant here?

Activate when one or more are true:

- the move is extended
- reversal thesis is being considered
- momentum quality looks suspect near a major zone
- price is making marginal new extremes
- thesis quality is degrading and diagnostic help is needed
- postmortem wants to know whether momentum warning existed

Do not activate for:

- ordinary continuation reads
- every breakout by default
- every chart as a ritual scan

#### Imbalance (`FVG` / `IFVG`)

Trigger question:

- does imbalance behavior materially help resolve location, confirmation, or entry refinement?

Activate when one or more are true:

- imbalance is near a structurally meaningful zone
- mitigation or consequent-encroachment behavior affects confirmation
- polarity flip or `IFVG` behavior may change the read
- the default structure-first read is directionally valid, but entry or confirmation quality remains unresolved

Do not activate when:

- the chart is already clear without imbalance context
- the imbalance sits in low-value mid-range noise
- it would only add tactical detail without changing the decision

#### `SMC/ICT`

Trigger question:

- is liquidity behavior central to interpretation?

Activate when one or more are true:

- sweep and reclaim behavior is central
- trap, deviation, or false-break interpretation matters
- reversal thesis depends on liquidity events, not just ordinary structure
- imbalance or inefficiency matters to the read
- order-block or breaker interpretation may materially change entry, invalidation, or confidence
- the default read leaves multiple plausible interpretations and `SMC/ICT` can help discriminate between them

Do not activate when:

- the chart is a plain continuation
- structure, zones, participation, and risk already give a clean answer
- it would only add terminology without changing the decision

## 7. Output Contract Direction

The future output contract should be split into three layers:

- always required
- conditional
- escalated only

### Always Required

These should appear in every technical-analysis output:

- analysis purpose mode: `INITIAL`, `UPDATE`, `THESIS_REVIEW`, or `POSTMORTEM`
- analysis depth mode: `DEFAULT` or `ESCALATED`
- state and regime
- current bias
- key levels and location summary
- selected setup family or `NO_VALID_SETUP`
- trigger status
- action
- invalidation
- target path or next zone when actionable
- confidence
- monitoring triggers
- chart evidence references

### Conditional

These should appear only when relevant:

- previous thesis snapshot and delta log for non-initial modes
- adaptive MA note when adaptive MA was used
- divergence section when divergence was invoked
- imbalance section when imbalance tools were used
- `SMC/ICT` section when those overlays were used
- breakout quality filters for breakout setups

### Escalated Only

These should never be default reporting requirements:

- deeper `SMC/ICT` structural details
- `OB` or `Breaker` detail
- premium/discount detail
- extended forensic conflict analysis

### Template Rewrite Direction

Do not preserve the old template shape and only delete fields.

Rewrite the future template around the runtime spine:

1. `Context`
2. `State And Location`
3. `Setup And Trigger`
4. `Risk And Decision`
5. `Delta And Monitoring`
6. `Conditional Overlays`
7. `Evidence`

This should map directly to:

- `MODE`
- `STATE`
- `LOCATION`
- `SETUP`
- `TRIGGER`
- `CONFIRMATION`
- `RISK`
- `DECISION`
- `MONITORING`

### Remove From The Future Default Output Contract

Remove from the future default output contract:

- Fib context
- Fibonacci extensions
- `OTE`
- `Lens`
- formal lens-compare sections
- `SMC_ICT_LIGHT`
- mandatory divergence status in every report
- any Fib-specific chart artifact as a required baseline artifact
- `daily_structure_fib` as a required output artifact reference
- old MA mode taxonomy such as `baseline_stack`, `adaptive_primary`, or `hybrid`
- `100SMA` from default MA posture

## 8. Checklist And Red-Flag Direction

The future checklist should be split into:

- hard mandatory gates
- conditional gates
- advisory diagnostics

### Hard Mandatory Gates

Keep mandatory in every run:

- mode is clear
- data is valid
- state or regime is classifiable enough
- meaningful location is identified
- exactly one setup family or `NO_VALID_SETUP`
- invalidation is explicit for any actionable call
- next-zone path exists for actionable trades
- chart versus numeric contradiction is resolved when relevant
- `WAIT` is used when no clean path exists

### Conditional Gates

Activate only when relevant:

- prior-context and delta requirements for non-initial modes
- breakout filters for breakout setups
- `SMC/ICT` evidence requirements only when those overlays were used
- imbalance requirements only when imbalance tools were used
- divergence checks only when divergence was invoked
- adaptive MA justification only when adaptive MA was used

### Remove As Default Gates

Remove from the future default gate set:

- Fib context gate
- any `OTE`-dependent gate
- mandatory divergence presence
- formal lens-specific checks
- any Fib-specific daily chart artifact as a required baseline artifact

Doctrine cleanup notes for implementation:

- `setups-and-breakouts.md` still contains always-on divergence language and must be rewritten to conditional divergence
- `execution-and-risk-protocol.md` still contains Fib and `OTE` residue and must be rewritten to match the future default system
- `enums-and-glossary.md` must be updated to reflect `DEFAULT` and `ESCALATED`, removed lens terms, removed default Fib and `OTE`, and new Wyckoff segment enums

### Red-Flag Direction

Split red flags into core and conditional groups.

#### Core Red Flags

Keep as broadly available:

- structure break
- failed breakout
- distribution
- no next-zone path
- no nearby support when relevant
- missing liquidity map
- missing prior context for non-initial modes
- lean MA breakdown context, including `200SMA` long-term regime damage when relevant

#### Conditional Red Flags

Only when the related overlay or setup is active:

- divergence escalation
- `SMC` evidence gap
- imbalance quality weak
- breakout stalling
- breakout filter weak

## 9. Final Mode Model

The final mode model should use two axes.

### Purpose Mode

- `INITIAL`
- `UPDATE`
- `THESIS_REVIEW`
- `POSTMORTEM`

These answer:

- what job is being done?

### Depth Mode

- `DEFAULT`
- `ESCALATED`

These answer:

- how much overlay machinery is needed?

These are not competing systems.
They should be used together.

Examples:

- `INITIAL + DEFAULT`
- `THESIS_REVIEW + ESCALATED`
- `POSTMORTEM + ESCALATED`

## 10. Immediate Next Writing Order

The next implementation-writing sequence should be:

1. draft `workflow-spine.md`
2. draft `policy-contract.md`
3. update `SKILL.md` to route to them
4. only then clean the older doctrine/output/checklist files
