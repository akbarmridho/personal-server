# Wyckoff Historical State Design

## Purpose

This document is the source of truth for the separate Wyckoff historical-state module.

It defines:

- the role of Wyckoff in the system
- what the module is allowed to output
- how the output should be used
- what implementation constraints must be respected

It does not make Wyckoff the main technical-analysis engine.

## Fixed Role

Wyckoff stays in the system, but only in a narrow role.

Accepted role:

- separate deterministic state module
- slower context layer
- cycle and phase history context
- support for `S5` Wyckoff spring with reclaim

Rejected role:

- main thesis engine
- replacement for structure-first reading
- broad narrative override over structure, location, trigger, or risk

## Module Boundary

The Wyckoff engine must be separate from:

- `ta_context`
- chart generation
- ordinary trigger logic

Required sequence:

1. build Wyckoff state as its own deterministic artifact
2. optionally summarize relevant current fields into TA later
3. optionally render a Wyckoff chart artifact later

Do not build Wyckoff history inside `build_ta_context.py`.
Do not make chart generation responsible for inferring Wyckoff state.

## Primary Design Reference

Use:

- `wyckoff-research-gpt.md` as the primary design reference

Treat only as secondary support:

- `wyckoff-research-gemini.md`

Reason:

- the GPT research is more disciplined on determinism, right-edge behavior, delayed confirmation, and backtest integrity
- the Gemini research is useful for event ideas, but too expansive to be the canonical contract

## Core Design Principle

The module should be deterministic, right-edge-safe, and backtest-safe.

Required properties:

- same OHLCV input always produces the same Wyckoff output
- no future bars may influence the state at time `t`
- any delayed confirmation must be treated explicitly, not hidden

If an event depends on pivot confirmation, the engine must represent:

- event time
- confirmation time

or use a clear delayed-state policy that is honest in walk-forward replay.

## Recommended Model

Use a two-layer model:

### 1. Cycle State

Always available:

- `accumulation`
- `markup`
- `distribution`
- `markdown`
- `unclear`

This is the coarse market-cycle read.

### 2. Schematic Phase

Optional and only when evidence is strong enough:

- `A`
- `B`
- `C`
- `D`
- `E`

This is the finer trading-range phase read.

Implementation rule:

- the engine may output strong cycle state with weak or absent schematic phase
- do not force full schematic labeling when evidence is not good enough

## Output Contract

The module should emit a standalone Wyckoff state object.

Top-level fields:

- `as_of_date`
- `timeframe`
- `current_cycle_phase`
- `current_wyckoff_phase`
- `wyckoff_current_confidence`
- `wyckoff_current_maturity`
- `wyckoff_history`

### `current_cycle_phase`

Allowed values:

- `accumulation`
- `markup`
- `distribution`
- `markdown`
- `unclear`

### `current_wyckoff_phase`

Allowed values:

- `A`
- `B`
- `C`
- `D`
- `E`
- `unclear`
- `not_applicable`

Rule:

- use `not_applicable` when only broad cycle state is valid
- use `unclear` when a schematic read is attempted but not reliable enough

### `wyckoff_current_confidence`

Type:

- integer `0` to `100`

Meaning:

- confidence in the current Wyckoff interpretation as context

It is not:

- a trade trigger
- a permission to override the main TA stack

### `wyckoff_current_maturity`

Allowed values:

- `fresh`
- `maturing`
- `mature`
- `degrading`

Meaning:

- how developed the current state is

## `wyckoff_history`

`wyckoff_history` should be a compact recent segment history.

Keep:

- the most recent `3` to `8` segments

Do not keep:

- full-symbol history in the live runtime payload

Each segment should contain:

- `cycle_phase`
- `schematic_phase`
- `start_ts`
- `end_ts`
- `start_index`
- `end_index`
- `duration_bars`
- `price_low`
- `price_high`
- `price_change_pct`
- `confidence`
- `maturity`
- `transition_reason`
- `invalidation_reason`

### Segment field rules

`cycle_phase`:

- `accumulation`
- `markup`
- `distribution`
- `markdown`
- `unclear`

`schematic_phase`:

- `A`
- `B`
- `C`
- `D`
- `E`
- `unclear`
- `not_applicable`

`transition_reason`:

- short machine-readable reason for why this segment began

Examples:

- `sc_ar_confirmed`
- `range_building`
- `spring_confirmed`
- `sos_confirmed`
- `utad_confirmed`
- `breakout_acceptance`
- `breakdown_acceptance`

`invalidation_reason`:

- omit when not needed
- include only when a segment ended because the expected state failed

Examples:

- `range_failed`
- `timeout_no_progress`
- `contradictory_break`
- `confidence_collapsed`

## Event Log Requirement

The engine should internally track event history even if the first public output keeps it compact.

Minimum internal event types:

- `SC`
- `BC`
- `AR`
- `ST`
- `SPRING`
- `UT`
- `UTAD`
- `SOS`
- `SOW`
- `LPS`
- `LPSY`

Recommended public rule for first version:

- keep event detail internal or expose only through `transition_reason`
- do not overstuff the first runtime payload

## Confidence Model

The exact scoring weights can evolve later, but the evidence families are fixed.

Confidence should come from:

- structure coherence
- trading-range quality
- event sequence quality
- breakout or rejection quality
- volume character
- duration adequacy
- consistency with prior segment

Confidence bands:

- `0-39`: weak
- `40-69`: moderate
- `70-100`: strong

Practical rule:

- below `60` means context is forming and should not be trusted heavily
- above `70` is usable contextual support

## Maturity Model

Maturity is separate from confidence.

Examples:

- `fresh`: recently transitioned and still proving itself
- `maturing`: developing constructively
- `mature`: well-developed and stable
- `degrading`: losing coherence or failing progression

This matters because a fresh high-confidence transition should still be treated differently from a mature established state.

## Runtime Use Rules

Wyckoff may support:

- cycle interpretation
- recent phase-sequence interpretation
- transition maturity
- contextual support for `S5`

Wyckoff may not:

- create a trade by itself
- overrule structure
- overrule location
- overrule trigger / confirmation
- overrule invalidation / risk

For the main TA skill, the intended bridge is:

- current cycle / phase context
- `S5` spring with reclaim support

Not:

- a broad override layer across every setup family

## Chart Artifact Direction

The target chart artifact is separate from the state module.

Later chart output should include:

- historical phase bands over price
- current phase highlight
- compact recent segment table

The chart should be rendered from the separate Wyckoff state output.

## Deferred Items

These are intentionally deferred:

- exact segmentation algorithm details
- exact score weights
- exact timeout thresholds
- exact tie-break rules for conflicting event interpretations
- final chart design

These can change later without changing the role contract in this file.

## Implementation Order

1. lock this role and output contract
2. implement deterministic cycle-state output
3. add compact recent history segments
4. add optional schematic phase labeling when reliable
5. add chart artifact later
6. only then refine scoring and edge cases

## First Implementation Standard

The first implementation is good enough when:

- it is deterministic
- it is right-edge-safe
- it emits current cycle state
- it emits current maturity and confidence
- it emits compact recent history
- it helps `S5` context without polluting the main TA contract

It does not need to solve full textbook Wyckoff perfectly on the first pass.
