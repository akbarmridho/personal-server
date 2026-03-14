# Technical Analysis Script Migration Plan

## Purpose

This document translates the technical-analysis refactor plan into concrete script migration work.

It focuses on:

- deterministic context generation
- chart generation
- chart evidence payloads
- migration order

It does not redefine doctrine.
It exists so script changes can be planned against the future contract without mixing that work into the higher-level workflow docs.

## Current Script State

The live scripts still implement the older technical-analysis contract.

### Deterministic Context Script

Current owner:

- `.opencode-config/skills/technical-analysis/scripts/build_ta_context.py`

Current major outputs:

- `state_and_regime`
- `levels`
- `structure_events`
- `setup_selection`
- `divergence`
- `price_volume_summary`
- `distribution_days`
- `informed_money`
- `red_flags`
- `liquidity`
- optional `vpvr`
- optional `breakout`
- optional `imbalance`
- optional `smc`

Current old-contract residue:

- `fib_context`
- `SMA100` inside baseline MA posture
- always-on divergence computation
- single-label `wyckoff_context` only
- `informed_money` inside technical-analysis

### Chart Generation Script

Current owner:

- `.opencode-config/skills/technical-analysis/scripts/generate_ta_charts.py`

Current generated charts:

- `daily_structure_sr`
- `daily_structure_fib`
- `intraday_structure`
- `structure_events`
- `trade_plan`
- optional `vpvr_profile`
- optional `imbalance_fvg`
- optional `detail`

Current chart evidence output:

- generated chart paths
- data ranges
- zones
- structure events
- liquidity draws
- trade plan
- optional VPVR stats
- optional imbalance zones

## Migration Goal

Bring the scripts into alignment with the planned future-state technical-analysis contract.

That means:

- lean baseline MA context
- no Fib in the default system
- no `OTE`
- divergence only when conditionally triggered
- Wyckoff as current state plus historical timeline
- chart artifacts that match the retained baseline workflow
- payloads that are easier to feed into the new policy contract and backtesting layer

## Deterministic Context Changes

### Remove From Future Baseline Context

Remove these from the default deterministic TA payload:

- `fib_context`
- `SMA100` from baseline MA posture
- `informed_money`

Reason:

- Fib is not part of the future default system
- `100SMA` is not part of the lean baseline
- informed-money / foreign-flow style evidence should not remain inside core chart-based TA

### Keep In Baseline Context

Keep these as baseline:

- `state`
- `regime`
- `trend_bias`
- `structure_status`
- `levels`
- `liquidity`
- `setup_selection`
- baseline MA posture using `21EMA`, `50SMA`, `200SMA`
- time-based opens
- round levels
- red flags
- breakout state when the breakout module is active
- VPVR context when the VPVR module is active

### Add To Future Baseline Context

Add Wyckoff historical-state support:

- `current_wyckoff_phase`
- `wyckoff_history`
- `wyckoff_current_confidence`
- `wyckoff_current_maturity`

This should follow:

- [wyckoff-historical-state-design.md](/Users/akbar.maulana.ridho/personal-server/apps/vibe-investor/plan/wyckoff-historical-state-design.md)

### Update Existing Context Behavior

#### MA Posture

Change baseline MA posture to:

- `above_ema21`
- `above_sma50`
- `above_sma200`

Remove:

- `above_sma100`

Adaptive MA should remain available, but it should behave as a conditional overlay input rather than default baseline emphasis.

#### Divergence

Current state:

- divergence is computed every run

Future state:

- divergence should be computed only when triggered by context
- extended move
- reversal suspicion
- thesis degradation
- postmortem

This likely means:

- either gating divergence inside `build_ta_context.py`
- or moving divergence computation into a conditional overlay step driven by the future policy contract

#### Wyckoff

Current state:

- single `wyckoff_context` label only

Future state:

- retain current-phase label
- add recent phase timeline
- add confidence and maturity

This is not a cosmetic change.
It is a real feature addition to deterministic preprocessing.

## Chart Migration Plan

### Keep

Keep these chart artifacts in the future system:

- `daily_structure`
- `intraday_structure`
- `structure_events`
- `trade_plan`
- `vpvr_profile`
- `imbalance_fvg`

### Remove

Remove these from the future default chart set:

- `daily_structure_fib`
- current `detail` chart in its current form

Reason:

- `daily_structure_fib` exists only because Fib is still part of the old contract
- the current `detail` chart is mostly a Fib plus RSI refinement view and does not fit the new default path

### Update Existing Charts

#### `daily_structure`

Target this chart as the retained default daily map.

During migration, the live script may still emit `daily_structure_sr`, but the intended future artifact name is `daily_structure`.

Update it to:

- show `EMA21`
- show `SMA50`
- show `SMA200`
- remove `SMA100`
- remain support/resistance-centered
- remain the default retained daily structure map

#### `intraday_structure`

Keep it as the `60m` timing chart.

Review whether it should continue showing:

- `EMA9`
- `EMA20`
- `VWAP`

This is still compatible with the plan because intraday is a timing layer, not the baseline daily regime layer.

#### `structure_events`

Keep it.

It still fits the future workflow because:

- `CHOCH`
- `BOS`
- liquidity draw context

remain relevant to trigger and confirmation.

#### `trade_plan`

Keep it, but ensure its inputs eventually align with:

- future `RISK`
- future `DECISION`
- future level-to-level execution logic after merge

#### `vpvr_profile`

Keep it as an optional-but-useful chart.

It still fits the future baseline because VPVR remains part of core context.

#### `imbalance_fvg`

Keep it as an imbalance overlay chart.

Do not treat it as part of `SMC/ICT`.
It belongs to the imbalance overlay path.

### Add New Chart

Add a new Wyckoff history chart artifact.

Target shape:

- historical phase bands over price
- compact phase table
- current phase highlighted
- recent phase sequence visible
- confidence and maturity readable

This chart should become the main human-facing artifact for the future Wyckoff contract.

## Chart Evidence Payload Changes

### Remove From Baseline Evidence Expectations

Remove baseline dependency on:

- `daily_structure_fib`
- Fib-specific evidence notes

### Keep

Keep baseline chart evidence support for:

- generated chart paths
- zones
- structure events
- trade plan
- VPVR summary when active
- imbalance zones when active

### Add

Add support for:

- Wyckoff history artifact path
- Wyckoff phase-table summary
- current phase confidence
- current phase maturity

The chart evidence JSON should become compatible with the future output/reporting contract, not just the old chart list.

## Script Migration Order

### Step 1. Clean Deterministic Baseline Payload

In `build_ta_context.py`:

- remove `fib_context`
- remove `above_sma100`
- remove `informed_money`
- keep adaptive MA only as overlay-oriented metadata

This is the lowest-risk cleanup because it mostly removes old default residue.

### Step 2. Add Wyckoff Historical State

In deterministic preprocessing:

- add recent Wyckoff segment history
- add current confidence
- add current maturity

This is the biggest net-new feature.

### Step 3. Make Divergence Conditional

Change divergence from:

- always-on baseline field

to:

- conditional diagnostic field

The runtime should only compute or include it when the context requires it.

### Step 4. Clean Daily Chart Baseline

In `generate_ta_charts.py`:

- stop generating `daily_structure_fib`
- remove `SMA100` from the retained daily chart
- make `daily_structure` the default daily map

### Step 5. Remove Or Replace `detail`

Decide one of:

- delete the current `detail` chart entirely
- or replace it with a future chart that actually fits the refactored contract

Do not keep the current Fib-heavy version by inertia.

### Step 6. Add Wyckoff History Chart

Add the future historical-phase artifact after the deterministic history contract exists.

### Step 7. Rewrite Chart Evidence Contract

Update `chart_evidence.json` so it matches:

- retained chart artifacts
- optional overlay artifacts
- future Wyckoff history support
- future reporting and backtest needs

## Recommended Final Artifact Set

### Baseline Charts

- `daily_structure`
- `intraday_structure`
- `structure_events`
- `trade_plan`

### Baseline Optional Context

- `vpvr_profile`
- `wyckoff_history`

### Escalated Overlay Charts

- `imbalance_fvg`

Potential later additions should be justified by the refactored contract, not inherited from the old script set.

## Open Script Design Questions

These still need explicit decisions before implementation:

1. Should divergence be fully computed on demand only, or always computed but only exposed conditionally?
2. Should adaptive MA remain always computed internally, or only be derived when a trigger is met?
3. What exact artifact name should the future Wyckoff chart use?
4. Should `intraday_structure` remain fixed as EMA9/EMA20/VWAP, or should it be simplified later?
5. Should the current `trade_plan` chart stay baseline even when the selected setup is `NO_VALID_SETUP`, or should it become conditional?

## Immediate Next Step

Before editing live scripts, the safest next implementation doc is:

- a concrete field-level target schema for `ta_context.json`

Without that, script cleanup risks drifting away from the future policy contract.
