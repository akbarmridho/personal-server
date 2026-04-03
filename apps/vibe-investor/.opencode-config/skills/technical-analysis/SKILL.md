---
name: technical-analysis
description: Technical-analysis helper for IDX stocks used to refine entry, exit, timing, and risk inside a broader investment process, with deterministic preprocessing and bounded decision output.
---

## Scope

Use this skill to perform technical analysis for:

- entry timing
- exit timing
- invalidation
- trade path and risk map

Time horizon: swing, medium-term position, long-term position.

Use:

- `daily[]` for thesis direction and main risk map
- raw `intraday_1m[]` as the intraday source
- internally derived `15m` bars for trigger, confirmation, and tactical timing
- optional `corp_actions[]` when available

## Required Data And Fail-Fast

Use `fetch-ohlcv` as the only chart-data source.

Required arrays: `daily[]`, `intraday_1m[]`. Optional: `corp_actions[]`.

Expected price fields: `timestamp`, `datetime`, `date`, `open`, `high`, `low`, `close`, `volume`, `value`.

If any required array is missing or empty, stop analysis and report dependency failure. If `fetch-ohlcv` fails, stop analysis.

Intraday handling: treat `intraday_1m[]` as raw source contract; derive `15m` internally inside TA scripts.

Price-adjustment contract: prices are split-style adjusted, not dividend-adjusted.

## Deterministic Runtime Steps

The deterministic layer is mandatory.

1. fetch and validate OHLCV
2. build `ta_context`
3. generate chart artifacts
4. read chart artifacts before final synthesis
5. cross-check chart observations against deterministic evidence

Do not skip chart generation. Do not skip chart reading.

### Context Build

```bash
python3 scripts/build_ta_context.py \
  --input {FETCH_OHLCV_OUTPUT_PATH} \
  --symbol {SYMBOL} \
  --outdir work \
  --modules core,vpvr,breakout
```

`--input` must use the exact JSON returned by `fetch-ohlcv`. Output: deterministic `ta_context` JSON. If the active workflow specifies a retained artifact directory, write outputs there instead of `work/`.

### Chart Build

```bash
python3 scripts/generate_ta_charts.py \
  --input {FETCH_OHLCV_OUTPUT_PATH} \
  --symbol {SYMBOL} \
  --outdir work \
  --modules core,vpvr \
  --ma-mode {DAILY_MA_MODE}
```

Daily chart MA mode:

- `hybrid` (default) → `EMA21` + `SMA50` + `SMA200` plus highlighted chosen `SMA{n}`
- `baseline` → `EMA21` + `SMA50` + `SMA200`

Default to `hybrid`. Use `baseline` only when a lean static read is preferred. Read the chart evidence manifest for the selected MA mode, adaptive period, and respect details.

Default chart set: `daily_structure`, `intraday_structure`, `structure_events`, `wyckoff_history`, optional `vpvr_profile`. Use artifact paths from the chart evidence manifest; do not hardcode chart names.

## Core Runtime Rules

- treat `daily` as thesis authority
- treat `15m` as timing authority
- use one setup family or `NO_VALID_SETUP`
- produce one final `technical_assessment` with a 0-100 `conviction_score`, score drivers, risk map, key levels, and monitoring triggers
- default to a lower conviction score under unresolved contradiction
- keep baseline MA context lean
- treat hybrid charting as default visual context, not as automatic decision weight

## Execution Defaults

- parse JSON directly
- when invoked by a parent workflow, use the mode and output paths provided by that workflow
- for `UPDATE` and `POSTMORTEM`, require prior thesis context
- after the technical answer, add one short plain-language wrap-up with bias, key level, and what would raise or lower conviction next
- for a constructive setup score, always include invalidation and stop-loss
- when evidence is mixed, lower `conviction_score` and state the unresolved contradiction

## Workflow Spine

Runtime workflow owner. Defines canonical analysis order, phase gates, stop rules, and daily/15m reconciliation.

### Purpose Mode

- `INITIAL` — fresh thesis
- `UPDATE` — refresh active thesis (requires prior thesis context)
- `POSTMORTEM` — review failed/exited thesis (requires prior thesis context)

If required prior thesis context is missing, stop and report missing dependency.

#### `UPDATE` Requirements

Must produce: `thesis_status`, `review_reason`, and explicit delta assessment covering structure, levels, volume/participation, setup quality, and risk.

If prior symbol context contains `active_recommendation.action = WAIT` with a `retest_level`, check whether price visited that level since the prior review before repeating the same setup:

- `tested_held`: price reached the retest zone and showed acceptance or defense; state this explicitly and evaluate whether it satisfies `upgrade_trigger`
- `tested_failed`: price reached the retest zone and broke it; state this explicitly and downgrade the setup or update invalidation
- `not_tested`: price did not reach the retest zone; state this explicitly and, on the 3rd+ consecutive unchecked session, assess whether the setup is stale or the entry zone needs adjustment

Use `daily[]` and `intraday_1m[]` for this check. A repeated retest-based `WAIT` must state one of `tested_held`, `tested_failed`, or `not_tested`.

#### `POSTMORTEM` Requirements

Must produce: failure point, missed/absent warning, invalidation path, rule/handling improvement.

### Canonical Phase Order

`MODE` → `STATE` → `LOCATION` → `SETUP` → `TRIGGER` → `CONFIRMATION` → `RISK` → `ASSESSMENT` → `MONITORING`

Chart-first, structure-first. Determine the job → classify daily state → map zones → choose setup or none → demand trigger → confirm → build risk from invalidation backward → score the setup and risk map → define what happens next.

### Phase Contracts

#### 1. MODE

What job is being done? Outputs: `purpose_mode`, `position_state`, `intent`. If prior context required and missing, stop.

#### 2. STATE

What is the daily market state and regime? Requires: daily structure read, value acceptance/repricing state, Wyckoff cycle + recent sequence, baseline MA posture.

Stop: if state cannot be classified beyond `unclear`, assign a low conviction score. If `no_trade`, cap conviction at the broken/no-setup range unless `POSTMORTEM`.

#### 3. LOCATION

Where is price relative to meaningful decision zones? Requires: at least one meaningful nearby zone, current/opposing draw, value-area acceptance state.

Stop: if mid-range noise with no meaningful zone active, score the setup in the mixed/no-setup range. If no clear next path exists, cap conviction and state why.

#### 4. SETUP

What setup family matches state and location? Select one of `S1`–`S5` or `NO_VALID_SETUP`.

Stop: if no setup fits cleanly, emit `NO_VALID_SETUP` with a low conviction score. Do not carry multiple final setups into later phases.

#### 5. TRIGGER

Has the setup actually triggered? `15m` owns trigger quality inside daily thesis. Requires: trigger event tied to selected setup, local acceptance/reclaim/follow-through read.

Stop: if trigger is absent, keep the score in the setup-forming or lower range. Do not score an untriggered setup as confirmed.

#### 6. CONFIRMATION

Does evidence support the trigger strongly enough? Requires: follow-through, participation read, contradiction check between chart and numeric evidence.

Chart modes: `hybrid` (default) = `21EMA` + `50SMA` + `200SMA` + chosen `SMA{n}`; `baseline` = `21EMA` + `50SMA` + `200SMA`.

Stop: if confirmation is mixed and contradiction affects action quality, lower `conviction_score` and state the contradiction. If trigger fails immediately, score the setup in the failed/broken range depending on position state.

#### 7. RISK

Where is the thesis wrong and what is the level-to-level path? Requires: explicit invalidation, explicit next-zone path, RR at or above threshold.

Stop: if invalidation is unclear, no next-zone path exists, or RR is below threshold, cap conviction and state the exact blocker.

#### 8. ASSESSMENT

One final `technical_assessment` object with `conviction_score`, confidence, bull/bear factors, risk map, red flags, key levels, and monitoring triggers. Use the Conviction Scoring Contract section. Unresolved contradiction lowers `conviction_score`.

#### 9. MONITORING

What confirms, invalidates, or refreshes this thesis next? Every run ends with explicit monitoring conditions.

When the chart has more than one plausible forward path that materially changes execution, include a small optional scenario map in the final report instead of forcing a single-path narrative too early.

### Daily And 15m Authority

Daily owns: STATE, LOCATION, SETUP, main risk map. Daily has final authority on thesis direction.

`15m` owns: TRIGGER, CONFIRMATION, tactical timing, local acceptance/rejection, follow-through quality. `15m` can downgrade timing quality and cap `conviction_score`. `15m` cannot create a trade against daily thesis by itself.

### Workflow Trace

Final response must trace phases used: MODE, STATE, LOCATION, SETUP, TRIGGER, CONFIRMATION, RISK, ASSESSMENT, MONITORING.

Non-initial additions: Previous Thesis Snapshot (UPDATE/POSTMORTEM), Thesis Status + reason (UPDATE), Delta Log (UPDATE), failure + handling notes (POSTMORTEM).

## Conviction Scoring Contract

Runtime technical assessment contract. The parent workflow decides the final trade action.

### Output Shape

```yaml
technical_assessment:
  conviction_score: 62
  confidence: MEDIUM
  bull_factors: []
  bear_factors: []
  risk_map:
    invalidation: 10200
    target_1: 11500
    rr: 2.1
  red_flags: []
  key_levels: []
  monitoring_triggers: []
```

### Setup Space

- `S1` breakout and retest continuation
- `S2` pullback to demand in intact uptrend
- `S3` sweep and reclaim reversal
- `S4` range edge rotation
- `S5` Wyckoff spring with reclaim
- `NO_VALID_SETUP`

### Required Runtime Inputs

- one `ta_context` packet matching the schema below
- current position state
- prior thesis snapshot for `UPDATE` and `POSTMORTEM`

If a required input is missing, stop and report missing dependency.

### Score Rubric

| Score | Meaning |
|-------|---------|
| 0-15 | Structure broken, thesis invalidated |
| 16-30 | Damaged, no setup, poor location |
| 31-45 | Mixed, developing, mid-range noise |
| 46-60 | Setup forming, location decent, trigger developing |
| 61-75 | Setup valid, trigger active or near, confirmation partial |
| 76-90 | Clean setup, trigger confirmed, good RR |
| 91-100 | Textbook setup, strong confirmation, excellent RR |

### Scoring Rules

- Score the chart and risk setup directly in `technical_assessment`.
- `conviction_score` must reflect both structural quality and execution readiness.
- Use `bull_factors` and `bear_factors` to explain the score in short, evidence-backed bullets.
- Include `risk_map.invalidation`, `risk_map.target_1`, and `risk_map.rr` whenever a constructive setup exists.
- Include `key_levels` as the compact decision-zone map the parent workflow can consume.
- Use `confidence` (`HIGH`, `MEDIUM`, `LOW`) to express evidence quality and contradiction level separately from the numeric score.
- When the prior symbol plan carries a live `WAIT`, include `upgrade_trigger`, `downgrade_trigger`, `decision_horizon`, and `expiry_action` in `monitoring_triggers`/follow-up text so the parent workflow can refresh `active_recommendation`.

### Validation Gates

#### Hard Gates

1. `G1_MODE` purpose mode is explicit
2. `G2_DATA` required data is present and usable
3. `G3_STATE` daily state and regime are classifiable enough to proceed
4. `G4_LOCATION` price is at a meaningful area or conviction is capped for weak location
5. `G5_SETUP` exactly one setup family or `NO_VALID_SETUP`
6. `G6_TRIGGER` high conviction requires a real trigger
7. `G7_INVALIDATION` constructive scores require explicit invalidation
8. `G8_PATH` constructive scores require a clear next-zone path
9. `G9_RR` constructive scores require acceptable reward-to-risk
10. `G10_CONFLICTS` chart and numeric contradictions are resolved explicitly
11. `G11_CONVICTION` unresolved decision-critical ambiguity lowers `conviction_score`

#### Conditional Gates

- `C1_PRIOR_CONTEXT` `UPDATE` and `POSTMORTEM` include prior thesis context
- `C2_DELTA` `UPDATE` includes thesis status, review reason, and delta log
- `C3_POSTMORTEM` `POSTMORTEM` includes failure point and handling improvement
- `C4_BREAKOUT` breakout setups include breakout quality and follow-through
- `C5_VOLUME_PROFILE` VPVR usage includes POC, VAH, VAL, and acceptance state
- `C6_ADAPTIVE_MA` adaptive MA reporting includes period, justification, and chart mode

#### Advisory

- Lower `conviction_score` instead of forcing a low-quality setup narrative
- Downgrade confidence when `15m` timing conflicts with daily thesis
- Treat mid-range noise as weak location
- Treat weak follow-through as veto or delay, not proof
- Treat daily candles that finish near IDX auto-rejection limits, or that nearly hit those limits intrabar without finishing there, as mechanically distorted context rather than clean structural proof

### Red Flags

#### Core

`F1_STRUCTURE_BREAK` | `F2_DISTRIBUTION` | `F3_WEAK_BREAKOUT` | `F4_LEVEL_EXHAUSTION` | `F5_MARKET_CONTEXT_MISMATCH` | `F6_MA_BREAKDOWN` | `F7_POSITION_RISK` | `F8_NO_NEARBY_SUPPORT` | `F9_UNCONFIRMED_STRUCTURE_SHIFT` | `F10_NO_NEXT_ZONE_PATH` | `F11_LIQUIDITY_MAP_MISSING` | `F12_BREAKOUT_STALLING`

#### Conditional

`F13_VOLUME_CONFLUENCE_WEAK` | `F14_BREAKOUT_FILTER_WEAK` | `F15_MA_WHIPSAW` | `F16_PRICE_LIMIT_PROXIMITY` | `F17_LIQUIDITY_WEAK`

#### Severity: `low` | `medium` | `high` | `critical`

Severity guidance:

- `F6_MA_BREAKDOWN`: `medium` when price loses `21EMA` only; `high` when price loses `50SMA` or is below both
- `F3_WEAK_BREAKOUT`: treat more severely when continuation structure is no longer intact
- `F16_PRICE_LIMIT_PROXIMITY`: use for either `close_near_*` or `intrabar_*_near_*` limit behavior; `medium` by default, escalate to `high` when the day finished near the limit and that bar is core to the breakout or downside-stress interpretation
- `F17_LIQUIDITY_WEAK`: use 20-day average daily value buckets; `medium` for `low` liquidity (`Rp1B–10B`), `high` for `very_low` liquidity (`< Rp1B`); only the `high` tier should hard-block entries in deterministic policy

Every red flag must include `flag_id`, `severity`, `why`. Include an overall risk summary with one short rationale.

### Minimum Final Assessment Output

Required: `purpose_mode`, `technical_assessment.conviction_score`, `technical_assessment.confidence`, `bias`, `setup_family`, `key_active_level`, `trigger_status`, `invalidation`, `next_trigger`, `technical_assessment.bull_factors`, `technical_assessment.bear_factors`, `technical_assessment.risk_map`, `technical_assessment.red_flags`, `technical_assessment.key_levels`, `technical_assessment.monitoring_triggers`, `chart_artifact_refs`.

Required when a constructive setup exists: `technical_assessment.risk_map.rr`.

Required when long (`UPDATE`): `current_rr`.

Conditional: prior thesis delta for `UPDATE`, postmortem findings for `POSTMORTEM`, recommendation lifecycle fields in follow-up text when the parent workflow needs `active_recommendation`.

## Market Structure And Trend

Classify market state before setup selection using balance-imbalance logic, then map context with Wyckoff and swing structure.

### State And Regime Rules

- `R-STATE-01` Start with state: `balance` (accepted in value area) or `imbalance` (directional repricing).
- `R-STATE-02` Default assumption: price remains in current value area until close-based acceptance proves otherwise.
- `R-STATE-03` Breakout acceptance requires close outside range plus follow-through.
- `R-STATE-04` Failed acceptance (quick close back in range) is trap evidence, not trend confirmation.
- `R-REGIME-01` Uptrend: higher highs and higher lows on daily swings.
- `R-REGIME-02` Downtrend: lower highs and lower lows on daily swings.
- `R-REGIME-03` Mixed swings default to range rotation when baseline MA posture does not clearly support continuation.
- `R-REGIME-04` Potential reversal: CHOCH appears without confirmation BOS in the opposite direction.
- `R-REGIME-05` Mixed swings may still resolve to trend continuation when baseline MA posture confirms the directional bias.
- `R-REGIME-06` Wick-only breaks do not change regime without close confirmation.

### Strong And Weak Swing Logic

- Strong high/low: pivot that caused structural break.
- Weak high/low: pivot that failed to break structure and remains liquidity target.

### BOS And CHOCH Taxonomy

- Continuation BOS: break of prior structural level in direction of prevailing trend.
- CHOCH: first opposite-direction structural break against prevailing trend.
- Confirmation BOS: second structural break in new direction after CHOCH.
- Reversal confirmed only after `CHOCH + confirmation BOS`.
- Wick-only excursion does not qualify as BOS or CHOCH.
- CHOCH+ (momentum-failure variant): failed extension first, then opposite structural break.

### Reversal Validation Chain

1. Confirm prior trend context.
2. Detect CHOCH as first opposite close-based break.
3. Observe pullback behavior (HL for bullish, LH for bearish).
4. Require confirmation BOS in new direction.
5. If step 4 fails, keep state unconfirmed — avoid reversal call.

CHOCH without confirmation BOS is a potential reversal warning, not confirmed reversal. If break occurs but price quickly reclaims prior structure without follow-through, classify as deviation/liquidity grab.

### Wyckoff Context Mapping

One label as context after state call: `accumulation` (balance after downtrend, absorption), `markup` (imbalance up, continuation), `distribution` (balance after uptrend, supply), `markdown` (imbalance down, continuation). Contextual guidance, not standalone trigger.

### Baseline MA Tiebreaker

When last swings are mixed:

- `trend_continuation` bullish only if price above `200SMA`, `21EMA` above `50SMA`, and at least one bullish swing condition holds
- `trend_continuation` bearish only if price below `200SMA`, `21EMA` below `50SMA`, and at least one bearish swing condition holds
- Otherwise keep `range_rotation`

### No-Resistance Protocol

If price is in discovery with no clear overhead resistance: do not force fixed top target. Keep action tied to structure continuation and invalidation. Downgrade conviction only on structural weakness or distribution evidence.

## Levels And Location

Map meaningful decision zones, then interpret price relative to those zones.

### Horizontal Zones

- Levels are zones, not single lines.
- Higher-timeframe and repeatedly respected zones matter more.
- First retest is strongest; repeated tests weaken a level.
- Broken S/R can flip role after close-based acceptance.
- Recently broken resistance that holds as support still counts as `accepted_above_resistance`.
- Map first, trade second.

Zone construction — use one method consistently: fixed-width, ATR-width, or wick-to-body reaction zone. Keep the map small and decision-oriented. Treat proximity against full zone width, not only midpoint.

### Moving Average Context

MAs are dynamic context, not standalone entry signals.

Baseline: `21EMA`, `50SMA`, `200SMA` — read each as `support`, `resistance`, or `noise`.

Adaptive MA — use only when the symbol shows repeated respect to a specific rhythm and baseline is not enough. Adaptive refines the read; it does not replace baseline regime context.

Chart modes: `hybrid` = baseline + highlighted chosen `SMA{n}`; `baseline` = `21EMA` + `50SMA` + `200SMA` only.

### Time-Based And Round Levels

Use when materially relevant: daily open, weekly open, monthly open, round-number levels. Context enhancers, not standalone triggers.

### Volume Profile (VPVR)

Map volume concentration by price to strengthen zone quality.

Components:

- `POC`: highest traded volume price — fair-value magnet
- `VAH`/`VAL`: value-area boundaries (70%)
- `HVN`: accepted/fair-value zone (reaction zone)
- `LVN`: fast-travel zone (continuation toward next HVN)

Rules:

- `R-VP-01` Treat profile levels as zones, not single ticks.
- `R-VP-02` Prefer confluence: profile level + structure + price reaction.
- `R-VP-03` POC re-tests attract price; rejection/acceptance defines bias.
- `R-VP-04` Accepted above VAH → bullish continuation; accepted below VAL → bearish continuation; rotating inside → balance.
- `R-VP-05` Volume-profile signal never overrides invalidation and stop discipline.

Mapping: build at least one anchor profile on the active structure leg. Add one fixed-range profile on last major consolidation/distribution range. Convert key levels into zones with ATR-aware width.

### Liquidity Draw And Level Excursion

Direction, entry timing, and targets are framed by where obvious resting liquidity is likely to be challenged next.

Compatibility note: runtime fields still use `sweep` naming for schema stability. In interpretation, read those fields as observable level excursions and their acceptance or rejection outcome, not as proof of intentional stop-hunting.

Liquidity pools: swing highs/lows, clustered equal highs/lows, trendline stop clusters, range boundaries (external), internal reaction zones.

- `external_liquidity`: major range highs/lows and structural swing extremes
- `internal_liquidity`: nearer reaction zones inside the active path

Alternation model (heuristic):

1. Rejected external level excursion → next draw often shifts to internal
2. Accepted external level excursion → may continue toward external-side objective
3. After internal tag → depends on acceptance or rejection

Rules:

- `R-LIQ-01` Always identify current draw and opposing draw.
- `R-LIQ-02` Level excursion must be labeled acceptance or rejection.
- `R-LIQ-03` Wick-only excursion without follow-through is not directional confirmation.
- `R-LIQ-04` HTF excursion should pair with LTF execution trigger when available.
- `R-LIQ-05` If draw target is unclear, downgrade directional conviction.
- `R-LIQ-06` Liquidity narrative cannot override invalidation and risk rules.

HTF-LTF alignment: define HTF liquidity objective → wait for level excursion signal and classify it → shift to LTF for entry trigger → stop beyond the excursion extreme or structural invalidation → target next mapped liquidity pool.

### Practical Mapping Order

1. Daily support and resistance
2. Structural swing highs and lows
3. Value-area references (POC/VAH/VAL, major HVN/LVN)
4. Baseline MA context
5. Liquidity draw map (current draw, opposing draw)
6. Time-based and round levels when relevant

## Setups And Execution

Select one setup family, demand the right trigger, confirm it, then convert into an executable plan with explicit invalidation and level-to-level targets.

### Setup Families

- `S1` breakout and retest continuation
- `S2` pullback to demand in intact uptrend
- `S3` excursion and reclaim reversal
- `S4` range edge rotation
- `S5` Wyckoff spring with reclaim
- `NO_VALID_SETUP`

### Setup Selection Rules

- Choose one setup family or `NO_VALID_SETUP`.
- Setup must fit daily regime and current location.
- Setup labels without location, trigger, and risk are not tradable.
- Middle-of-range entries usually downgrade to `NO_VALID_SETUP`.
- Reversal intent requires structure shift confirmation, not narrative alone.

### Setup Family Guidance

#### `S1` Breakout And Retest Continuation

Use when daily regime supports continuation, resistance is meaningfully challenged or reclaimed, participation supports acceptance. Needs: close beyond level, follow-through, retest hold or continued acceptance.

#### `S2` Pullback To Demand In Intact Uptrend

Use when trend remains intact, price returns to meaningful support/demand, pullback quality is constructive. Needs: support hold, acceptable selling pressure, thesis aligned with daily structure.

#### `S3` Excursion And Reclaim Reversal

Use when level-excursion behavior is central, price briefly trades through a liquidity pocket and snaps back, and reversal context is plausible. Needs: clear excursion, reclaim or rejection, confirmation that reclaim is holding.

#### `S4` Range Edge Rotation

Use when regime is balance, price is at range edge, edge reaction is clean. Needs: rejection or acceptance at edge, edge-to-edge path, avoid mid-range execution.

#### `S5` Wyckoff Spring With Reclaim

Use when range/accumulation context is credible, support-side excursion behaves like a spring, and reclaim is visible. Needs: spring-like excursion, reclaim of relevant level, follow-through strong enough to avoid trap failure.

### Trigger Rules

- A setup area is not enough by itself — action requires a trigger tied to the selected setup family.
- `15m` owns trigger quality inside the daily thesis.
- Absent trigger caps the setup score in the setup-forming range.

Trigger types: breakout close, retest hold, reclaim, sweep reclaim, range-edge rejection, `CHOCH` + confirmation `BOS`, spring reclaim.

### Breakout Quality

- Breakout needs close beyond level plus participation support.
- Breakout without follow-through is suspect; stalling increases trap risk.
- Avoid weak bases for swing continuation; late/loose bases need stronger confirmation.
- Volume expansion and fast post-break displacement improve quality.
- Weak broader market context can downgrade pure breakout setups.

### Reversal And Structure-Shift Rules

For bullish reversal: prior structure damaged/bearish → `CHOCH` appears → pullback holds constructively → confirmation `BOS` → reversal becomes actionable.

- `CHOCH` alone is warning, not confirmation.
- Structure shift without confirmation stays in a developing-score range.

### Execution And Risk

#### Core Rules

- `R-RISK-01` No setup without invalidation.
- `R-RISK-02` Every constructive setup score must include explicit stop-loss and invalidator.
- `R-RISK-03` Entry is valid only near a mapped decision zone.
- `R-RISK-04` Primary target is the next meaningful zone in path.
- `R-RISK-05` If no clear next-zone path exists, cap conviction and state the blocker.
- `R-RISK-06` Mid-range entries without zone confluence are low quality and usually not actionable.
- `R-RISK-07` Minimum expected reward-to-risk must be stated before execution.
- `R-RISK-08` Add only when the trade is working and structure remains valid. Do not average down into structural failure.
- `R-RISK-09` Adaptive MA may refine execution only after the structural plan exists. It never overrides invalidation, stop, or risk discipline.

#### Level-To-Level Execution

Trade from validated zone to validated zone. Do not trade random mid-range noise.

1. Map top actionable zones
2. Identify likely next draw and opposing draw
3. Define candidate entry zone
4. Place invalidation beyond structural failure of that zone
5. Require trigger and confirmation before action
6. Manage toward next zone or invalidate thesis

#### Stop Hierarchy

1. Structural invalidation stop
2. ATR fallback stop when structure is unclear
3. Time stop for stale setup

Use stop as thesis invalidation, not arbitrary percentage.

#### Target And Management

- First target: nearest meaningful zone in path.
- Further targets extend along zone ladder.
- Partial exits at major S/R transitions.
- Trailing logic becomes explicit after first target.
- In price discovery, prefer structural trailing over arbitrary top calls.

### Take-Profit And Trade Management

- `R-TP-01` Every high-conviction constructive setup must include a technical trade-management plan at entry.
- `R-TP-02` Technical targets come from structure/value zones and R-multiples, not oscillators.
- `R-TP-03` Partial sizing defaults by setup family:
  - `S1`/`S2`: `25 / 25 / 50`
  - `S3`/`S5`: `40 / 30 / 30`
  - `S4`: `50 / 30 / 20`
- `R-TP-04` Trail mode is selected deterministically from state/regime, setup family, and Wyckoff maturity.
- `R-TP-05` Stop may tighten, never loosen.
- `R-TP-06` After `T1`, the remaining position must be protected at materially lower risk.
- `R-TP-07` Failed value acceptance, structure damage, and Wyckoff distribution risk can accelerate harvest or exit urgency.
- `R-TP-08` A stale winner must have a time-stop path, even when the thresholds are still conservative defaults.
- `R-TP-09` Discovery mode defaults to trailing over arbitrary top calls.
- `R-TP-10` Re-add is a fresh entry and must still respect `R-RISK-08`.

Trade-management contract:

- `trade_management.technical_plan` is present when `risk_map.actionable = true` or `analysis.position_state = long`.
- `trade_management.technical_state` is present only when `analysis.position_state = long`.
- Technical trade management is the chart-driven baseline. Final multi-lens execution policy may further tighten or reinterpret it in the parent workflow.

#### Optional Entry Refinement

Allowed only after base structural plan is valid: local `15m` acceptance/rejection behavior, adaptive MA when valid period available. If unavailable, keep base plan. Do not downgrade solely because refinement is absent.

#### Minimum Actionability

All required for high conviction: valid setup family, meaningful location, valid trigger, confirmation not rejected, explicit invalidation, explicit next-zone path, acceptable RR. Missing prerequisites cap `conviction_score`.

## `ta_context` Schema

Top-level shape:

```json
{ "analysis": {}, "prior_thesis": {}, "daily_thesis": {}, "intraday_timing": {}, "location": {}, "setup": {}, "trigger_confirmation": {}, "risk_map": {}, "trade_management": {}, "red_flags": [] }
```

Rules: required sections must always be present except `prior_thesis` (required for `UPDATE`/`POSTMORTEM`). Omit inactive optional fields instead of placeholder nulls.

### `analysis`

- `symbol`: string, uppercase ticker
- `as_of_date`: string, `YYYY-MM-DD`
- `purpose_mode`: `INITIAL` | `UPDATE` | `POSTMORTEM`
- `intent`: `entry` | `maintenance` | `postmortem`
- `position_state`: `flat` | `long`
- `daily_timeframe`: `1d`
- `intraday_timeframe`: `15m`
- `intraday_source_timeframe`: `1m`
- `min_rr_required`: number, positive decimal
- `price_changes`: object { `1d`, `7d`, `30d`, `90d` optional: object { `from`: number, `to`: number, `pct`: number } } — recent price performance overview; keys omitted when insufficient daily history
- `thesis_status` (conditional, `UPDATE`): `intact` | `improving` | `degrading` | `invalidated`
- `review_reason` (conditional, `UPDATE`): `routine` | `contradiction` | `level_break` | `regime_change` | `trigger_failure`

### `prior_thesis` (required for `UPDATE`/`POSTMORTEM`)

- `reference`: string, prior report path or run id
- `prior_bias`: `bullish` | `bearish` | `neutral`
- `prior_setup_family`: `S1`–`S5` | `NO_VALID_SETUP`
- `thesis_summary`: string[], 1–3 short bullets
- `invalidation_level`: number
- `key_levels`: number[]
- `prior_thesis_status` (optional): `intact` | `improving` | `degrading` | `invalidated`
- `prior_trade_management` (optional): object carrying prior technical trade-management snapshot when available
- `active_recommendation` (optional): object carrying the prior symbol-plan recommendation lifecycle when available; use `retest_level`, `retest_status`, `retest_checked`, and `wait_desk_check_count` during `UPDATE` retest checks

### `daily_thesis`

- `state`: `balance` | `imbalance`
- `regime`: `trend_continuation` | `range_rotation` | `potential_reversal` | `no_trade`
- `trend_bias`: `bullish` | `bearish` | `neutral`
- `structure_status`: `trend_intact` | `range_intact` | `transitioning` | `damaged` | `unclear`
- `current_cycle_phase`: `accumulation` | `markup` | `distribution` | `markdown` | `unclear`
- `current_wyckoff_phase`: `A`–`E` | `unclear` | `not_applicable`
- `wyckoff_current_confidence`: integer 0–100
- `wyckoff_current_maturity`: `fresh` | `maturing` | `mature` | `degrading`
- `wyckoff_history`: object[], last 3–8 segments (see `wyckoff_history` sub-schema)
- `baseline_ma_posture`: object (see `baseline_ma_posture` sub-schema)
- `adaptive_ma` (optional): object (see `adaptive_ma` sub-schema)

### `intraday_timing`

- `timing_bias`: `bullish` | `bearish` | `neutral`
- `intraday_structure_state`: `aligned` | `conflicted` | `counter_thesis` | `unclear`
- `acceptance_state`: `accepted_above_level` | `accepted_below_level` | `reclaimed_level` | `rejected_at_level` | `inside_noise` | `unclear`
- `follow_through_state`: `strong` | `adequate` | `weak` | `failing` | `unclear`
- `timing_window_state`: `active` | `developing` | `late` | `stale` | `unclear`
- `liquidity_quality_state`: `strong` | `usable` | `weak`
- `timing_authority`: `full_15m` | `daily_only` | `wait_only`
- `raw_participation_quality`: `strong` | `adequate` | `weak`
- `intraday_quality_summary`: string

### `location`

- `location_state`: `near_support_in_bullish_structure` | `near_resistance_in_bearish_structure` | `at_range_edge` | `accepted_above_resistance` | `accepted_below_support` | `mid_range_noise`
- `support_zones`: zone[]
- `resistance_zones`: zone[]
- `value_area`: object { `poc`, `vah`, `val`: number; `acceptance_state`: `accepted_above_vah` | `accepted_below_val` | `probe_above_vah` | `probe_below_val` | `inside_value` | `failed_acceptance_back_inside`; `major_hvn`, `major_lvn`: number[] optional }
- `liquidity_map`: object { `current_draw`, `opposing_draw`: number optional; `last_sweep_type`: `none` | `eqh_swept` | `eql_swept` | `trendline_swept` | `swing_swept`; `last_sweep_side`: `up` | `down` optional; `last_sweep_outcome`: `accepted` | `rejected` | `unresolved` | `not_applicable`; `path_state`: `external_to_internal` | `internal_to_external` | `unclear` }
- `time_levels`: object { `daily_open`, `weekly_open`, `monthly_open`: number }
- `round_levels` (optional): object[] { `price`: number, `label`: string }

### `setup`

- `primary_setup`: `S1`–`S5` | `NO_VALID_SETUP`
- `candidate_setups`: string[], ordered; when no setup is valid include leading rejected family
- `candidate_evaluations`: object[] { `setup_id`, `status`: `valid` | `watchlist_only` | `invalid`, `score`: integer, `drivers`: string[] }
- `setup_side`: `long` | `neutral`
- `setup_validity`: `valid` | `watchlist_only` | `invalid`
- `setup_drivers`: string[]

### `trigger_confirmation`

- `trigger_state`: `not_triggered` | `watchlist_only` | `triggered` | `failed`
- `trigger_type`: `breakout_close` | `retest_hold` | `reclaim` | `sweep_reclaim` | `choch_bos_reversal` | `range_edge_rejection` | `spring_reclaim` | `none`
- `trigger_level` (conditional): number, required when `trigger_type != none`
- `trigger_ts` (conditional): ISO timestamp
- `confirmation_state`: `confirmed` | `mixed` | `rejected` | `not_applicable`
- `participation_quality`: `strong` | `adequate` | `weak` | `contradictory`
- `timing_authority`: `full_15m` | `daily_only` | `wait_only`
- `value_acceptance_state`: `accepted_above_vah` | `accepted_below_val` | `probe_above_vah` | `probe_below_val` | `inside_value` | `failed_acceptance_back_inside` | `not_applicable`
- `latest_structure_event` (optional): object { `event_type`: `CHOCH` | `BOS` | `RECLAIM` | `SWEEP` | `NONE`; `side`: `up` | `down` | `neutral`; `level`: number optional; `timestamp`: string optional; `relevance`: `setup_trigger` | `confirmation` | `warning` | `none` }
- `breakout_quality` (optional): object { `status`: `clean` | `adequate` | `stalling` | `failed`; `trigger_vol_ratio`: number optional; `follow_through_close`: number optional; `base_quality`: `strong` | `adequate` | `weak`; `market_context`: `supportive` | `neutral` | `adverse` }

### `risk_map`

- `actionable`: boolean
- `entry_zone` (conditional): zone object, required when actionable or watchlist
- `invalidation_level` (conditional): number, required when actionable or watchlist
- `stop_level` (conditional): number, required when actionable
- `next_zone_target` (conditional): number, required when actionable
- `target_ladder` (optional): number[]
- `rr_by_target` (optional): number[]
- `best_rr` (conditional): number, required when actionable
- `current_rr` (conditional): number, required when `analysis.position_state = long`; reward-to-risk from current price to next target versus current price to invalidation
- `min_rr_required`: number
- `risk_status`: `valid` | `insufficient_rr` | `poor_location` | `no_clear_invalidation` | `no_clear_path` | `wait`
- `stale_setup_condition`: string

### `trade_management` (optional)

- `technical_plan`: object
  - `trail_mode`: `STRUCTURE` | `ZONE` | `MA` | `ATR`
  - `trail_anchor_type`: `swing_low` | `demand_zone` | `ma21` | `atr`
  - `partial_plan`: object[] { `target_id`: `T1` | `T2` | `T3`, `size_pct`: number, `level`: number | null }
  - `time_stop`: object { `max_sessions_pre_t1`: integer, `max_sessions_post_t1_no_new_high`: integer }
- `technical_state` (conditional, only when `analysis.position_state = long`): object
  - `profit_state`: `PRE_T1` | `POST_T1` | `POST_T2` | `RUNNER_ONLY`
  - `active_trail_anchor_price`: number
  - `active_trail_anchor_type`: `swing_low` | `demand_zone` | `ma21` | `atr`
  - `profit_exit_signals`: string[]
  - `phase_exit_urgency`: `low` | `moderate` | `high`

### `red_flags[]`

- `code`: string
- `severity`: `low` | `medium` | `high` | `critical`
- `summary`: string
- `evidence_refs` (optional): string[]

### Shared Sub-Schemas

#### `zone`

- `label`: string
- `kind`: `support` | `resistance` | `demand` | `supply` | `value` | `liquidity`
- `low`, `high`, `mid`: number
- `timeframe`: `1d` | `15m`
- `strength`: `weak` | `moderate` | `strong`
- `source`: `horizontal` | `swing` | `vpvr` | `ma` | `liquidity` | `opening_level`

#### `baseline_ma_posture`

- `above_ema21`, `above_sma50`, `above_sma200`: boolean
- `ema21_role`, `sma50_role`, `sma200_role`: `support` | `resistance` | `noise`
- `ema21_proximity_pct`, `sma50_proximity_pct`, `sma200_proximity_pct`: number optional

#### `adaptive_ma`

- `period`: integer
- `ma_type`: `ema` | `sma`
- `respect_score`: number
- `role`: `support` | `resistance` | `timing_refinement`
- `justification`: string

#### `wyckoff_history[]`

- `cycle_phase`: `accumulation` | `markup` | `distribution` | `markdown` | `unclear`
- `schematic_phase`: `A`–`E` | `unclear` | `not_applicable`
- `start_ts`, `end_ts`: ISO timestamp
- `start_index`, `end_index`: integer, 0-based daily index
- `duration_bars`: integer
- `price_low`, `price_high`: number
- `price_change_pct`: number
- `confidence`: integer 0–100
- `maturity`: `fresh` | `maturing` | `mature` | `degrading`
- `transition_reason`: string
- `events` (optional): wyckoff_event[]

#### `wyckoff_event[]`

- `type`: `SC` | `BC` | `AR` | `ST` | `Spring` | `ToS` | `SOS` | `LPS` | `UT` | `UTAD` | `SOW` | `LPSY`
- `bar_index`: integer
- `ts`: ISO date string
- `price`: number
- `score`: 0.0–1.0
- `vol_sig`: `climactic` | `strong` | `high_vol` | `elevated` | `moderate` | `dryup` | `sharp_rally` | `sharp_decline`

## Output Report Structure

Use this structure for every technical analysis output:

- **A. Technical Assessment Summary**: purpose mode, `conviction_score`, confidence, bias, setup, key active level, invalidation, next trigger, R:R, and top bull/bear factors
- **B. Context**: date, intent, timeframes, data dependency status, prior analysis reference (UPDATE/POSTMORTEM)
- **C. State And Location**: state, regime, bias, Wyckoff (cycle phase, schematic phase, maturity, confidence), key S/R zones, baseline MA posture, value-area context, liquidity map, location summary
- **D. Setup And Trigger**: selected setup family, validity, trigger state/type/level, confirmation state, participation quality, latest structure event, breakout quality note
- **E. Risk And Conviction**: entry zone, stop-loss, invalidation basis, next-zone target, target ladder, expected RR, red flags summary, and score rationale
- **F. Trade Management**: technical partial plan, trail mode, time-stop baseline, active profit state and exit-urgency context when long
- **Optional Scenarios**: 2-4 named chart-path branches when the setup is path-dependent. For each scenario, state trigger/level, likely path, operating implication, and optional rough likelihood.
- **G. Delta And Monitoring**: previous thesis snapshot (UPDATE/POSTMORTEM), thesis status and review reason (UPDATE), delta log (UPDATE), failure point and handling improvement (POSTMORTEM), monitoring triggers, stale setup condition
- **H. Adaptive MA**: selected period and chart mode when available
- **I. Evidence**: workflow trace, evidence ledger, chart artifact references from manifest
