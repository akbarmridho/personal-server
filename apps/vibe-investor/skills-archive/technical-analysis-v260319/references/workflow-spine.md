# Workflow Spine

## Objective

This file is the runtime workflow owner for technical analysis.

It defines:

- the canonical analysis order
- the question each phase must answer
- the minimum evidence required to move forward
- when the workflow should stop and return `WAIT`
- how `INITIAL`, `UPDATE`, and `POSTMORTEM` fit into one flow
- how daily thesis and `15m` timing interact

Use this file before reading topic doctrine.

## Runtime Model

### Purpose Mode

- `INITIAL`
- `UPDATE`
- `POSTMORTEM`

## Prior Thesis Input Contract

Required for:

- `UPDATE`
- `POSTMORTEM`

Required fields:

- prior report reference
- prior action
- prior thesis summary
- prior invalidation level
- prior key levels
- prior bias
- prior setup family

If required prior thesis context is missing, stop and report missing dependency.

## Non-Initial Mode Requirements

### `UPDATE`

Every `UPDATE` run must produce:

- `thesis_status`: `intact`, `improving`, `degrading`, or `invalidated`
- `review_reason`: `routine`, `contradiction`, `level_break`, `regime_change`, or `trigger_failure`
- explicit delta assessment

Minimum delta assessment:

- what changed
- what stayed the same
- why the action changed or stayed the same

Delta categories:

- structure
- levels
- volume and participation
- setup quality
- risk

### `POSTMORTEM`

Every `POSTMORTEM` run must produce:

- failure point
- missed warning or absent warning
- invalidation path
- rule improvement or handling improvement

## Canonical Phase Order

1. `MODE`
2. `STATE`
3. `LOCATION`
4. `SETUP`
5. `TRIGGER`
6. `CONFIRMATION`
7. `RISK`
8. `DECISION`
9. `MONITORING`

The workflow is chart-first and structure-first.

The operating sequence is:

- determine the job
- classify the daily market state
- map location and decision zones
- choose one setup family or none
- demand a valid trigger
- confirm with participation and acceptance
- build risk from invalidation backward
- choose one final action
- define what must happen next

## Phase Contract

### 1. `MODE`

Question:

- what job is being done right now?

Required inputs:

- symbol
- current OHLCV data
- position context
- prior thesis context for `UPDATE` and `POSTMORTEM`

Required outputs:

- `purpose_mode`
- `position_state`
- `analysis intent`

Rules:

- `INITIAL` builds a fresh thesis.
- `UPDATE` refreshes an active or recent thesis.
- `POSTMORTEM` reviews a failed or exited thesis.
- `UPDATE` requires prior thesis context.
- `POSTMORTEM` requires prior thesis context and failure or exit context.
- `UPDATE` must classify `thesis_status` and `review_reason`.
- If required prior context is missing, stop and report missing dependency.

### 2. `STATE`

Question:

- what is the daily market state and regime?

Primary owner:

- daily timeframe

Required outputs:

- `state`
- `regime`
- `trend_bias`
- `structure_status`
- `current_cycle_phase`
- `current_wyckoff_phase`
- `wyckoff_current_confidence`
- `wyckoff_current_maturity`
- `wyckoff_history`
- baseline MA posture

Minimum evidence:

- current daily structure read
- value acceptance or repricing state
- Wyckoff current cycle plus recent sequence
- baseline `21EMA`, `50SMA`, `200SMA` posture
- intraday timing authority when lower-timeframe timing is used

Stop rules:

- If state cannot be classified beyond `unclear`, return `WAIT`.
- If daily state is `no_trade`, return `WAIT` unless `POSTMORTEM` is the purpose mode.

### 3. `LOCATION`

Question:

- where is price relative to meaningful decision zones?

Primary owner:

- daily timeframe

Required outputs:

- support zones
- resistance zones
- value-area context
- liquidity draw map
- time-based levels
- round levels
- active location classification

Minimum evidence:

- at least one meaningful nearby decision zone
- current draw and opposing draw
- value-area acceptance state when VPVR is active

Stop rules:

- If price is in mid-range noise and no meaningful zone is active, return `WAIT`.
- If no clear next path exists, lean toward `WAIT` and continue only if `POSTMORTEM` requires explanation.

### 4. `SETUP`

Question:

- what setup family matches the current state and location?

Allowed outputs:

- `S1`
- `S2`
- `S3`
- `S4`
- `S5`
- `NO_VALID_SETUP`

Required outputs:

- one selected setup family
- setup side
- setup validity state

Selection rule:

- choose one setup family or `NO_VALID_SETUP`

Stop rules:

- If no setup family fits cleanly, return `WAIT`.
- Do not carry multiple final setup families into later phases.

### 5. `TRIGGER`

Question:

- has the setup actually triggered?

Primary owner:

- `15m` timing inside the daily thesis

Required outputs:

- trigger state
- trigger type
- trigger level
- latest structure event relevance
- watchlist versus actionable state

Minimum evidence:

- trigger event tied to the selected setup family
- local acceptance, reclaim, or follow-through read

Rules:

- daily still owns thesis direction
- `15m` refines tactical timing
- `15m` may delay action

Stop rules:

- If trigger is absent, return `WAIT` or watchlist conditions.
- Do not promote an untriggered setup into an actionable trade.

### 6. `CONFIRMATION`

Question:

- does the evidence support the trigger strongly enough?

Primary owner:

- `15m` timing plus daily participation context

Required outputs:

- confirmation state
- participation quality
- value acceptance or rejection
- breakout quality when relevant

Minimum evidence:

- trigger follow-through
- participation read
- contradiction check between chart read and numeric evidence

Rules:

- daily charting defaults to `hybrid` MA mode
- `hybrid` chart mode keeps `21EMA`, `50SMA`, `200SMA`, and adds the chosen `SMA{n}`
- `baseline` chart mode keeps only `21EMA`, `50SMA`, `200SMA`

Stop rules:

- If confirmation is mixed and the contradiction affects action quality, return `WAIT`.
- If a trigger fails immediately, downgrade to `WAIT` or `EXIT` depending on position state.

### 7. `RISK`

Question:

- where is the thesis wrong and what is the level-to-level path?

Required outputs:

- entry zone
- invalidation level
- stop level
- next-zone target
- target ladder
- reward-to-risk
- stale setup condition

Minimum evidence:

- explicit invalidation
- explicit path to the next zone
- reward-to-risk at or above the required threshold for actionable trades

Stop rules:

- If invalidation is unclear, return `WAIT`.
- If no next-zone path exists, return `WAIT`.
- If reward-to-risk is below threshold, return `WAIT`.

### 8. `DECISION`

Question:

- what is the single allowed final action?

Allowed outputs:

- `BUY`
- `HOLD`
- `WAIT`
- `EXIT`

Rules:

- choose one action only
- use the action rules from `policy-contract.md`
- unresolved contradiction defaults to `WAIT`

### 9. `MONITORING`

Question:

- what should confirm, invalidate, or refresh this thesis next?

Required outputs:

- thesis confirmation triggers
- invalidation triggers
- next review condition
- stale setup condition

Rules:

- every run ends with explicit monitoring conditions
- `UPDATE` must record thesis status and review reason
- `POSTMORTEM` must record what failed and what should change in future handling

## Daily And `15m` Reconciliation

Daily owns:

- `STATE`
- `LOCATION`
- `SETUP`
- the main risk map

`15m` owns:

- `TRIGGER`
- `CONFIRMATION`
- tactical timing
- local acceptance or rejection
- follow-through quality

Authority rules:

- daily has final authority on thesis direction
- `15m` can veto timing
- `15m` can downgrade confidence
- `15m` can keep the result in `WAIT`
- `15m` cannot create a trade against the daily thesis by itself

## Reference Loading Policy

Read references by phase.

Always load:

- `workflow-spine.md`
- `policy-contract.md`

Load by need:

- `STATE` -> `market-structure-and-trend.md`
- `LOCATION` -> `levels.md`, `volume-profile-and-volume-flow.md`, `liquidity-draw-and-sweep.md`
- `SETUP`, `TRIGGER`, `CONFIRMATION` -> `setups-and-breakouts.md`
- `RISK`, `DECISION`, `MONITORING` -> `execution-and-risk-protocol.md`
- output only -> `output-report-template.md`

## Output Hand-Off

This workflow hands one bounded decision package to the output template:

- purpose mode
- selected setup family
- action
- confidence
- invalidation
- next trigger
- monitoring conditions
- chart evidence references

## Workflow Trace Requirement

The final response should trace the phases actually used.

Minimum trace rows:

- `MODE`
- `STATE`
- `LOCATION`
- `SETUP`
- `TRIGGER`
- `CONFIRMATION`
- `RISK`
- `DECISION`
- `MONITORING`

Additional non-initial trace requirements:

- include `Previous Thesis Snapshot` for `UPDATE` and `POSTMORTEM`
- include `Thesis Status` and reason for `UPDATE`
- include a `Delta Log` for `UPDATE`
- include failure and handling notes for `POSTMORTEM`
