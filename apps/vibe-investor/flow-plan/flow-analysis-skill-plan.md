# Flow Analysis Skill Plan

## Purpose

This document outlines a new `flow-analysis` skill for `vibe-investor`.

The goal is to separate broker-flow and transaction-flow analysis from chart-based technical analysis while keeping the two skills easy to combine in parent synthesis.

This is a future-state planning document.

## Naming

Use:

- `flow-analysis`

Reason:

- the source material is broader than raw transaction tables
- the system covers broker participation, pressure structure, verdict synthesis, trust filters, and flow-to-price relationship
- `transaction-analysis` is too narrow for the actual scope

## Source Material

Primary source for this plan:

- `idx-flow.html`

This source should remain in the `flow-plan` folder as the doctrine and UI reference for the new skill.

Interpretation rule:

- `idx-flow.html` is doctrine and product-language reference
- the deterministic implementation should only adopt the parts that survive the actual raw data contract
- product-specific composites or UI metrics should not be promoted into v1 deterministic truth without a defensible formula

Companion human-workflow note:

- `human-flow-analyst-workflow.md`

Companion implementation note:

- `flow-data-fetch-plan.md`

## Skill Boundary

`flow-analysis` should own:

- broker summary interpretation
- gross-versus-net reading discipline
- directional broker-flow context
- sponsor quality
- accumulation versus distribution verdict logic
- conviction logic
- trust and reliability checks for broker-flow signals
- broker relationship structure
- flow-led early warning and early-turn detection

`flow-analysis` should not own:

- chart-structure mapping
- support and resistance doctrine
- setup-family selection
- trigger and confirmation rules from price action
- stop placement and level-to-level execution

Those remain under `technical-analysis`.

## Relationship To Technical Analysis

The two skills overlap at the interpretation layer, not the feature layer.

Shared interpretation themes:

- Wyckoff language
- divergence as warning
- regime framing
- accumulation and distribution concepts
- early-turn versus confirmed-trend thinking

Separation of ownership:

- `technical-analysis` owns chart structure and chart execution logic
- `flow-analysis` owns broker-flow structure and sponsor-quality logic

Wyckoff handling should also stay explicit:

- `technical-analysis` remains the default owner of chart-structure Wyckoff state
- `flow-analysis` may compare its verdict against shared Wyckoff language during integration
- `flow-analysis` should not introduce a separate default Wyckoff detector unless that becomes an explicit later feature

## Main Integration Principle

The most important integration rule from `idx-flow.html` is:

- technical structure and broker flow operate on different clocks

Interpretation:

- technical structure is the visible map
- flow can lead before price fully confirms

Useful parent-synthesis cases:

- TA bullish + Flow bullish = confirmation
- TA bearish + Flow bearish = confirmation
- TA still bullish + Flow bearish = early warning
- TA still weak + Flow bullish = early accumulation or early-turn watchlist

## Recommended Workflow Spine

The future `flow-analysis` skill should think in this order:

1. `MODE`
2. `INPUT_SCOPE`
3. `GROSS_FIRST_READ`
4. `CORE_METRICS`
5. `ADVANCED_SIGNALS`
6. `TRUST_AND_REGIME`
7. `VERDICT`
8. `INTEGRATION_HOOK`
9. `MONITORING`

## Phase Meaning

### 1. `MODE`

Use the same purpose modes as technical analysis:

- `INITIAL`
- `UPDATE`
- `POSTMORTEM`

This keeps parent orchestration simple.

Within `UPDATE`, the flow contract should still carry:

- `flow_status`: `intact`, `improving`, `degrading`, or `invalidated`
- `review_reason`: `routine`, `contradiction`, `sponsor_shift`, `regime_change`, or `verdict_flip`

### 2. `INPUT_SCOPE`

Confirm:

- selected symbol
- selected date or range
- snapshot freshness when available
- whether the read is single-day or multi-day

### 3. `GROSS_FIRST_READ`

This should be a hard workflow rule.

Start with:

- `gross`

Use `net` only as a secondary compression layer.

The system should treat gross-first reading as mandatory because net can hide meaningful two-way activity.

### 4. `CORE_METRICS`

This layer should own:

- `CADI`
- broker-side `VWAP` execution-quality interpretation
- `GVPR`
- top buyer / seller share
- coverage quality from top-25 visibility
- verdict factors derived from those metrics

Core questions:

- are the strongest brokers accumulating or distributing?
- are buyers paying up or getting favorable execution?
- is participation concentrated enough to matter?

`MFI` and `Frequency` should live here as verdict-computation inputs, not as separate analyst-facing phases.
`MFI` should stay out of the first deterministic contract until it has a defensible computation from the actual broker-summary raw inputs.
`Frequency` should also stay secondary until it proves stable and additive beyond value-based flow features.

The skill may still derive sponsor-quality and concentration features from daily broker-summary snapshots, but those raw tables should stay internal to deterministic preprocessing rather than become first-class LLM-facing report sections.

### 5. `ADVANCED_SIGNALS`

This layer should own:

- flow divergence
- flow-price correlation
- broker persistence
- concentration asymmetry
- concentration strength via `HHI` and top-k participation
- wash-risk or anomaly-risk checks when relevant

These are not primary direction generators.
They are quality and trust filters.

The underlying factor model should stay continuous rather than binary.

Planning assumption:

- factor scores should support smooth interpretation, such as a bounded negative-to-positive scale, instead of hard on-off flags
- `SMT` may exist later as a product-layer composite, but it should not be treated as the base deterministic truth in v1
- `Gini` should not be the primary concentration backbone in v1 under top-25 truncation

### 6. `TRUST_AND_REGIME`

This layer should answer:

- does broker flow deserve weight on this ticker?
- is the broker-flow relationship active right now?
- is this stock in a regime where broker-flow signals are more trustworthy or less trustworthy?

This is where:

- market-cap profile
- liquidity profile
- flow-price correlation
- active regime

should affect confidence.

Window rule:

- use `30` trading days as the active read for direction, sponsor quality, and current state
- use `60` trading days as the trust and stability read for correlation and ticker usefulness
- do not collapse those jobs into one window

### 7. `VERDICT`

This layer should produce:

- `ACCUMULATION`
- `DISTRIBUTION`
- `NEUTRAL`

with:

- conviction
- factor summary
- trust level

The verdict should be treated as:

- current broker-flow lean

not as:

- standalone trade permission

Verdict scoring should stay continuous under the hood even if the outward label is categorical.

### 8. `INTEGRATION_HOOK`

This layer should prepare the result for parent synthesis with technical analysis.

Required integration outputs:

- flow verdict
- conviction
- whether flow is leading or confirming
- whether flow contradicts current price structure
- whether the read is early-turn, confirmed, warning, or noisy

Lead-versus-confirm should follow these rules:

- `lead`: broker-flow direction changes before technical structure or setup state confirms the move
- `confirm`: broker-flow direction agrees with an already-established technical state
- `warning`: technical structure still looks constructive but broker-flow deteriorates materially
- `unclear`: timing relationship is ambiguous or both clocks shift together without clean precedence

### 9. `MONITORING`

This layer should define:

- what confirms the flow read
- what weakens it
- what next review window matters
- whether the signal is improving, degrading, or stalling

## Core Concepts To Keep

These ideas from `idx-flow.html` should become first-class doctrine:

- gross versus net reading order
- verdict is a weighted evidence synthesis, not a promise
- broker flow can lead price
- divergence is a setup or warning, not a trigger by itself
- sponsor quality matters more than raw direction alone
- correlation and active regime should decide how much trust to give the skill
- concentration and persistence matter more than one-off spikes

Additional implementation rules from the research pass:

- top-25 truncation must be treated explicitly through coverage awareness
- `HHI` plus top-k participation is a safer deterministic concentration backbone than `Gini`
- wash-risk stays a proxy and risk discount, not a claim of actual detected wash trading
- divergence remains contextual and must not become a trigger

## Expected Output Shape

The future output should be smaller than the HTML UI but keep the same logic.

Every report should begin with a compact `Decision Summary` so the reader can understand the outcome before reading the detail.

Always required:

- top-level `Decision Summary`
- mode
- symbol
- date range
- gross-versus-net read note
- core metrics conclusion
- advanced-signal conclusion
- trust/regime conclusion
- verdict
- conviction
- integration hook
- monitoring triggers

Recommended `Decision Summary` fields:

- verdict
- conviction
- trust level
- sponsor-quality lean
- key caution
- integration signal
- next review trigger

Internal deterministic defaults for v1:

- `30D` primary window for CADI, persistence, VWAP execution, GVPR, and baseline verdict
- `60D` trust window for correlation and ticker-usefulness assessment
- `MFI` excluded from the first deterministic packet
- `SMT` excluded as base truth and treated, at most, as later heuristic presentation

Conditional:

- persistence detail when it matters
- divergence detail when present
- anomaly or wash-risk warning when relevant
- supporting note for internal verdict inputs only when they materially affect conviction

Future template shape should be rewritten around the flow workflow:

1. `Decision Summary`
2. `Context`
3. `Core Metrics`
4. `Advanced Signals, Trust And Verdict`
5. `Integration And Monitoring`
6. `Conditional Details`
7. `Evidence`

## Backtesting Direction

Yes, `flow-analysis` should be backtested.

But it should not be forced into the exact same backtest shape as `technical-analysis`.

### Why It Differs From Technical Analysis

`flow-analysis` is less fully programmable than chart-based technical analysis because a larger part of its value comes from:

- sponsor-quality interpretation
- early-turn interpretation
- trust calibration
- synthesis of mixed broker evidence

Still, a large part of the skill remains deterministic and testable:

- daily broker-summary series normalization
- top buyer and seller share
- average buy and sell price
- `CADI`
- broker-side `VWAP` comparisons
- `GVPR`
- persistence
- concentration asymmetry
- flow-price correlation
- active regime labels

For v1, keep raw broker-summary tables and broker-distribution views as preprocessing inputs, not as required LLM-facing sections.

### Recommended Evaluation Modes

Use two evaluation modes:

- `full vibe`
- `rules baseline`

These should align with the technical-analysis backtest stack:

- `technical-analysis` uses `ablation` as its deterministic baseline
- `flow-analysis` uses `rules baseline` as its deterministic baseline

The naming differs because the flow skill is less fully programmable, but both are serving the same role:

- deterministic control baseline

### `Full Vibe`

This is the main product-faithful test.

Use:

- deterministic flow-state packet
- LLM verdict, conviction, trust, and integration-hook judgment

Questions answered:

- does the AI synthesize broker-flow data like a good discretionary analyst?
- does it improve sponsor-quality interpretation?
- does it produce useful early-warning or early-turn reads?

### `Rules Baseline`

This is the control baseline.

Use:

- the same deterministic flow-state packet
- simple threshold or rule-based verdict logic
- no rich narrative synthesis

Purpose:

- measure whether the LLM adds value beyond raw feature rules
- avoid pretending the whole flow skill is fully deterministic

### Independent Flow Testing

`flow-analysis` can and should be tested independently before being integrated with technical analysis.

Standalone flow tests should focus on:

- verdict quality
- conviction calibration
- trust calibration
- early-warning quality
- early-turn quality
- persistence of the read across adjacent windows

Example evaluation questions:

- when flow says `ACCUMULATION`, does price structure improve later?
- when flow says `DISTRIBUTION`, does deterioration appear later?
- when flow diverges from price, does price later catch up?
- does high-conviction flow outperform low-conviction flow?
- does stronger trust/regime improve usefulness?

### Combined Testing With Technical Analysis

After standalone flow testing is stable, run integration tests with `technical-analysis`.

This is where the real product edge should be tested.

Combined evaluation questions:

- does adding flow improve technical-analysis decision quality?
- does flow reduce false positives from technical analysis alone?
- does flow improve early warning before technical deterioration becomes obvious?
- does flow improve watchlist quality and patience?
- does aligned flow and technical structure outperform either alone?

Combined evaluation should follow the same shared ladder used by technical-analysis:

1. independent skill validation
2. pairwise `technical-analysis` plus `flow-analysis`
3. parent synthesis validation
4. later full desk validation with portfolio constraints

### Suggested Testing Sequence

1. validate deterministic flow-state extraction
2. run `rules baseline`
3. run `full vibe`
4. compare verdict quality and calibration
5. integrate with `technical-analysis`
6. test parent synthesis quality

For combined tests, keep a shared output contract with:

- technical verdict or action
- technical confidence
- flow verdict
- flow conviction
- agreement state
- lead lens
- parent synthesis conclusion
- final action emphasis

### What To Measure

Flow-only evaluation should emphasize:

- lead quality
- confirmation quality
- warning quality
- conviction calibration
- trust calibration

Do not reduce the flow skill to trade-entry backtesting only.

Its job is broader:

- identify sponsorship
- identify deterioration
- identify early turns
- tell the parent how much weight broker flow deserves

## Suggested Future File Set

Inside the future `flow-analysis` skill:

- `SKILL.md`
- `references/workflow-spine.md`
- `references/policy-contract.md`
- `references/data-contract.md`
- `references/gross-net-and-core-metrics.md`
- `references/core-metrics-and-verdict.md`
- `references/advanced-signals-and-trust.md`
- `references/integration-with-technical-analysis.md`
- `references/output-report-template.md`
- `references/enums-and-glossary.md`

`gross-net-and-core-metrics.md` should own the raw gross-first reading rule and the deterministic feature inputs derived from daily broker-summary data.

## Overlap Handling

Do not duplicate technical-analysis doctrine inside this skill.

Use these boundaries:

- if the question is about chart structure, levels, or trade setup, defer to `technical-analysis`
- if the question is about who is buying, whether sponsor quality is real, or whether flow is leading structure, use `flow-analysis`
- if both matter, let the parent load both skills and synthesize

## Planned Integration Result

After this skill exists, parent synthesis should be able to say:

- technical state
- flow state
- whether they agree
- whether one is leading the other
- whether the combined read is confirmed, early, warning, or low quality
