# Human Technical Analyst Workflow

## Purpose

This document translates the technical-analysis doctrine into a human analyst workflow.

This is a future-state workflow note for the planned refactor.
It describes the intended target method, not a claim that the current live skill has already been fully updated to match it.

The goal is not to replace the AI-oriented skill entrypoint. The goal is to make the underlying method understandable, testable, and reviewable by a human.

The doctrine in this skill is built around a chart-first, structure-first process:

- state first
- then location
- then trigger
- then risk
- then action

This is the actual backbone behind the topic references.

Planned runtime interpretation:

- `DEFAULT` mode for the normal lean path
- `ESCALATED` mode when the chart requires additional overlays or diagnostics

## Core Mental Model

A real technical analyst usually does not begin with indicators or setup labels.

A real workflow is closer to:

1. What is my job right now?
2. What state is this market in?
3. Where is price relative to key decision zones?
4. Is there a valid setup family here?
5. Has the setup actually triggered?
6. Where am I wrong?
7. Where is the next path or target?
8. If any of those are unclear, do nothing.

The doctrine in this skill supports that model:

- state and regime -> `market-structure-and-trend.md`
- location and decision zones -> `levels.md`, `volume-profile-and-volume-flow.md`, `liquidity-draw-and-sweep.md`
- setup family and trigger logic -> `setups-and-breakouts.md`
- risk and action -> `execution-and-risk-protocol.md`, including level-to-level execution logic in the future state

## Human Workflow By Phase

### 1. Define The Analysis Job

Before reading the chart, define the mode:

- `INITIAL`: first thesis build
- `UPDATE`: refresh or challenge an existing thesis
- `POSTMORTEM`: review after invalidation or exit

Human question:

- Am I trying to find a new entry, manage or re-check an existing thesis, or learn from a failed trade?

This matters because the analyst will look for different evidence depending on the job.

Within `UPDATE`, the analyst should still record:

- `thesis_status`: `intact`, `improving`, `degrading`, or `invalidated`
- `review_reason`: `routine`, `contradiction`, `level_break`, `regime_change`, or `trigger_failure`

### 2. Start With Daily State And Regime

The first chart question is not "is there a buy signal?"

The first chart question is:

- Is this stock trending, ranging, or transitioning?

The analyst classifies:

- `state`: `balance` or `imbalance`
- `regime`: `trend_continuation`, `range_rotation`, `potential_reversal`, `no_trade`
- `trend_bias`: `bullish`, `bearish`, `neutral`
- `wyckoff_context`: `accumulation`, `markup`, `distribution`, `markdown`, `unclear`
- `wyckoff_history`: not only the current phase, but the recent sequence of phase segments across time

Human observations at this step:

- last confirmed higher high / higher low or lower high / lower low
- whether price is accepted inside value or repricing outside value
- whether a recent break is close-confirmed or only wick-based
- whether this is clean trend behavior, edge rotation, or transition
- how the current phase emerged from prior phases, for example `accumulation -> markup -> distribution -> markdown`

This phase narrows the playbook before any tactical detail is considered.

Historical Wyckoff note:

- do not reduce Wyckoff to a single current-state label
- keep a phase timeline so the analyst can see transitions, duration, confidence, and whether the current state is fresh, mature, or failing
- the ideal artifact is a chart with historical phase bands plus a phase table showing period, duration, price range, price change, trend character, and confidence
- treat low-confidence fresh phases as forming context, not fully confirmed regime shifts
- treat Wyckoff as a slower context clock than trigger and confirmation logic

Practical confidence note:

- below roughly `60`, the phase should usually be treated as still forming
- around `60+`, it becomes more usable as context
- above roughly `75`, it is strong enough to matter materially

### 3. Map Only The Important Levels

After state is known, the analyst marks a small number of decision zones.

Primary mapping order:

1. Daily horizontal support and resistance zones
2. Obvious structural swing highs and lows
3. Value-area references such as `POC`, `VAH`, `VAL`, major `HVN`, major `LVN`
4. Lean baseline MA context such as `21EMA`, `50SMA`, and `200SMA`
5. Time-based opens and round-number levels when materially relevant

Human rule:

- map first
- do not trade while mapping

The analyst is trying to answer:

- Where would a reaction be meaningful?
- Where would a break actually matter?
- Where is price just in the middle of nowhere?

Moving-average note:

- static MA context and adaptive MA context solve different jobs
- static MA is for baseline regime and cross-symbol comparability
- adaptive MA is for symbol-specific rhythm and tactical refinement
- adaptive MA should not be used by default just because it can fit the chart better

### 4. Assess Current Location

Once zones are drawn, the next question is:

- Where is price sitting right now relative to those zones?

Typical location categories:

- near support in bullish structure
- near resistance in bearish structure
- at range edge
- accepted above resistance
- accepted below support
- reclaiming a broken level
- sweeping liquidity and snapping back
- trapped in mid-range noise

This is one of the most important human filters.

If price is mid-range and no zone is active, many good analysts immediately downgrade to `WAIT`.

### 5. Choose The Setup Family

The analyst does not begin with advanced concepts.

The analyst first chooses one broad setup family:

- `S1` breakout and retest continuation
- `S2` pullback to demand in intact uptrend
- `S3` sweep and reclaim reversal
- `S4` range edge rotation
- `S5` Wyckoff spring with reclaim
- `NO_VALID_SETUP`

Setup selection is driven by:

- regime
- location
- structure status
- liquidity behavior
- participation quality

Human simplification:

- trend + pullback = continuation candidate
- range edge + rejection = rotation candidate
- trend failure + confirmed structure shift = reversal candidate
- middle of range or conflicting evidence = no valid setup

### 6. Demand The Right Trigger For That Setup

A human analyst separates setup context from trigger.

Examples:

- breakout setup requires close beyond level, volume support, and follow-through
- pullback setup requires support hold, constructive reaction, and intact trend structure
- reversal setup requires `CHOCH`, then pullback behavior, then confirmation `BOS`
- sweep setup requires take of liquidity and clear reclaim or rejection

This prevents premature action.

Human rule:

- a good-looking area is not enough
- a setup without a trigger is still only a watchlist candidate

Timeframe handoff note:

- daily still owns the thesis
- `60m` enters here to judge reclaim quality, acceptance, follow-through, and tactical timing
- `60m` should refine timing, not invent a trade against the daily thesis by itself

### 7. Use Participation And Auction Evidence As Confirmation

Once a candidate exists, the analyst asks:

- Does volume support this?
- Does value-area behavior support this?
- Are we seeing acceptance, rejection, or weak participation?
- Is this move sponsored or thin?

Relevant evidence:

- breakout volume ratio
- repeated distribution days
- price-volume classification
- value-area acceptance above `VAH`, below `VAL`, or inside value
- `HVN` acceptance vs `LVN` fast-travel logic

This is a confirmation or veto layer, not the origin of the idea.

Timeframe authority note:

- daily keeps directional authority
- `60m` may confirm, delay, downgrade, or leave the analyst in `WAIT`
- if daily and `60m` conflict and the timing issue remains unresolved, the analyst should lean toward `WAIT`

### 8. Use Liquidity Logic To Frame Path

The analyst then asks:

- What liquidity is price likely to take next?
- What is the current draw?
- What is the opposing draw?
- Was a recent sweep accepted or rejected?

This step helps answer:

- is there a clear path to the next zone?
- is this a trap?
- is price rotating internally or moving toward external liquidity?

Without a clear next path, action quality drops.

### 9. Build The Trade From Invalidation Backward

Before taking action, the analyst defines:

- entry zone
- invalidation level
- stop basis
- next-zone target
- target ladder
- expected reward-to-risk

Human rule:

- no invalidation, no trade
- no next-zone path, no trade
- poor RR, usually no trade

This is where many marginal ideas should be rejected.

### 10. Use Advanced Confluence Only After The Core Thesis Exists

Only after the core plan exists should the analyst use:

- `FVG`
- `IFVG`
- `OB`
- `Breaker`
- premium/discount

These tools refine entry or improve confidence.

They do not create a trade by themselves.

Divergence should not be treated as a standard always-on step.

It is better treated as a conditional warning diagnostic for:

- extended moves
- reversal review
- thesis degradation
- postmortem

In the planned runtime model, this means:

- stay in `DEFAULT` unless the normal read is sufficient
- move to `ESCALATED` only when extra interpretation is actually needed

Wyckoff should remain in the core contextual layer, but it should be read historically rather than as a one-line snapshot.

Examples of useful historical readings:

- repeated short `accumulation` and `distribution` segments inside a range
- `markup` becoming weaker after a mature run
- `distribution` appearing after extended `markup`
- `markdown` interrupting what looked like continuation

### Moving Average Consolidation

The doctrine should treat moving averages in two layers:

### 1. Static MA As Baseline Context

Static MA is useful for:

- broad regime reading
- cross-symbol consistency
- simple dynamic support or resistance context
- update and watchlist review

Recommended default interpretation:

- `21EMA` for fast trend posture
- `50SMA` for medium support and structure context
- `200SMA` for long-term regime context and major trend damage reference

These should answer:

- is price in healthy bullish posture?
- is the medium trend intact or damaged?
- is price still above the main support context or already failing?

### 2. Adaptive MA As Optional Overlay

Adaptive MA is useful for:

- single-symbol deep review
- names with clear repeated respect to a nonstandard MA
- tactical timing and pullback refinement

Adaptive MA should be used only when:

- the stock shows measurable repeated respect
- the setup depends on that rhythm
- the adaptive MA adds something the baseline `21EMA`, `50SMA`, and `200SMA` do not

Adaptive MA should not replace baseline structure context.

It should only refine it.

### Human Rule

The analyst should not ask:

- which MA can explain this move after the fact?

The analyst should ask:

- is the baseline MA context enough?
- if not, is there clear evidence this symbol respects a specific MA rhythm?

### Recommended Default

For now, the lean default should be:

- baseline MA context only
- `21EMA` + `50SMA` + `200SMA`
- no `100SMA` in the default baseline for now
- no MA crossover logic as a standalone trigger
- no broad MA stack beyond the lean baseline in standard workflow

If an adaptive MA is used, it should be explicitly justified as a symbol-specific overlay.

### Divergence Handling

The doctrine should distinguish between:

- conditional diagnostics
- optional deep overlays

### Divergence

Divergence should be:

- not mandatory
- not part of the baseline flow
- used only when momentum exhaustion, reversal suspicion, or thesis degradation makes it relevant

Its role is:

- warning
- confirmation support
- postmortem insight

It should not be a primary trade-originating concept.

### 11. End With One Of Three Outcomes

A disciplined human analyst usually ends with:

- actionable setup
- watchlist setup with explicit trigger
- `WAIT`

The last outcome is normal.

The workflow is designed to make `WAIT` acceptable and common.

### 12. Define Monitoring And Next Review Conditions

After the action is chosen, the analyst should still define:

- what confirms the thesis
- what invalidates the thesis
- what should trigger the next review
- when a watchlist setup becomes stale

This keeps the workflow aligned with the canonical `MONITORING` phase instead of ending at action alone.

## Decision Tree

### Primary Tree

1. What is the mode?
   - `INITIAL`
   - `UPDATE`
   - `POSTMORTEM`
2. What is the daily state?
   - `trend_continuation`
   - `range_rotation`
   - `potential_reversal`
   - `no_trade`
3. Is price at a meaningful decision zone?
   - yes -> continue
   - no -> `WAIT`
4. Which setup family matches the context?
   - `S1`
   - `S2`
   - `S3`
   - `S4`
   - `S5`
   - `NO_VALID_SETUP`
5. Has the required trigger occurred?
   - yes -> continue
   - no -> watchlist or `WAIT`
6. Does participation support the setup?
   - yes -> continue
   - mixed -> lower confidence or `WAIT`
   - no -> reject
7. Is there a valid level-to-level path?
   - yes -> continue
   - no -> reject
8. Is invalidation clear and RR acceptable?
   - yes -> action allowed
   - no -> reject

### Trend Continuation Branch

1. Daily regime is trending.
2. Price is either:
   - breaking through resistance with acceptance, or
   - pulling back into support in intact trend
3. If breakout:
   - close beyond level?
   - follow-through?
   - volume expansion?
   - no fast failure?
4. If pullback:
   - trend still intact?
   - support or demand zone respected?
   - selling pressure acceptable?
5. If valid:
   - map invalidation below structure
   - target next zone
   - compute RR

### Range Rotation Branch

1. Daily state is balance.
2. Price is near range edge?
   - yes -> continue
   - no -> `WAIT`
3. Rejection or acceptance behavior visible?
4. If rotating:
   - trade edge to edge
   - avoid middle
5. Invalidation belongs beyond the edge being traded.

### Reversal Branch

1. There is a prior trend to reverse.
2. First opposite break appears as `CHOCH`.
3. Pullback forms in the new direction.
4. Confirmation `BOS` appears.
5. Optional confluence may refine entry.
6. If `CHOCH` exists without confirmation `BOS`, do not call a confirmed reversal.

## What The Analyst Looks For First

In practice, a disciplined analyst often checks in this order:

1. daily structure
2. most obvious support and resistance
3. whether price is near a meaningful zone
4. whether this is trend, range, or transition
5. whether there is a valid setup family
6. whether volume and value behavior support it
7. where the trade is invalid
8. where the next zone is

That order matters more than any single indicator.

## What Is Secondary

These are secondary tools:

- `FVG`
- `IFVG`
- `OB`
- `Breaker`
- premium/discount
- extra overlay checks

They help after the primary chart map is already coherent.

## Implication For Skill Design

The current skill already contains this doctrine, but it is spread across topic references.

For human understanding, the structure should be read as:

- one workflow spine
- many doctrine modules attached to that spine

The workflow spine is:

- state
- location
- setup
- trigger
- confirmation
- risk
- action

That is the closest human-readable form of the knowledge contained in the technical-analysis skill.

Wyckoff historical-state requirement should sit inside the `state` layer, not as a separate downstream overlay.
