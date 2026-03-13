# Human Flow Analyst Workflow

## Purpose

This document translates the `flow-analysis` doctrine into a human analyst workflow.

It is a future-state workflow note for the planned `flow-analysis` skill.

The goal is to make the broker-flow method understandable, testable, and reviewable by a human before it is turned into an AI-facing skill contract.

## Core Mental Model

A good human flow analyst does not begin with the final verdict badge.

A real workflow is closer to:

1. What exact symbol, window, and snapshot am I reading?
2. Who is actually active on the buy and sell sides?
3. Is the action concentrated or noisy?
4. Are the strongest brokers accumulating or distributing?
5. Is the execution quality aggressive, patient, or neutral?
6. Are the advanced signals and anomaly checks clean enough to trust?
7. Does broker distribution visually confirm the story?
8. Does broker flow deserve weight on this ticker right now?
9. What is the current flow verdict?
10. How should this interact with technical structure and Wyckoff context?
11. What outcome bucket does this belong to?
12. What would confirm, weaken, or invalidate the read next?

The key discipline is:

- start with raw broker behavior
- then move to derived metrics
- then trust filters
- then verdict
- then integration

## Human Workflow By Phase

### 1. Define The Analysis Job

Before reading the dashboard, define the mode:

- `INITIAL`
- `UPDATE`
- `THESIS_REVIEW`
- `POSTMORTEM`

Human question:

- am I building a fresh flow read, checking whether a prior read still holds, or reviewing a failed call?

This matters because flow reads are very sensitive to date windows and whether the question is:

- direction
- sponsor quality
- deterioration
- early accumulation

### 2. Check Input Window And Snapshot

The first question is not bullish or bearish.

The first question is:

- what exact symbol, date range, and snapshot am I reading?

Human checks:

- selected symbol
- selected date or range
- whether the read is single-day or multi-day
- whether the snapshot is recent enough for the decision being made

This is important because a stale or mismatched window can distort every conclusion after it.

### 3. Start With Gross, Not Net

This is the most important reading rule.

Human rule:

- always start with `gross`
- use `net` only after the gross picture is already understood

Why:

- net can hide meaningful two-way activity
- a broker that buys and sells heavily may look neutral in net terms while still dominating the tape

The first practical read should be:

- who bought
- who sold
- how much
- at what average price

### 4. Read The Broker Summary First

The broker summary is the raw-source layer.

The analyst asks:

- are a few serious brokers driving this move?
- is one buyer absorbing many sellers?
- is one seller feeding many buyers?
- is the table noisy and fragmented?

Human observations:

- top buyer share
- top seller share
- dominant broker list
- total value and total lots
- average buy versus average sell price

This phase answers:

- whether the move has a sponsor
- whether the sponsor looks concentrated or scattered

### 5. Read Core Metrics For Direction

Only after the raw table is understood should the analyst use the core metrics.

Read them in this order:

1. `CADI`
2. broker-side `VWAP`
3. `GVPR`

`MFI` and `Frequency` should also be understood here as internal verdict inputs even if they are not promoted as headline cards.

Questions:

- are the strongest brokers accumulating or distributing?
- are buyers paying up or getting favorable execution?
- is participation concentrated enough to matter?

Human interpretation:

- rising `CADI` matters more if it persists across several sessions
- execution quality matters more when it agrees with directional accumulation or distribution
- concentration matters more when one side is clearly stronger than the other

### 6. Use Advanced Signals As Trust Filters

Advanced signals should refine and validate the directional story, not replace it.

Read them in this order:

1. `SMT`
2. flow divergence
3. flow-price correlation
4. persistence
5. concentration asymmetry

Human question:

- is this directional story clean, noisy, early, or already degrading?

Practical roles:

- `SMT` checks whether the directional flow looks institutionally real
- divergence checks whether price and flow are separating
- flow-price correlation checks whether flow should matter much on this ticker
- persistence checks whether the same brokers keep pressing the same side
- concentration asymmetry checks whether a few serious hands dominate one side
- wash-risk or anomaly checks stop the analyst from over-trusting mechanically bullish or bearish reads

### 7. Use Broker Distribution As Visual Confirmation

Before locking conviction, the analyst should inspect broker-distribution structure.

Questions:

- who is feeding whom?
- is one strong hand absorbing many scattered participants?
- is the apparent verdict just noisy churn between many similar-sized actors?

This is a confirmation step, not the first directional step.

### 8. Check Trust And Ticker Regime

Not every stock deserves the same confidence in flow signals.

The analyst asks:

- is this a stock where broker flow tends to matter?
- is that relationship active right now?
- is the stock liquid enough and large enough for the read to carry weight?

Human considerations:

- market-cap profile
- liquidity profile
- flow-price correlation strength
- whether the active regime is supportive or weak

This is where the analyst decides whether the flow read should:

- lead the process
- support the process
- or stay secondary

### 9. Form The Flow Verdict

Only after raw source, core metrics, and trust filters are checked should the analyst accept a verdict.

Allowed outcomes:

- `ACCUMULATION`
- `DISTRIBUTION`
- `NEUTRAL`

Human rule:

- verdict is a weighted evidence lean, not a promise

The analyst should record:

- verdict
- conviction
- strongest supporting factors
- strongest caution factors

The internal scoring model should be thought of as a smooth spectrum, not a set of hard switches.

### 10. Compare Flow With Technical Structure

This is where the overlap with technical analysis becomes useful.

The analyst asks:

- does flow confirm current price structure?
- does flow lead structure?
- does flow warn that current structure is deteriorating?
- does flow disagree with the current Wyckoff context in a way that matters?

High-value cases:

- technical bullish + flow bullish = confirmation
- technical bearish + flow bearish = confirmation
- technical still bullish + flow bearish = early warning
- technical still weak + flow bullish = early accumulation or early turn

Wyckoff-specific interpretation should stay explicit:

- strong technical markup plus weakening flow can signal sponsor deterioration before price fully rolls over
- weak or basing technical structure plus improving flow can signal early accumulation before price confirms
- when flow and Wyckoff disagree, the disagreement itself should be recorded rather than forced into false alignment

Human rule:

- when they agree, confidence improves
- when they disagree, do not force false alignment
- disagreement is often the meaningful part of the read

### 11. End With One Of Four Outcomes

A disciplined flow analyst usually ends with:

- confirmed constructive flow
- early constructive flow
- distribution warning
- low-quality or noisy flow

These are more useful than pretending every read is a direct buy or sell command.

### 12. Define Monitoring And Next Review Conditions

After the verdict is formed, the analyst should still define:

- what confirms the read
- what weakens the read
- what next review window matters
- whether the signal is improving, degrading, or stalling

Monitoring matters because flow often leads price by days or weeks rather than resolving immediately.

## Reading Order

In practice, a disciplined human analyst should read the dashboard in this order:

1. input window and snapshot
2. gross broker summary
3. broker summary stats and table
4. core metrics
5. advanced signals
6. broker distribution as visual confirmation
7. trust and ticker regime
8. verdict
9. technical-flow integration
10. monitoring

## Decision Tree

### Primary Tree

1. Is the data window valid and fresh enough?
   - yes -> continue
   - no -> stop or downgrade confidence
2. Does gross broker summary show meaningful sponsorship?
   - yes -> continue
   - no -> downgrade confidence
3. Do `CADI`, broker `VWAP`, and `GVPR` tell a coherent directional story?
   - yes -> continue
   - mixed -> continue with caution
   - no -> lean `NEUTRAL`
4. Do advanced signals improve trust?
   - yes -> strengthen conviction
   - mixed -> keep moderate conviction
   - no -> downgrade
5. Does this ticker deserve broker-flow trust right now?
   - yes -> flow can lead or strongly influence
   - no -> flow stays secondary
6. Does broker distribution visually confirm the read?
   - yes -> continue
   - mixed -> continue with caution
   - no -> downgrade conviction
7. What is the verdict?
   - `ACCUMULATION`
   - `DISTRIBUTION`
   - `NEUTRAL`
8. How does the verdict interact with technical structure?
   - confirms
   - leads
   - warns
   - stays noisy
9. What should be monitored next?

## What The Human Looks For First

In practice, a good flow analyst usually checks in this order:

1. gross versus net
2. whether the same broker codes keep appearing
3. whether the buy side or sell side is concentrated
4. whether `CADI` is persistently rising or falling
5. whether `SMT` is clean enough to trust
6. whether divergence or correlation changes the confidence level
7. whether the flow read confirms or contradicts the technical picture

## Practical Discipline Rules

- gross first, net last
- persistence matters more than one-day spikes
- sponsor quality matters more than raw direction alone
- divergence is a warning, not a trigger
- trust filters should change conviction, not invent direction
- flow can lead price, but not every signal deserves equal weight
- when the evidence stack is messy, the right answer is often patience
