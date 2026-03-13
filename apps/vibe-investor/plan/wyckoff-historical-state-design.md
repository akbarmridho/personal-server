# Wyckoff Historical State Design

## Purpose

This document defines the future-state contract for historical Wyckoff context in the refactored technical-analysis system.

It is intentionally a planning contract, not a final implementation spec.

The goal is to make Wyckoff usable as structured context for AI and backtesting without pretending the full segmentation logic is already settled.

## Scope

This document defines:

- what the historical Wyckoff output should look like
- what minimum fields each segment should contain
- how Wyckoff confidence should be represented
- what the feature is allowed to do in the runtime system
- what remains deferred for later implementation

It does not define:

- the exact segmentation algorithm
- exact score weights
- every edge case for phase transitions

## Core Requirement

Do not reduce Wyckoff to a single current-state label.

The future system should carry:

- current Wyckoff phase
- a compact recent phase timeline
- confidence for each segment
- maturity or degradation context

This should support both:

- machine-readable state for AI and backtesting
- chart-readable historical phase bands for human review

## Recommended Output Shape

The runtime state should include:

- `current_wyckoff_phase`
- `wyckoff_history`
- `wyckoff_current_confidence`
- `wyckoff_current_maturity`

The history should keep only the most recent useful context:

- prefer the last `3` to `8` segments
- do not send full-symbol history into the runtime packet

## Minimum Segment Schema

Each historical segment should contain:

- `phase`
- `start_ts`
- `end_ts`
- `duration_bars`
- `price_change_pct`
- `confidence`
- `maturity`
- `trend_strength`

### `phase`

Allowed values:

- `accumulation`
- `markup`
- `distribution`
- `markdown`
- `unclear`

### `maturity`

Allowed values:

- `fresh`
- `maturing`
- `mature`
- `degrading`

### `trend_strength`

Allowed values:

- `weak`
- `moderate`
- `strong`

## Optional Later Fields

These may be added later if they prove useful:

- `transition_reason`
- `supporting_evidence`
- `volume_character`
- `value_area_relation`
- `range_quality`

These are not required in the first implementation.

## Confidence Model

Use a simple bounded score:

- `0` to `100`

Confidence means:

- how well the current evidence supports the assigned phase label

It does not mean:

- certainty that the market is objectively in that phase
- permission to trade by itself

### Confidence Bands

- `0-39` = `weak`
- `40-69` = `moderate`
- `70-100` = `strong`

## Evidence Families For Confidence

The exact weights are deferred, but the confidence model should draw from these evidence families:

- structure coherence
- range behavior or phase geometry
- breakout or rejection quality
- volume character
- duration adequacy
- transition consistency with prior segment

## Runtime Role

Wyckoff historical state should be used as context for:

- transition sequence reading
- current phase maturity
- whether the current phase is fresh, mature, or degrading
- whether the current phase fits the recent cycle

It should not:

- override structure, location, trigger, and risk by itself
- become a standalone trade trigger

## Chart Artifact

The target human-facing artifact should include:

- historical phase bands over price
- a compact phase table

The phase table should show:

- phase
- period
- duration
- price change
- trend strength
- confidence

## Deferred Items

The following remain intentionally deferred:

- exact segmentation algorithm
- exact transition-detection rules
- exact confidence weighting model
- edge-case handling for overlapping or ambiguous segments
- exact chart-rendering design details

These should be settled only after the broader workflow and policy contracts are stable.

## Recommended Implementation Order

1. lock the segment schema
2. lock the confidence bands
3. emit a simple recent history in the state packet
4. add historical phase chart artifact
5. refine segmentation and scoring later using real review feedback
