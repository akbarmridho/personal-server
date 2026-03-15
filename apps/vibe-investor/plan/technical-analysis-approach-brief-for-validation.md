# Technical Analysis Approach Brief

## Purpose

This is a short external-facing brief of the current `vibe-investor` technical-analysis approach.

It is intended to be passed to a research or review agent for grading, validation, or critique.

## Use Case

This technical-analysis layer is designed for:

- Indonesian stock exchange (`IDX`) equities
- swing trades
- medium-term position trades
- long-term position analysis

It is not the sole production decision engine.

In production, technical analysis is a helper for:

- entry timing
- exit timing
- invalidation
- trade path and risk mapping

Broader production decisions may still include:

- fundamentals
- narrative
- market context
- portfolio context

However, this technical-analysis layer should also be strong enough to be backtested independently.

## Data Assumptions

Current design uses only OHLCV-style market data:

- `daily[]`
- `60m intraday[]`
- optional `corp_actions[]` in runtime

For backtesting and long-window evaluation, `corp_actions[]` should be treated as required.

Price contract:

- split-style adjusted
- not dividend-adjusted

No order book, tick, or alternative data is assumed in the current technical-analysis layer.

## Core Philosophy

The system is a deterministic-first, AI-assisted technical-analysis workflow.

It does not ask the AI to rediscover the chart from raw data alone.

Instead, it works in two layers:

1. deterministic preprocessing from OHLCV
2. bounded AI judgment on top of structured state and chart artifacts

The AI is used for:

- conflict resolution
- setup selection
- interpreting mixed evidence
- choosing among bounded actions

The AI is not intended to freestyle unsupported chart narratives.

## Timeframe Model

The approach is top-down and multi-timeframe:

- `daily` = thesis authority
- `60m` = trigger, confirmation, and tactical timing authority

The lower timeframe is not supposed to run as a separate thesis engine.
It exists to refine the daily thesis.

## Workflow

Canonical order:

1. `MODE`
2. `STATE`
3. `LOCATION`
4. `SETUP`
5. `TRIGGER`
6. `CONFIRMATION`
7. `RISK`
8. `DECISION`
9. `MONITORING`

Interpretation:

- first classify the higher-timeframe market state
- then locate price relative to meaningful zones
- then choose one setup family or none
- then demand a real trigger
- then confirm participation and acceptance
- then build risk from invalidation backward
- then decide

If contradiction remains unresolved, the default output is `WAIT`.

## Bounded Decision Model

Allowed final actions:

- `BUY`
- `HOLD`
- `WAIT`
- `EXIT`

This is a long-only action space.

Allowed setup families:

- `S1` breakout and retest continuation
- `S2` pullback to demand in intact uptrend
- `S3` sweep and reclaim reversal
- `S4` range edge rotation
- `S5` Wyckoff spring with reclaim
- `NO_VALID_SETUP`

## Main Schools Of Thought Used

The current approach is not a pure single-school system.
It combines a few schools with explicit precedence.

### 1. Classic market-structure and trend analysis

This is the base layer.

Used for:

- trend bias
- structure status
- support and resistance
- breakout vs range context
- invalidation logic
- next-path logic

This is the main framework that owns thesis direction and trade path logic.

### 2. Multi-timeframe price action

Used for:

- aligning higher-timeframe thesis with lower-timeframe timing
- checking trigger quality
- checking follow-through
- separating thesis from entry timing

### 3. Lean moving-average regime context

Baseline MA context is intentionally simple:

- `EMA21`
- `SMA50`
- `SMA200`

Used for:

- regime posture
- support or resistance role
- damage vs intact trend context

An adaptive MA is available, but only as a conditional overlay when symbol-specific rhythm matters.
It is not part of the preferred core doctrine.

### 4. Support/resistance and location logic

Used for:

- nearby decision zones
- reclaim vs rejection logic
- level-to-level pathing
- risk and target map

Trades should not be taken without meaningful location.

### 5. Volume profile / value acceptance

VPVR and value-area context are part of core location logic.

Used for:

- value acceptance vs rejection
- judging whether price is inside value, probing, or accepted outside value
- improving location context around decision zones

This is supporting evidence, not the main thesis owner.
It should be treated cautiously when data granularity is too coarse for strong value-acceptance claims.

### 6. Wyckoff

Wyckoff is used as a contextual interpretive layer, especially around:

- springs
- reversal context
- accumulation / markup / distribution / markdown framing

In the current system, Wyckoff should support state reading and setup context.
It should not replace the broader structure-first workflow.

Wyckoff historical-state implementation is still pending as a separate state layer.
Wyckoff is no longer intended to expand into the main thesis engine.

### 7. Conditional overlays

The following are optional overlays, not mandatory baseline doctrine:

- adaptive MA
- imbalance / fair value gap

These overlays are only supposed to activate when:

- the default read is insufficient
- a specific decision-relevant question remains unresolved
- the runtime is escalated

They are not supposed to override:

- structure
- trigger
- invalidation
- risk map

Current direction after review:

- `adaptive MA` and `imbalance` are non-core unless later backtests justify them

## Charting Approach

The system is chart-first, but not chart-only.

Operationally:

1. build deterministic `ta_context`
2. generate charts
3. read the charts
4. cross-check chart observations against deterministic evidence
5. decide

The chart is meant to:

- improve visual grounding
- help catch structural contradictions
- support interpretation quality

The chart is not supposed to replace the deterministic state packet.

## What The System Is Trying To Optimize

The approach is trying to optimize for:

- better entry timing
- cleaner invalidation
- better reward-to-risk mapping
- fewer low-quality trades in bad location
- coherence across swing and position-style decisions

It is not designed as:

- a high-frequency system
- a pure indicator-crossover strategy
- a pure Wyckoff-only system
- a fundamentals replacement

## What Makes It More Systematic

The methodology already has several systematic constraints:

- deterministic preprocessing first
- explicit phase order
- bounded action space
- bounded setup space
- explicit `WAIT` default
- explicit invalidation requirement
- explicit next-zone path requirement
- daily-thesis and `60m`-timing separation

## Where The Approach May Still Need Validation

The main open question is not architecture.
The main open question is doctrine quality and doctrine consistency.

Potential concerns to grade:

- whether the blend of structure, VPVR, and Wyckoff is coherent
- whether some components are redundant
- whether some doctrines are too social-media-derived rather than primary-source-grounded
- whether this complexity is justified for `IDX` names and the intended swing / position style
- whether simpler baselines would work just as well or better

## Baselines It Should Eventually Beat

In backtesting, the full approach should be compared against at least:

- simple trend plus pullback baseline
- simple breakout plus volume baseline
- simple range-reclaim baseline

If the full methodology does not meaningfully improve on those, then the complexity is not justified.

## What To Grade

Please grade this approach on:

- suitability for Indonesian stock exchange equities
- suitability for swing and medium-term / long-term position analysis
- coherence of the blended schools of thought
- likely robustness under OHLCV-only constraints
- whether the doctrine stack is too complex, reasonable, or incomplete
- whether any component should be demoted, removed, or made primary
