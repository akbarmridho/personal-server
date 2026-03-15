# Human Technical Analyst Workflow

## Purpose

This document describes the current human-readable method behind the live `technical-analysis` skill.

It is a current-state workflow reference, not a planning file.

## Core Method

The workflow is:

1. define the job
2. classify daily state
3. map location
4. choose one setup family or none
5. demand a real trigger
6. confirm participation and acceptance
7. build risk from invalidation backward
8. choose one action
9. define monitoring conditions

If any decision-critical step is unclear, the correct result is `WAIT`.

## Inputs

Use:

- `daily[]` for thesis direction, setup context, and main risk map
- raw `intraday_1m[]` as the intraday source
- derived `15m` for tactical timing
- `corp_actions[]` when available

## Phase Guide

### 1. Define the job

Use one of:

- `INITIAL`
- `UPDATE`
- `POSTMORTEM`

For `UPDATE`, still record:

- `thesis_status`
- `review_reason`

### 2. Start with daily state

The first question is not whether there is a buy signal.

The first question is:

- trending, ranging, transitioning, or no-trade?

Classify:

- `state`
- `regime`
- `trend_bias`
- `structure_status`

Daily remains the thesis owner.

### 3. Map location

Mark only the meaningful decision zones:

- horizontal support and resistance
- obvious swing zones
- value-area references:
  - `POC`
  - `VAH`
  - `VAL`
- lean MA context:
  - `EMA21`
  - `SMA50`
  - `SMA200`
- time opens and round levels when relevant

Answer:

- where would a reaction matter?
- where would a break matter?
- is price in usable location or just mid-range noise?

### 4. Assess current location

Typical location reads:

- near support in bullish structure
- near resistance in bearish structure
- at range edge
- accepted above resistance
- accepted below support
- mid-range noise

If price is in mid-range noise and no meaningful zone is active, lean to `WAIT`.

### 5. Choose one setup family

Allowed setup families:

- `S1` breakout and retest continuation
- `S2` pullback to demand in intact uptrend
- `S3` sweep and reclaim reversal
- `S4` range edge rotation
- `S5` Wyckoff spring with reclaim
- `NO_VALID_SETUP`

Setup selection should come from:

- regime
- location
- structure
- participation quality

Do not carry multiple final setup families into trigger and risk.

### 6. Demand a real trigger

A setup is not enough by itself.

Examples:

- breakout requires close beyond level and follow-through
- pullback requires support hold and constructive reaction
- reversal requires structural shift and confirmation
- sweep/reclaim requires clear reclaim or rejection

The `15m` chart enters here for tactical timing.
It refines the daily thesis but does not replace it.

### 7. Confirm participation and acceptance

Relevant checks:

- follow-through quality
- price-volume behavior
- value-area acceptance or rejection
- latest structure event relevance
- intraday timing authority
- raw intraday participation quality

This is a confirmation or veto layer, not the origin of the trade idea.

If raw intraday quality is weak:

- downgrade to daily-only timing
- or stay in `WAIT`

### 8. Use adaptive MA only as refinement

Adaptive MA is available, but it is not the main doctrine.

Use it only to refine:

- symbol-specific rhythm
- pullback quality
- local timing

Baseline context remains:

- `EMA21`
- `SMA50`
- `SMA200`

### 9. Use liquidity logic for path, not narrative

Ask:

- what is the current draw?
- what is the opposing draw?
- was a recent sweep accepted or rejected?
- is there a clear path to the next zone?

This helps map likely path, but it should not override invalidation or risk discipline.

### 10. Build the trade from invalidation backward

Before action, define:

- entry zone
- invalidation level
- stop basis
- next-zone target
- target ladder when relevant
- expected reward-to-risk

Rules:

- no invalidation, no trade
- no next-zone path, no trade
- poor RR, usually no trade

### 11. End with one bounded action

Allowed final actions:

- `BUY`
- `HOLD`
- `WAIT`
- `EXIT`

`WAIT` is a normal result.

### 12. Define monitoring

Every run should end with:

- thesis confirmation triggers
- invalidation triggers
- next review condition
- stale setup condition

## Timeframe Authority

Daily owns:

- state
- location
- setup context
- main risk map

`15m` owns:

- trigger
- confirmation
- local acceptance or rejection
- tactical timing

Raw `1m` supports:

- intraday liquidity gating
- participation quality
- future profile and replay improvements

Authority rule:

- daily owns thesis direction
- `15m` may delay action, reduce confidence, or keep the result in `WAIT`
- `15m` should not create a trade against the daily thesis by itself
- if intraday liquidity quality is too weak, `15m` should lose timing authority

## Wyckoff Role

Wyckoff remains narrower than the main structure workflow.

Use it for:

- slower context
- spring and reclaim interpretation
- `S5`
- recent phase sequence context

Do not let Wyckoff replace the structure-first workflow.

## VPVR Role

VPVR remains supportive, not primary.

Use it for:

- better location context
- acceptance versus rejection around value
- confluence around active decision zones

Do not let VPVR override structure, invalidation, or risk.

## Practical Stop Rules

Return `WAIT` when:

- daily state is unclear
- price is in mid-range noise
- no setup family fits cleanly
- trigger is absent
- intraday timing authority is too weak
- invalidation is unclear
- next-zone path is unclear
- reward-to-risk is insufficient
