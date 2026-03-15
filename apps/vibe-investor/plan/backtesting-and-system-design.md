# Backtesting And System Design

## Purpose

This document is the source of truth for how to backtest and evaluate the technical-analysis skill while keeping the AI in the loop.

It defines the required replay, execution, and comparison contracts for future implementation.

The goal is not to remove LLM reasoning.

The goal is to:

- keep the product aligned with vibe investing
- preserve nuanced judgment
- control token cost
- improve repeatability
- separate policy quality from preprocessing quality

## Core Design Principle

Do not ask the LLM to rediscover the entire chart from raw OHLCV on every step.

Do ask the LLM to make judgment calls on top of a compact, deterministic market state.

This means the system should be split into two layers:

- deterministic market-state construction
- LLM policy judgment

The deterministic layer compresses history into a structured state packet.
The LLM layer interprets that packet, handles conflict resolution, and chooses an action.

## Required Backtest Contracts

Before implementation, the backtest design must define these explicit contracts:

- a field-level state packet schema, not only prose
- v1 scenario-window input contract
- daily-first replay rules and optional intraday extension rules
- concrete execution simulator assumptions
- evaluator baseline bands for what counts as acceptable behavior
- baseline strategy definitions for comparison

These contracts should not remain implicit.

## V1 Implementation Scope

The first implementation should use window backtest mode.

Window selection should be anchored to the user's real trades.

This means:

- each scenario is one symbol plus one replay window
- the replay window is selected because it matches a real trade period or a closely related management period
- the engine replays the entire window day by day
- the comparison target is the user's actual trade behavior on that same window

The first implementation should be daily-only.

This means:

- use daily OHLCV only in the first pass
- do not require `intraday_1m[]` to start validating trade-management quality
- do not block v1 on `15m` replay or intraday liquidity gating
- keep the architecture ready for later `1m -> 15m` replay without making it a prerequisite

The first implementation is still a backtest engine, not a single-trade checker.

Each replay window should emit:

- a daily decision log
- simulated entries and exits under the shared execution contract
- final scenario outcome
- comparison against the user's actual trade when provided

## V1 Scenario Input Contract

The first implementation should accept a scenario manifest.

Each scenario should support:

- `id`
- `symbol`
- `ohlcv_path`
- `window_start_date`
- `window_end_date`
- `initial_position`
- optional `actual_trade`
- optional `notes`

`initial_position` should support two states:

- `flat`
- `long`

If the state is `long`, include:

- `entry_date`
- `entry_price`
- optional `size`

If actual user behavior is available, include:

- actual entry details when relevant
- actual exit details when relevant
- optional comments for why the trade was managed that way

Example:

```json
{
  "scenarios": [
    {
      "id": "bbca-2025-01-window-01",
      "symbol": "BBCA",
      "ohlcv_path": "data/bbca_2025_q1_daily.json",
      "window_start_date": "2025-01-10",
      "window_end_date": "2025-02-14",
      "initial_position": {
        "state": "long",
        "entry_date": "2025-01-08",
        "entry_price": 9875,
        "size": 1
      },
      "actual_trade": {
        "exit_date": "2025-02-03",
        "exit_price": 10350
      }
    }
  ]
}
```

Interpretation rule:

- one scenario is one replay window
- one replay window may contain no trade, one trade episode, or multiple actions
- the preferred v1 use is one trade-management episode per scenario so comparison against the user's real trade stays clean

## IDX Replay Contract

Replay and execution must model IDX market structure directly.

### Daily Replay

Daily replay owns:

- thesis direction
- regime and structure state
- key support and resistance
- main setup classification
- main risk map

Daily replay is the minimum viable replay path.

### `15m` Replay

`15m` replay is allowed only as a timing layer inside an already-existing daily thesis or watch state.

`15m` replay owns:

- trigger timing
- acceptance or rejection around active levels
- follow-through quality
- local timing veto

`15m` replay must not create an independent thesis against the daily context.

### Session Handling

For IDX backtests, the replay layer must explicitly model:

- pre-open and opening auction effects
- lunch-break discontinuity
- late-session and pre-close distortion
- closing auction effects
- watchlist or call-auction symbols as a separate category

Implementation rule:

- continuous-session logic is the default for normal intraday timing
- auction-distorted bars should not be treated as ordinary trigger bars
- if a symbol is on a board or condition where call-auction behavior dominates, `15m` timing authority should be disabled or the symbol excluded from normal intraday tests

### Bar Validity Rule

The backtest engine should track whether a `15m` bar is:

- continuous-session dominant
- auction-distorted
- structurally incomplete due to lunch/session split

Only continuous-session-dominant bars should be trusted for normal trigger confirmation.

## IDX Execution Contract

### ARB / ARA Awareness

Execution assumptions must respect exchange price-limit behavior.

The simulator must model:

- downside exit stress when price moves into ARB-constrained behavior
- upside reward truncation or path distortion when price approaches ARA limits
- gap-like invalidation behavior when a stop would require trading through a limit state

Implementation rule:

- a stop is not assumed frictionless just because the invalidation level was crossed
- if an exit path is blocked or materially distorted by ARB behavior, the backtest should record that as constrained execution, not ideal execution
- if a reward path depends on unrealistic unconstrained continuation through ARA behavior, the backtest should not credit it as ordinary clean execution

### Default Fill Assumptions

Until a more detailed simulator exists, use these default assumptions:

- entries: next valid bar open after signal
- stops: next valid executable price after invalidation, not the theoretical invalidation print
- targets: first valid touch through the target level on an executable bar
- stale setups: expire after the configured stale condition without assuming discretionary rescue

### Required Execution Outputs

Every simulated trade should record:

- signal timestamp
- assumed entry timestamp
- assumed fill price
- whether the fill was limit-constrained
- stop execution result
- target execution result
- stale-expiry result
- realized path notes for constrained exits

## Corporate-Action Contract

Corporate-action handling is deferred for the first backtest pass.

Current assumption:

- the provided OHLCV is already adjusted for stock splits and reverse splits

So the first replay pass should:

- not perform another split or reverse-split normalization pass
- not treat split-adjusted price continuity as an open backtest problem
- ignore `corp_actions[]` in the initial backtest implementation unless a future replay feature explicitly opts into them

Corporate actions remain post-backtest TODO territory.

### Deferred Dividend TODO

If corporate-action handling is revisited later, the first implementation should handle ex-dividend behavior.

Why:

- this is the remaining corporate-action case most likely to distort technical replay
- it matters more than split handling under the current adjusted-OHLCV contract
- it is still relevant even if dividend-heavy names are not the main trading universe

Required behavior:

- detect dividend events from `corp_actions[]`
- parse at least:
  - dividend amount
  - ex-date reference price when available
- mark a short ex-dividend event window in replay
- do not treat a mechanical ex-dividend gap as an ordinary bearish structural break by default
- record when a signal or invalidation occurs inside a dividend-aware event window

Minimum first-pass replay rule:

- event day and immediate follow-up bar should be treated as dividend-aware bars
- pure ex-dividend repricing should not by itself trigger fresh breakdown interpretation
- continued weak follow-through after the event window may still count as real technical damage

Observed payload shape example:

- `label = "D"`
- tooltips contain fields like:
  - `Dividend : 100`
  - `Ex-date Price : 4880`
  - `Date : 06 Jan 2026`

### Deferred Corporate-Action Scope

The following can stay explicitly deferred unless the trading universe starts to rely on them:

- rights issues
- bonus shares
- warrants and conversion-related reference-price events
- other non-dividend reference-price distortions

These should remain TODO items, not immediate replay blockers.

## Volume-Profile Contract

If VPVR or value-area context remains part of the system, the backtest and live TA pipeline should treat it as approximate unless the source data is granular enough.

Default data rule:

- prefer `1m` OHLCV as the practical source for VPVR reconstruction
- treat higher-granularity trade or tick data as better if it becomes available later
- do not treat `15m`-only or daily-only profile reconstruction as high-authority value-area truth

Default anchoring rule:

- do not anchor VPVR to the entire symbol history by default
- anchor it to the current meaningful daily structure range instead

Anchor selection rule:

- trend continuation:
  anchor from the swing that started the current leg
- active range or balance:
  anchor from the start of the active range
- potential reversal or transition:
  anchor from the last major break, reclaim, or regime-shift point
- unclear structure:
  fall back to a capped recent window

Authority rule:

- VPVR is supportive location context, not the primary thesis owner
- if source granularity or anchor quality is weak, downgrade confidence instead of letting VPVR override structure and risk

## Data-Granularity Notes By Module

The current TA scripts can run from daily plus derived `15m` intraday, but some modules would materially improve with better-granularity inputs.

### High-impact beneficiaries

- VPVR and value-area context:
  best improved by `1m` OHLCV or trade-level data because current volume-at-price reconstruction is approximate
- intraday trigger and timing quality:
  best improved by `5m` or `1m` OHLCV plus session and auction metadata
- breakout follow-through and participation checks:
  best improved by lower-timeframe OHLCV plus trade-count or turnover-style activity data
- future `15m` liquidity gate:
  should use more than raw bar OHLCV where possible, especially trade count, turnover, sparse-bar frequency, and session validity

### Lower-impact beneficiaries

- daily swing structure
- baseline MA posture
- adaptive MA selection
- coarse Wyckoff cycle state

These remain usable with the current daily plus raw `1m` and derived `15m` contract.

### Data-priority order

If the data stack is expanded, priority should be:

1. `1m` OHLCV
2. session and auction metadata
3. trade count and turnover
4. corporate-action completeness
5. trade-level or tick data only if the added complexity is justified

## `15m` Liquidity Gate

`15m` timing is not always valid on IDX names.

The backtest contract must define a minimum tradability gate before `15m` is allowed to have tactical authority.

This gate should be implemented in the live TA pipeline before serious replay work starts, so live behavior and backtest behavior do not diverge.

At minimum, evaluate:

- continuity of intraday bars
- minimum recent intraday activity
- whether bars are mostly meaningful candles instead of sparse prints
- whether the symbol is tradable enough for trigger and follow-through interpretation

Fallback rule:

- if `15m` liquidity quality is below threshold, disable `15m` timing authority
- the daily thesis may remain valid, but the action should stay daily-driven or defer to `WAIT`

Implementation priority:

- treat this as a prerequisite for meaningful intraday replay
- do not evaluate `15m`-driven tactics seriously until this gate exists in the live TA scripts
- do not block the daily-only v1 backtest on this requirement

## Two Evaluation Modes

### 1. Full Vibe

This mode is closest to the product thesis.

Characteristics:

- AI remains the primary reasoning engine
- prior thesis and prior decisions matter
- nuanced interpretation is allowed
- some non-determinism is accepted
- output quality and decision quality are both evaluated

Use this mode to answer:

- does the AI add value over a mechanical baseline?
- does the policy behave like a good discretionary analyst?
- does the system remain coherent across updates and changing context?

### 2. Ablation

This mode is the control baseline.

Characteristics:

- remove or heavily constrain the LLM
- use deterministic policy rules only
- keep the same feature pipeline and execution assumptions

Use this mode to answer:

- how much of the result comes from preprocessing and rules alone?
- does the LLM actually improve decisions, or only increase complexity?
- where is the real value-add of AI judgment?
- does the full skill outperform simpler technical baselines, or is the extra doctrine not pulling its weight?

This mode is not the product.
It is the measurement baseline.

## Required Baseline Comparisons

Backtesting should not compare the full skill only against its own ablation mode.

It should also compare the full skill against simpler technical baselines that represent credible lower-complexity alternatives.

At minimum, include:

- buy and hold baseline
- simple MA trend-following baseline
- simple trend plus pullback baseline
- simple breakout plus volume baseline
- simple range-reclaim baseline

Purpose:

- test whether the full skill adds value beyond obvious simpler systems
- identify whether complexity improves decision quality or only explanation quality
- detect cases where doctrine layering makes the system less robust than simpler rules

Implementation rule:

- run these baselines on the same replay windows, execution assumptions, and evaluation metrics as the full skill
- record where the full skill wins, loses, or only ties the simpler baselines
- treat this as a required comparison before claiming that the full skill complexity is justified

## Baseline Strategy Definitions

The following baseline systems are mandatory comparison systems.

They should be implemented with no discretionary rescue logic.

## Baseline Execution Contract

Unless a baseline explicitly says otherwise, use these shared execution rules:

- signal timeframe:
  - daily only
- entry timing:
  - next valid daily open after the signal bar closes
- position policy:
  - one live long position per symbol at a time
- stale expiry:
  - if a pending setup does not trigger within `5` daily bars, expire it
- same-bar ambiguity:
  - if both stop and target are touched in the same bar, use the conservative assumption:
    stop wins
- re-entry:
  - no same-day re-entry after exit
  - require at least one full new daily bar before a fresh entry on the same symbol
- intraday rule:
  - do not use `15m` timing in the first baseline pass
  - `15m` baseline variants may be added later as separate experiments, not mixed into the core baseline definitions

Baseline-variant rule:

- each baseline should represent one exact rule set
- do not bundle multiple trigger styles into one baseline
- if a retest variant is tested later, it should be a separate named variant

### 1. Buy And Hold

Intent:

- provide the broadest market benchmark for long-only performance

Rules:

- thesis condition:
  - symbol passes the chosen universe and tradability filter
- entry condition:
  - buy on the first valid daily open of the test window
- holding rule:
  - stay in the position until the end of the test window
  - or until a mandatory corporate-action or delisting rule forces exit
- invalidation:
  - none as a tactical rule
- target:
  - none as a tactical rule
- use:
  - benchmark total return, drawdown, and opportunity cost versus active trading logic

### 2. Simple MA Trend-Following

Intent:

- provide a classic systematic TA benchmark with minimal interpretation

Rules:

- thesis condition:
  - daily close is above `SMA200`
  - `EMA21` is above `SMA50`
- entry condition:
  - enter on the next valid daily open after the trend condition first becomes true on a daily close
- holding rule:
  - stay in the position while daily close remains above `SMA50`
- exit condition:
  - exit on the next valid daily open after daily close falls below `SMA50`
  - or after daily close falls below `SMA200` for hard regime failure
- target:
  - none; trend capture baseline
- no trade:
  - when the trend condition is not active

### 3. Simple Trend Plus Pullback

Intent:

- participate in intact uptrends through constructive pullbacks

Rules:

- thesis condition:
  - daily trend bias is bullish
  - price is above `SMA200`
  - `EMA21` is above `SMA50` or both are rising
- setup condition:
  - price pulls back toward `EMA21`, `SMA50`, or nearest bullish support zone
  - pullback does not break the most recent valid swing low
- trigger condition:
  - bullish daily reclaim from the pullback zone
  - signal only after the daily bar closes back constructively from the zone
- entry condition:
  - next valid daily open after the reclaim signal
- invalidation:
  - below the active pullback support or below the most recent constructive swing low
- target:
  - nearest resistance zone, then next resistance ladder
- no trade:
  - mid-range location
  - broken daily structure
  - insufficient reward-to-risk
  - pullback setup expired after `5` daily bars without a valid reclaim signal

### 4. Simple Breakout Plus Volume

Intent:

- participate in clean continuation breakouts

Rules:

- thesis condition:
  - daily structure is intact or tightening under resistance
  - breakout level is clearly defined
- setup condition:
  - price closes through resistance
  - breakout bar shows required volume expansion relative to recent baseline
- trigger condition:
  - breakout close only
- entry condition:
  - next valid daily open after the breakout close
- invalidation:
  - back inside the broken level or below the breakout base low
- target:
  - next resistance zone or measured next-zone ladder
- no trade:
  - weak breakout volume
  - no clear next-zone path
  - immediate failed breakout behavior
  - breakout setup expired after `3` daily bars without follow-through

### 5. Simple Range-Reclaim

Intent:

- trade clean range-edge recovery without broader doctrine layering

Rules:

- thesis condition:
  - daily state is balance or range rotation
  - a clear range edge is present
- setup condition:
  - price sweeps or dips through a support edge and reclaims it
  - or price rejects near range support without a full breakdown
- trigger condition:
  - reclaim close from the range edge on the daily bar
- entry condition:
  - next valid daily open after the reclaim signal
- invalidation:
  - below the swept or reclaimed edge
- target:
  - range midpoint first if needed, then opposite range edge
- no trade:
  - entry in the middle of the range
  - weak reclaim
  - unclear range boundaries
  - setup expired after `5` daily bars without a valid reclaim close

## Planned Analysis Mode Inside Technical Analysis

The technical-analysis system uses a single analysis mode.

All runs use the same lean path with the full deterministic pipeline.

## Recommended Testing Sequence

The cleanest sequence is:

1. Build deterministic market-state extraction.
2. Validate that the state packet matches chart reality.
3. Run ablation mode as baseline.
4. Run full-vibe mode on the same windows.
5. Compare both on decision quality and trading outcomes.
6. Only then refine prompts, thresholds, or doctrine.

This prevents prompt changes from hiding weak preprocessing.

## System Boundary

The backtest system should separate four concerns:

1. Market-state extraction
2. Technical policy decision
3. Execution simulation
4. Portfolio constraints

If these are mixed together too early, failures become hard to diagnose.

## Recommended Architecture

### Layer 1. Historical Data Replay

A replay engine iterates candle by candle or bar by bar.

For each evaluation timestamp `t`, it provides only data available up to `t`.

Key requirement:

- no lookahead leakage

Replay granularity is split explicitly:

- `daily replay` for thesis quality, state, location, setup, and main risk map
- `15m replay` for trigger, confirmation, and timing quality once a daily thesis or watch condition exists

V1 replay rule:

- start with daily-only window replay
- select windows from the user's real trades
- support both `flat` and `long` starting states
- compare replay output to the user's actual trade when provided

Required rule:

- do not run `15m` replay as an independent thesis engine
- use it only inside the daily-owned thesis context
- if testing only thesis quality, daily replay alone is sufficient
- if testing timing quality, pair daily replay with `15m` replay inside trigger windows
- if `15m` liquidity quality is below threshold, disable `15m` tactical authority for that symbol-window

V1 script-routing rule:

- the replay engine may call the deterministic TA scripts in a daily-only mode
- that mode should skip intraday loading, resampling, and intraday-state construction
- the control should be an internal script flag and does not need to be exposed in the live skill contract

### Layer 2. Deterministic Market-State Builder

This layer builds a compact representation of the market at time `t`.

It should summarize:

- mode and intent
- daily state and regime
- trend bias
- structure status
- current Wyckoff phase
- Wyckoff phase history as ordered segments with start, end, duration, and confidence
- key support and resistance zones
- baseline MA posture
- optional adaptive MA when justified
- volume-profile context
- liquidity draw map
- breakout state
- setup candidates
- red flags
- prior thesis snapshot when applicable

This layer should be stable, cheap, and reproducible.

The existing technical-analysis scripts already point in this direction.

Artifact direction note:

- retain the daily structure chart built around support, resistance, structure, and MA context
- do not treat Fib-specific daily chart artifacts as part of the future default state packet or baseline evidence set

Wyckoff historical-state note:

- do not store only `current_wyckoff_context`
- store a compact phase timeline so the policy can reason about transition, maturity, and recent phase alternation
- this should support both a machine-readable sequence and a chart artifact with historical phase bands
- use the integrated Wyckoff history contract already carried by the live TA pipeline
- low-confidence fresh phases should be handled as forming context, not as immediate hard regime flips

Moving-average state note:

- the state packet should always carry baseline MA context
- baseline MA should remain lean, for example `21EMA`, `50SMA`, and `200SMA`
- `100SMA` should not be part of the default state packet baseline for now
- adaptive MA should not be a free-form search over many periods during normal runs
- adaptive MA should appear only when the system records a justification that the symbol shows repeated respect to a specific rhythm

Timeframe reconciliation note:

- daily should own thesis direction, setup context, and the main risk map
- `15m` should own trigger quality, follow-through, local acceptance or rejection, and tactical timing
- the state packet should make this separation explicit so the policy engine does not mix lower-timeframe noise into the thesis layer

State-packet schema requirement:

- this layer should eventually be defined as a concrete field-by-field schema
- prose lists are not enough for implementation or repeatable backtests
- `policy-contract.md` should own the runtime schema or point to a dedicated schema appendix

Minimum schema groups should include:

- analysis purpose
- daily thesis state
- optional `15m` timing state
- location and key zones
- setup candidates
- trigger and confirmation state
- risk map
- adaptive MA state when available
- red flags
- prior-thesis snapshot when applicable

### Layer 3. Policy Engine

This is where the AI lives.

The policy engine should receive:

- compact market state
- a small set of available actions
- prior thesis and prior action
- explicit mode
- decision constraints from the doctrine

It should produce:

- action: `BUY`, `HOLD`, `WAIT`, `EXIT`
- selected setup family
- confidence
- invalidators
- concise rationale

In full-vibe mode, the policy engine may use richer reasoning and narrative synthesis.

In ablation mode, the policy engine is replaced by a deterministic ruleset.

For MA handling, the policy engine should treat:

- baseline MA context as always available
- adaptive MA as an optional refinement, not a replacement
- MA context as support for regime and timing, not as a standalone signal source
- `200SMA` as long-term regime context, especially useful when the broader market is weak

The policy engine should also output:

- short rationale

For daily and `15m` conflicts, the policy engine should treat:

- daily as the directional authority
- `15m` as the timing authority
- unresolved timing conflict as a reason to delay or keep `WAIT`, not as a reason to reverse the daily thesis by itself

### Layer 4. Execution Simulator

This layer should be independent from the policy engine.

It should model:

- signal timestamp
- order assumption
- fill assumption
- stop behavior
- target behavior
- time-based expiry
- thesis invalidation handling

This layer answers:

- what happened after the decision?
- how did the plan behave?

Execution assumptions are defined by this document and should not be left implicit.

At minimum enforce:

- entries use next valid bar open
- stop execution uses the next valid executable price after invalidation
- target execution uses first valid executable touch
- gap-through-stop cases are recorded as constrained execution
- stale-setup expiry is explicit
- any ARB / ARA distortion is recorded as execution-path context

### Layer 5. Evaluator

The evaluator should measure both trading and decision quality.

Trading outcomes:

- return
- win rate
- average reward-to-risk realized
- max drawdown
- expectancy

Decision-process outcomes:

- false positive rate
- false negative rate
- average holding time
- number of premature exits
- number of late exits
- action stability across adjacent reviews
- thesis consistency across updates
- divergence versus the user's actual trade outcome when that reference is present

Evaluator baseline requirement:

- metrics alone are not enough
- the system should eventually define baseline bands for what counts as acceptable or failed behavior

Examples:

- minimum acceptable expectancy
- maximum acceptable false-positive rate
- acceptable thesis-consistency band

These baseline bands can be refined later, but they should exist before results are treated as pass or fail.

## Initial Threshold Framework

Use three threshold layers:

- `minimum viable`
- `acceptable`
- `target`

These are planning bands, not final optimized numbers.

### Minimum Viable

Enough to say the system is not obviously broken.

Examples:

- false-positive rate is not persistently extreme
- thesis consistency is stable enough to avoid random flip-flopping
- sample size is large enough before interpreting results

### Acceptable

Good enough to continue iteration with confidence.

Examples:

- expectancy is positive on a meaningful sample
- thesis consistency is solid across different `UPDATE` reasons
- action quality is better than ablation on the intended scenarios

### Target

The aspirational benchmark after refinement.

Examples:

- regime-specific or setup-specific expectancy targets
- better decision quality on difficult cases
- stable action quality across changing market conditions

### Deferred Threshold Work

The following remain deferred until real runs exist:

- exact numeric thresholds by regime
- exact thresholds by setup family
- exact thresholds by market condition
- advanced scenario-specific scorecards

## LLM-Mode Logging Requirement

When backtesting in LLM mode, keep a per-step log that records:

- timestamp or decision point
- selected action
- short rationale

This is needed so decision behavior can be audited rather than hidden inside the final answer.

## Open Design Items Before Backtest Implementation

The following still need implementation detail, but not a new contract decision:

1. concrete state-packet schema
2. daily-only scenario manifest schema
3. exact numeric `15m` liquidity thresholds for later intraday replay
4. exact slippage and constrained-fill heuristics
5. evaluator baseline bands

The following can stay later-stage:

- full Wyckoff segmentation logic
- exact Wyckoff confidence weighting
- advanced threshold tuning by scenario or regime

## Decision Tree For The Backtest Design

### Primary Design Tree

1. What are you testing?
   - technical policy only
   - technical policy plus execution
   - full desk behavior including portfolio management
2. Do you want product-faithful evaluation?
   - yes -> run `full vibe`
   - no, need baseline -> run `ablation`
3. Do you need diagnosis?
   - yes -> isolate technical policy from portfolio logic
   - no -> run integrated workflow
4. Is the goal prompt iteration or strategy iteration?
   - prompt iteration -> keep market-state and execution fixed
   - strategy iteration -> allow playbook and thresholds to change

### Evaluation Scope Tree

1. Is the current question about technical-analysis skill quality?
   - yes -> use fixed execution and no portfolio constraints first
   - no -> continue
2. Is the current question about real portfolio behavior?
   - yes -> include portfolio management skill in a later stage
   - no -> keep PM out of the loop

## Portfolio Management Boundary

### Should Portfolio Management Be Tested Too?

Yes, but not in the first layer of testing.

There are two valid scopes:

### Scope A. Isolated Technical Analysis Test

Use:

- technical-analysis policy
- static execution assumptions
- fixed sizing rules
- no portfolio-level constraints beyond a simple cap

Purpose:

- measure the quality of the technical-analysis doctrine and AI judgment
- avoid contamination from portfolio heat, sizing, rebalancing, and capital allocation rules

Recommendation:

- this should be the default first-stage test

### Scope B. Integrated Desk Test

Use:

- technical-analysis skill
- portfolio-management skill
- execution simulator
- capital and allocation constraints

Purpose:

- measure real operating behavior of the full desk
- see whether good technical calls are improved or harmed by portfolio rules

Recommendation:

- run this after the isolated technical-analysis policy has been validated

### Why This Separation Matters

A weak result in an integrated test can come from very different causes:

- good technical call, bad portfolio sizing
- good technical setup, poor add/reduce policy
- good technical entry, portfolio forced a skip
- poor technical decision from the start

If you test everything at once, diagnosis becomes weak.

## Static Execution vs Portfolio-Aware Execution

For technical-analysis-first evaluation, use a static predefined execution system.

That execution system should define:

- how entries are triggered
- how stops are enforced
- how targets are handled
- how stale setups expire
- what happens on gap-through-stop cases

This keeps the focus on technical policy quality.

Later, portfolio-management can be layered on top.

## Cross-Skill Alignment With Flow Analysis

The future backtest stack should align `technical-analysis` and `flow-analysis` under one shared evaluation ladder.

Use these layers:

### Layer A. Skill-Only Validation

Test each skill on its own first.

- `technical-analysis`: deterministic state extraction -> `ablation` -> `full vibe`
- `flow-analysis`: deterministic flow-state extraction -> `rules baseline` -> `full vibe`

Purpose:

- validate each skill independently
- avoid hiding weak technical logic behind flow confirmation
- avoid hiding weak flow logic behind chart structure

### Layer B. Pairwise Integration Validation

After both skills are stable independently, test:

- `technical-analysis` + `flow-analysis`

This layer should evaluate:

- agreement cases
- disagreement cases
- early-warning cases
- early-turn cases
- whether combined reasoning improves quality over either skill alone

### Layer C. Parent Synthesis Validation

After pairwise integration is stable, test the parent synthesis contract.

This layer should evaluate:

- whether the parent keeps the two skills separate before synthesis
- whether the parent classifies confirmation versus cautionary overlays correctly
- whether the parent handles unresolved disagreement with enough discipline
- whether the parent improves action quality, confidence use, and `WAIT` behavior

### Layer D. Full Desk Validation

Only after the earlier layers are stable, add:

- `portfolio-management`
- later, broader multi-lens workflows

This keeps diagnosis possible.

### Shared Combined-Test Outputs

When technical and flow are tested together, the combined test log should record at least:

- analysis order
- technical verdict or action
- technical confidence
- flow verdict
- flow conviction
- agreement state: `aligned` / `divergent` / `mixed`
- lead lens: `technical` / `flow` / `unclear`
- parent synthesis conclusion
- final action emphasis

This shared contract should be consistent across pairwise and parent-level tests.

Recommended combined-test order:

- `technical-analysis -> flow-analysis -> parent synthesis`

If a run intentionally studies alternate ordering, record that alternate order explicitly in the log.

Recommended default:

- stage 1: static execution, fixed risk unit, technical policy only
- stage 2: portfolio-aware execution, integrated desk test

## What The LLM Should And Should Not Do

### LLM Responsibilities In Full Vibe

The LLM should handle:

- conflict resolution between signals
- nuanced setup selection
- confidence calibration
- thesis updates across time
- synthesis of state, location, trigger, and risk
- deciding between `WAIT` and action in borderline cases

### What Should Stay Deterministic

The deterministic layer should handle:

- feature extraction
- swing detection
- zone clustering
- MA posture
- profile levels
- breakout snapshots
- structure-event extraction
- red-flag generation
- trade-path scaffolding

This preserves nuance while reducing token waste.

## Prompt Contract For Full Vibe

The full-vibe policy should reason over a constrained contract, not over the full raw skill tree every turn.

Assumed refactored skill shape for runtime:

- `workflow-spine.md` owns lifecycle and phase sequencing
- `execution-and-risk-protocol.md` also owns level-to-level execution logic

Recommended prompt inputs:

- mode
- compact market-state packet
- prior thesis snapshot
- doctrine summary for the active workflow
- allowed setup families
- allowed actions
- mandatory output fields

When Wyckoff is included in the state packet, prefer:

- current phase
- prior 3 to 8 phase segments
- segment confidence
- segment duration
- whether the current phase is fresh, maturing, or degrading

When MA context is included in the state packet, prefer:

- baseline `21EMA`, `50SMA`, and `200SMA` posture
- whether they are acting as support, resistance, or noise
- optional adaptive MA period only if justified
- short reason why the adaptive MA is included for this symbol

Recommended output contract:

- selected action
- setup family or `NO_VALID_SETUP`
- confidence
- invalidators
- key evidence refs
- short plain-language rationale

This keeps the LLM expressive but bounded.

## How To Understand The Knowledge In The Skill

For human understanding, the current technical-analysis doctrine can be grouped into five knowledge buckets:

### 1. Context Model

What state is the market in?

- trend
- range
- reversal
- value acceptance
- Wyckoff phase and phase history
- baseline MA posture and optional symbol-specific MA rhythm

### 2. Location Model

Where is price relative to decision zones?

- support and resistance
- profile levels
- liquidity pools
- MA support or resistance
- time and round-number context

### 3. Trigger Model

What event makes the idea actionable?

- breakout close
- follow-through
- reclaim
- sweep rejection
- `CHOCH`
- confirmation `BOS`

### 4. Risk Model

Where is the thesis wrong and what is the path?

- invalidation
- stop
- next zone
- target ladder
- reward-to-risk

### 5. Refinement Model

How is the plan improved once the core thesis already exists?

- adaptive MA when symbol-specific rhythm matters
- local acceptance or rejection behavior on `15m`

This is the cleanest human-readable model of the knowledge base.

## Should The Skill Structure Be Refactored?

### Short Answer

Yes, but only to improve policy clarity and retrieval quality for the AI.

It does not need to be rewritten to read like a human manual.

### What Should Change

The skill should have a clearer separation between:

- workflow spine
- doctrine modules
- deterministic tool contracts
- report/output template
- backtest policy contract

### What Should Not Change

Do not optimize the skill primarily for human reading at the expense of AI use.

The consumer is still the AI.

So the refactor should improve:

- retrieval efficiency
- lower prompt duplication
- clearer execution order
- clearer ownership of each concept

### Recommended Refactor Shape

Keep:

- one AI-first entrypoint
- modular references
- deterministic scripts

Add or clarify:

- one explicit workflow-spine reference
- one policy-contract reference for backtesting
- one small doctrine map that points to the right modules by phase

This preserves the AI-oriented structure while making the system easier to test and reason about.

## Recommended Implementation Phasing

### Phase 1. Clarify The Contracts

Define:

- compact market-state packet
- daily-only scenario-window manifest
- full-vibe policy contract
- ablation policy contract
- static execution assumptions

### Phase 2. Validate Technical Policy In Isolation

Run:

- daily-only replay windows selected from real user trades
- deterministic state extraction
- static execution
- ablation baseline
- full-vibe policy

### Phase 3. Add Integrated Portfolio Tests

Run:

- full-vibe technical policy
- portfolio-management policy
- portfolio-level risk and allocation constraints

### Phase 4. Compare Modes

Compare:

- ablation vs full vibe
- isolated TA vs integrated desk
- per-setup-family results
- per-regime results

## Final Recommendation

If the immediate goal is to evaluate the technical-analysis skill, do not start with portfolio management in the loop.

Start with:

- daily-only replay windows anchored to the user's real trades
- deterministic market-state extraction
- static execution system
- ablation baseline
- full-vibe AI policy

Then add portfolio management as a second-stage integrated evaluation.

That gives you:

- a fair test of the AI technical doctrine
- a baseline for whether the AI adds value
- a clean path toward full desk testing later
