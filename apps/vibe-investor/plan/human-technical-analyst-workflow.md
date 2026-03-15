# Human Technical Analyst Workflow

## Purpose

This document describes the current human-readable method behind the `technical-analysis` skill.

It mirrors the live structure-first workflow used by the skill, without restating the full runtime contract.

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

If any decision-critical step is unclear, the correct outcome is `WAIT`.

## Phase Guide

### 1. Define the job

Use one of:

- `INITIAL`
- `UPDATE`
- `POSTMORTEM`

Questions:

- am I building a fresh thesis?
- am I refreshing an existing thesis?
- am I reviewing a failed or exited thesis?

For `UPDATE`, the analyst should still record:

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

The analyst should answer:

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

If price is in mid-range noise and no meaningful zone is active, the workflow should lean to `WAIT`.

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

The `60m` chart enters here for tactical timing.
It refines the daily thesis but does not replace it.

### 7. Confirm participation and acceptance

Relevant checks:

- follow-through quality
- price-volume behavior
- value-area acceptance or rejection
- latest structure event relevance

This is a confirmation or veto layer, not the origin of the trade idea.

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

The analyst should ask:

- what is the current draw?
- what is the opposing draw?
- was a recent sweep accepted or rejected?
- is there a clear path to the next zone?

This helps map the likely path, but it should not override invalidation or risk discipline.

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

`60m` owns:

- trigger
- confirmation
- local acceptance or rejection
- tactical timing

Authority rule:

- daily owns thesis direction
- `60m` may delay action, reduce confidence, or keep the result in `WAIT`
- `60m` should not create a trade against the daily thesis by itself

## Wyckoff Role

Wyckoff remains narrower than the main structure workflow.

Use it for:

- slower context
- spring and reclaim interpretation
- `S5`

Do not let it replace structure, location, trigger, or risk.

Historical Wyckoff state belongs to its own module, not to this human workflow note.

## Quick Decision Tree

1. What is the job: `INITIAL`, `UPDATE`, or `POSTMORTEM`?
2. What is the daily regime?
3. Is price at a meaningful decision zone?
4. Which single setup family fits?
5. Has the setup actually triggered?
6. Does participation confirm it?
7. Is invalidation clear?
8. Is there a clear path to the next zone?
9. Is RR acceptable?
10. If not, return `WAIT`.
