# Technical Analysis Skill AI Restructuring Plan

## Purpose

This document proposes a moderate restructuring of the `technical-analysis` skill so it serves the AI better.

This is a future-state restructuring note.
It describes the intended target contract for the refactor, not the current live-skill contract.

The goal is not to make the skill read like a human textbook.

The goal is to improve:

- workflow clarity
- retrieval efficiency
- policy consistency
- lower token waste
- cleaner ownership of doctrine, workflow, and output contracts

## Assessment Of Current State

## What Is Already Good

The current skill already has useful AI-facing qualities:

- one clear entrypoint in `SKILL.md`
- explicit mode definitions
- explicit module selection
- reasonable topic separation across references
- deterministic scripts for major preprocessing steps
- output contract separated into its own template reference

This means the skill is already usable.

## What Is Not Clear Enough Yet

The current structure is still only partially optimized for AI reasoning.

The main issue is that the workflow spine is distributed across multiple files:

- phase sequence in `SKILL.md`
- mode logic in `analysis-lifecycle-and-frameworks.md`
- gating rules in `checklists-and-red-flags.md`
- setup and trigger doctrine in `setups-and-breakouts.md`
- execution decision rules in `execution-and-risk-protocol.md`
- report requirements in `output-report-template.md`

This forces the AI to reconstruct the actual decision policy from several sources during each run.

That is workable, but not ideal.

## Core Diagnosis

The current skill has:

- strong topic modularity
- acceptable doctrine coverage
- only partial workflow centralization

In other words:

- the AI can find the ingredients
- the AI still has to assemble the recipe

That raises the chance of:

- inconsistent sequencing
- duplicated reasoning
- over-reading references
- prompt drift between runs
- extra token cost

## Refactor Goal

The target state should be:

- one authoritative workflow spine
- topic references that support the workflow spine
- one explicit policy contract for runtime and backtesting
- one output contract for reporting only
- one mandatory top-level `Decision Summary` block for fast human scanning
- deterministic script contracts kept separate from doctrine

The AI should be able to answer these questions with minimal ambiguity:

1. What phase am I in?
2. What references do I need for this phase?
3. What decisions am I allowed to make now?
4. What evidence is required before I move to the next phase?
5. What output shape is required?

Additional clarification:

- for Wyckoff, the AI should not only know the current label
- the AI should also have access to a compact historical phase sequence so it can reason about transitions and maturity

## Agreed File Strategy

This plan assumes:

- advanced optional references should still remain present
- `analysis-lifecycle-and-frameworks.md` should be merged into `workflow-spine.md`
- `level-to-level-execution.md` should be merged into `execution-and-risk-protocol.md`

So the intent is not to grow the file count unnecessarily.

The refactor should keep the skill compact while improving workflow clarity.

## Non-Goals

This restructuring should not:

- rewrite the skill as a human training guide
- merge all references into one large file
- duplicate the same rules across multiple files
- push strategy doctrine into the report template
- push workflow orchestration into every topic reference

## Recommended Target Structure

## 1. Keep `SKILL.md` As The Entry Router

`SKILL.md` should remain the top-level entrypoint.

Its job should be:

- define scope
- define modes and presets
- define mandatory preflight
- define which workflow spine and policy contract to load
- define which topic references to read by phase or module

It should not be the largest owner of detailed doctrine.

## 2. Add One Authoritative Workflow Spine Reference

Add a new reference, for example:

- `workflow-spine.md`

This file should own the actual analysis order:

1. state
2. location
3. setup family
4. trigger
5. confirmation
6. risk
7. action
8. monitoring or thesis update

This should be the single source of truth for analysis sequencing.

This file should absorb the useful orchestration content currently living in:

- `analysis-lifecycle-and-frameworks.md`

The workflow spine should explicitly define:

- what each phase is trying to answer
- what evidence is required
- what decisions are allowed
- when to stop and output `WAIT`
- how current state and historical state are represented, including Wyckoff phase history

## 3. Add One Explicit Policy Contract Reference

Add a new reference, for example:

- `policy-contract.md`

This file should define the runtime decision contract for the AI.

It should describe:

- required inputs
- allowed actions
- allowed setup families
- mandatory evidence fields
- how to handle uncertainty
- what must be present before `BUY`, `HOLD`, `WAIT`, or `EXIT`

This is especially useful for backtesting and replay systems.

## 4. Keep Topic References Narrow

The current topic files are mostly fine and should stay narrow:

- market structure
- levels
- liquidity
- volume profile
- setups and breakouts
- imbalance
- SMC
- risk protocol
- glossary
- checklists

The optional advanced doctrine should still remain present:

- imbalance
- SMC

Those modules should stay available for escalated or explicit requests, even if they are not always loaded in `DEFAULT`.

These files should answer domain questions, not own orchestration.

## 5. Keep Output Template Purely About Output Shape

`output-report-template.md` should define:

- section order
- required tables
- required fields
- presentation expectations

It should not own decision sequencing or runtime policy.

## 6. Keep Deterministic Script Contracts Separate

The deterministic scripts should remain the owner of preprocessing and artifact generation.

Their contract should stay explicit:

- expected input
- expected output
- available modules
- fail-fast conditions

This prevents doctrine from becoming entangled with implementation details.

## Agreed End-State File Set

The recommended end state is:

### Top-Level

- `SKILL.md`

### References

- `workflow-spine.md` new
- `policy-contract.md` new
- `market-structure-and-trend.md`
- `levels.md`
- `volume-profile-and-volume-flow.md`
- `liquidity-draw-and-sweep.md`
- `setups-and-breakouts.md`
- `execution-and-risk-protocol.md`
- `checklists-and-red-flags.md`
- `enums-and-glossary.md`
- `output-report-template.md`
- `fair-value-gap-and-imbalances.md`
- `smart-money-concepts.md`

### Merges

- merge `analysis-lifecycle-and-frameworks.md` into `workflow-spine.md`
- merge `level-to-level-execution.md` into `execution-and-risk-protocol.md`

Detailed merge direction:

- `analysis-lifecycle-and-frameworks.md` should contribute only lifecycle modes, prior-context requirements, thesis-status handling, delta requirements, and non-initial trace requirements
- remove the formal lens system and lens-compare requirements from the future state instead of carrying them forward
- move level-to-level path requirement into `execution-and-risk-protocol.md`
- move liquidity-draw requirement into the workflow spine or liquidity references
- `level-to-level-execution.md` should contribute its zone-to-zone rules, workflow, trace requirements, and any helper logic worth preserving
- after merge, both standalone files should disappear from the future skill tree

Reference cleanup required during implementation:

- `setups-and-breakouts.md` must remove always-on divergence language
- `execution-and-risk-protocol.md` must remove or conditionalize existing Fib and `OTE` sections
- `enums-and-glossary.md` must be revised for the new mode model, removed lens system, removed default Fib and `OTE`, and Wyckoff segment enums

This produces a compact runtime structure:

- 1 top-level entrypoint
- 12 reference files
- total: 13 skill-doc files

That keeps the skill smaller than simply adding new files without consolidation.

## Recommended File Ownership Model

### `SKILL.md`

Owns:

- scope
- mode and preset selection
- preflight
- routing to references
- top-level tool and artifact expectations

### `workflow-spine.md`

Owns:

- analysis sequence
- decision tree by phase
- stop conditions
- escalation from basic to deep workflow
- mode handling and thesis-lifecycle rules migrated from `analysis-lifecycle-and-frameworks.md`
- state representation rules, including current and historical Wyckoff phase interpretation

### `policy-contract.md`

Owns:

- runtime input contract
- action space
- setup space
- evidence thresholds
- uncertainty handling
- final decision requirements

### Topic references

Own:

- doctrine
- rules
- definitions
- examples
- sub-framework nuance

For imbalance specifically:

- `fair-value-gap-and-imbalances.md` should remain the owner of `FVG` and `IFVG`
- those should be treated as an imbalance overlay path, separate from `SMC/ICT`

For Wyckoff specifically:

- `market-structure-and-trend.md` should continue to own Wyckoff doctrine
- `workflow-spine.md` should define how Wyckoff history is consumed during runtime analysis

### `output-report-template.md`

Owns:

- output structure only

Rewrite direction:

- do not preserve the old template shape and only delete obsolete fields
- rebuild the template around the runtime spine and the new output contract layers
- add `Decision Summary` as the first section of the future template
- keep baseline sections compact and decision-oriented
- make overlays appear only when actually used

### scripts

Own:

- deterministic computation
- feature generation
- chart generation
- artifact paths

## Recommended Workflow For The AI

The AI-facing workflow should become:

1. load `SKILL.md`
2. determine mode, preset, and whether overlays are needed
3. load `workflow-spine.md`
4. load `policy-contract.md`
5. load only the topic references required for the current path
6. ingest deterministic state and chart artifacts
7. decide using bounded action and setup spaces
8. render output using `output-report-template.md`

This is simpler than the current effective flow, where the AI often needs to infer both the spine and the contract from many files at once.

## Retrieval Boundary Improvements

The restructuring should reduce unnecessary reads.

Recommended boundary design:

- always load: `workflow-spine.md`, `policy-contract.md`
- load by need:
  - trend and regime questions -> market structure
  - level and location questions -> levels, volume profile, liquidity
  - setup and trigger questions -> setups and breakouts
  - advanced refinement questions -> imbalance or SMC
  - risk and action questions -> execution and risk protocol, which also owns the former level-to-level execution logic
  - formatting only -> output template

This gives the AI a smaller, more reliable working set.

Wyckoff historical-state requirement should be available in the default path, not only in deep mode.

## Default And Escalated Workflow Separation

The future contract should move away from `BASIC` and `DEEP` naming.

The better runtime model is:

- `DEFAULT`
- `ESCALATED`

### `DEFAULT`

Normal path:

- state
- location
- setup
- trigger
- confirmation
- risk
- action

Modules:

- core
- vpvr
- breakout

### `ESCALATED`

Escalation path only when the LLM judges it necessary or when trigger conditions justify it.

Modules:

- core
- vpvr
- breakout
- imbalance
- smc

The AI should only escalate after a named reason is recorded.

Timeframe reconciliation in the future workflow should be explicit:

- daily owns thesis direction, setup context, and the main risk map
- `60m` owns trigger quality, confirmation, follow-through, and tactical timing
- `60m` may delay or downgrade action, but it should not create a trade against the daily thesis by itself

This naming is preferred because:

- `DEFAULT` clearly means the normal path
- `ESCALATED` clearly means additional overlays were activated
- it avoids implying that the second path is simply “more detailed” rather than contextually different

## Suggested Refactor Steps

### Step 1. Add New References Without Breaking Existing Behavior

Add:

- `workflow-spine.md`
- `policy-contract.md`

Keep advanced optional references intact:

- `fair-value-gap-and-imbalances.md`
- `smart-money-concepts.md`

### Step 2. Trim `SKILL.md`

Reduce duplicated doctrine inside `SKILL.md`.

Keep:

- routing
- mandatory preflight
- phase overview
- reference loading policy

Move detailed sequence ownership into `workflow-spine.md`.

Move mode and lifecycle orchestration there as well, replacing `analysis-lifecycle-and-frameworks.md` as a separate runtime reference.

### Step 3. Remove Workflow Leakage From Topic References

Review topic references and trim any content that behaves like hidden orchestration.

Examples of leakage to reduce:

- phase sequencing repeated inside topic files
- output rules repeated inside doctrine files
- persistence or runtime behavior repeated outside `SKILL.md`

At the same time:

- merge `level-to-level-execution.md` into `execution-and-risk-protocol.md`
- keep `fair-value-gap-and-imbalances.md` and `smart-money-concepts.md` as standalone optional doctrine files

### Step 4. Tighten Policy Language

Ensure `policy-contract.md` is direct and bounded.

The AI should not need to infer:

- whether `WAIT` is preferred under uncertainty
- whether one or many setup families may be selected
- whether optional confluence can override structure

These should be explicit.

This includes explicit definition of Wyckoff state inputs:

- current phase
- recent phase timeline
- confidence by segment
- recency and duration of the current segment
- whether the current phase is early, mature, or failing

### Step 5. Keep Checklists As Gates, Not Workflow

`checklists-and-red-flags.md` should remain a validation layer.

It should not act as the hidden process map.

### Step 6. Keep Output Template Strictly Presentational

Any runtime policy still present in the output template should be moved out.

## Refactor Priority

If only a small refactor is possible, the highest-value changes are:

1. add `workflow-spine.md`
2. add `policy-contract.md`
3. merge lifecycle rules into `workflow-spine.md`
4. merge level-to-level execution into `execution-and-risk-protocol.md`
5. trim `SKILL.md` to route to the new ownership model

Those changes would improve AI consistency more than rewriting every topic file.

## Recommendation

The current skill is good enough to run, but not yet as clean as it could be for AI.

A moderate refactor is justified.

The right target is:

- clearer workflow ownership
- clearer policy contract
- smaller retrieval surface per run

The right target is not:

- more prose
- more duplication
- more human-facing explanation inside the live skill

The Wyckoff enhancement should therefore be implemented as:

- clearer state contract
- compact historical phase representation
- better chart artifact support

It should not be implemented as large free-form prose inside the skill entrypoint.

## Discussion-Phase Simplification Notes

This section captures active restructuring discussion before implementation.

The current objective is:

- simplify the default workflow
- reduce low-impact concepts for now
- avoid another iteration where the skill is updated everywhere and becomes messy again

The guiding rule for this phase should be:

- if a concept is weak as a default decision driver, remove it from the default path even if it remains theoretically useful

### Fibonacci Evaluation

Current question:

- should Fibonacci remain in the technical-analysis skill for now, or should it be dropped from the active default workflow?

### Practical Assessment

Fibonacci is easy to compute mechanically.

The weak point is not the arithmetic.
The weak point is anchor selection.

Anchor selection is often subjective because the analyst still needs to decide:

- which swing low and swing high matter most
- whether to use the most recent swing or the structurally dominant swing
- whether the market is actually in a clean enough directional leg to justify Fib
- whether the chosen anchor is still valid after a structure transition

That means Fib often looks objective while smuggling in hidden discretionary judgment through the anchor choice.

### Overlap With Stronger Concepts

For the current technical-analysis doctrine, most of the practical work Fib tries to do is already covered by stronger concepts:

- support and resistance zones
- market structure
- role reversal
- moving-average context
- VPVR and value-area structure
- liquidity draws
- level-to-level execution
- risk-first invalidation and target mapping

In other words:

- Fib can refine a plan
- Fib usually does not create the core thesis
- Fib is often redundant when the zone map and structure map are already good

### AI-Facing Problem

For AI use, Fib adds a specific kind of complexity:

- it consumes attention
- it invites over-reporting
- it creates a false sense of precision
- it can make the model spend tokens defending anchor selection rather than focusing on state, levels, trigger, and risk

That makes it a good candidate to remove from the default analysis path.

### Recommendation For Now

Recommended near-term decision:

- drop Fibonacci from the default workflow
- drop Fibonacci from default reporting
- drop Fibonacci from default required references
- keep it out of `BASIC`
- only reconsider it later if a specific pullback-refinement workflow proves it adds real edge

This is a stronger simplification than the earlier position of "keep optional."

For the current cleanup phase, the better stance is:

- `Fib is not part of the active default technical-analysis system for now`
- `OTE` is also out of the active default system because it depends on the same anchoring logic

### What This Means Structurally

If this decision is accepted:

- remove Fib from the default workflow spine
- remove Fib from the default policy contract
- remove Fib from default report expectations
- keep no dedicated runtime requirement for Fib anchors
- treat any future Fib reintroduction as a deliberate extension, not leftover baggage
- remove `OTE` from the default workflow and reporting at the same time

### Implementation Preference

For this discussion phase, the preferred direction is:

- simplify first
- reintroduce only after evidence

So unless there is a clear argument that Fib adds unique edge beyond existing zone, structure, and liquidity logic, it should be excluded for now.

### Moving Average Evaluation

Current question:

- how should static MA and dynamic or adaptive MA be consolidated without letting the skill become messy again?

### Practical Assessment

Static MA and adaptive MA are useful for different jobs.

Static MA is useful for:

- baseline regime context
- cross-symbol consistency
- broad trend posture
- simple dynamic support or resistance context

Adaptive MA is useful for:

- symbol-specific rhythm
- tactical timing
- pullback refinement
- deeper single-name review

The main mistake would be to treat them as rival doctrines and let the model improvise between them without rules.

### Consolidation Direction

The clean consolidation is:

- baseline static MA is part of default state context
- adaptive MA is an optional overlay

This means the AI should not freely choose among many moving averages in ordinary runs.

Instead:

1. read baseline MA context first
2. decide whether baseline is sufficient
3. only use adaptive MA if the symbol shows clear repeated respect and the setup actually benefits from it

### Recommended Default

For now, the lean default should be:

- `21EMA`
- `50SMA`
- `200SMA`

Why this baseline:

- enough to capture fast posture, medium structure, and long-term regime context
- lighter than the full `21/50/100/200` stack
- more stable than letting the model search arbitrary MA combinations

### Adaptive MA Rule

Adaptive MA should be allowed only when all are true:

- the review is focused on a specific symbol, not broad screening
- the symbol shows repeated measurable respect to a specific nonstandard MA or rhythm
- the adaptive MA adds useful information beyond `21EMA`, `50SMA`, and `200SMA`
- the model can explain why that period matters

Adaptive MA should never replace baseline regime context.

It should only refine it.

### What To Avoid

Avoid:

- large MA stacks in the default path
- arbitrary MA experimentation inside ordinary runs
- MA crossovers as standalone triggers
- post-hoc MA selection to explain a move after the fact

### Structural Implication

If this direction is accepted:

- baseline MA context stays in the default workflow spine
- adaptive MA stays out of the default path
- adaptive MA enters only as an explicit overlay rule in the policy contract
- output should mention adaptive MA only when actually used and justified

### Current Discussion-Phase Recommendation

For now:

- keep simple baseline MA context
- use `21EMA`, `50SMA`, and `200SMA` as the default baseline
- keep `100SMA` out of the lean baseline for now
- remove the broader default MA stack beyond that baseline
- keep adaptive MA as a tightly gated optional overlay

This preserves both valid ideas without turning MA doctrine into an unconstrained LLM choice.

### Divergence Evaluation

Current question:

- should divergence remain a mandatory baseline step?

### Recommendation

Divergence should not remain mandatory.

It should be treated as a conditional diagnostic.

Recommended use cases:

- extended move exhaustion checks
- reversal review
- thesis degradation
- postmortem

Why:

- divergence is a warning tool, not a primary decision driver
- forcing it into every run creates noise
- it can distract the AI from higher-signal structure, zone, trigger, and risk logic

### Structural Implication

If this direction is accepted:

- remove divergence from the default workflow spine
- do not require divergence in the default policy contract
- only load divergence logic when escalation criteria are met

### SMC/ICT Evaluation

Current question:

- should `SMC/ICT` modules remain available, and if so, how should the AI invoke them?

### Recommendation

Keep `SMC/ICT` modules inside technical analysis as adaptive overlays.

They should be entered through:

- explicit user request
- or when the LLM judges they are necessary
- or when automatic escalation conditions are met after the basic read proves insufficient

Automatic escalation should be allowed when:

- reversal is central
- deviation, trap, sweep, or liquidity behavior dominates interpretation
- the basic structure-first read remains unresolved after normal checks
- postmortem or challenged-update work requires deeper forensic detail

### Structural Implication

If this direction is accepted:

- keep `SMC/ICT` references in the skill tree
- keep them out of the default path
- make escalation criteria explicit in the workflow spine
- require the policy contract to record why escalation was triggered

The policy contract should also record whether a run stayed in `DEFAULT` or moved into `ESCALATED`.

This preserves adaptiveness without making `SMC/ICT` part of ordinary baseline analysis.

General escalation rule for the future skill:

- stay in `DEFAULT` unless an unresolved decision-relevant question requires an overlay
- every escalation should record why the default path was insufficient
- every overlay should record what question it was helping resolve

Overlay trigger summary:

- adaptive MA only when symbol-specific rhythm materially matters and baseline MA context is insufficient
- divergence only for exhaustion, reversal suspicion, thesis degradation, or postmortem
- `SMC/ICT` only when liquidity behavior is central or the default structure-first read remains unresolved

Chart artifact implication:

- keep `daily_structure` as the default daily map
- remove `daily_structure_fib` from the future baseline artifact set

## Proposed End State

After restructuring, the AI should be able to understand the skill with this hierarchy:

1. `SKILL.md` tells it what job it is doing.
2. `workflow-spine.md` tells it how to think in order and owns lifecycle flow.
3. `policy-contract.md` tells it what it may decide and what proof is required.
4. Topic references supply the doctrine needed for the current branch only, including optional advanced modules when requested.
5. `output-report-template.md` tells it how to present the result.

That is the restructuring direction most likely to benefit AI performance without changing the core doctrine.
