# Execution And Risk Protocol

## Objective

Convert a valid technical setup into an executable plan with:

- explicit invalidation
- explicit stop placement
- level-to-level target mapping
- measurable reward-to-risk

This file owns the bridge from setup to action.

## Scope Boundary

This file owns:

- entry zone definition
- invalidation logic
- stop hierarchy
- next-zone path requirement
- target ladder construction
- reward-to-risk gating
- trade management rules
- `WAIT` behavior when the path is unclear

Portfolio-level sizing and allocation constraints are outside this file.

## Core Rules

- `R-RISK-01` No setup without invalidation.
- `R-RISK-02` Every actionable decision must include explicit stop-loss and invalidator.
- `R-RISK-03` Action must be one of: `BUY`, `HOLD`, `WAIT`, `EXIT`.
- `R-RISK-04` Entry is valid only near a mapped decision zone.
- `R-RISK-05` Primary target is the next meaningful zone in path.
- `R-RISK-06` If no clear next-zone path exists, default action is `WAIT`.
- `R-RISK-07` Mid-range entries without zone confluence are low quality and usually not actionable.
- `R-RISK-08` Minimum expected reward-to-risk must be stated before execution.
- `R-RISK-09` Add only when the trade is working and structure remains valid.
- `R-RISK-10` Do not average down into structural failure.
- `R-RISK-11` Adaptive MA may refine execution only after the structural plan already exists.
- `R-RISK-12` Adaptive MA never overrides invalidation, stop, or risk discipline.

## Level-To-Level Execution

Trade from validated zone to validated zone.

Core idea:

- do not trade random mid-range noise
- trade reactions at mapped decision zones
- target the next meaningful zone, not arbitrary fixed points

Operational workflow:

1. map top actionable zones
2. identify the likely next draw and opposing draw
3. define the candidate entry zone
4. place invalidation beyond structural failure of that zone
5. require trigger and confirmation before action
6. manage toward the next zone or invalidate the thesis

## Stop Hierarchy

1. structural invalidation stop
2. ATR fallback stop when structure is unclear
3. time stop for stale setup

Use stop as thesis invalidation, not as an arbitrary percentage.

## Target And Management

- first target should be the nearest meaningful zone in path
- further targets may extend along the zone ladder
- partial exits may be used at major support or resistance transitions
- trailing logic should become explicit after the first target

In price discovery, prefer structural trailing logic over arbitrary top calls.

## Optional Entry Refinement

Optional refinement is allowed only after the base structural plan is valid.

Allowed refinement sources:

- local acceptance or rejection behavior on `60m`
- adaptive MA when a valid period is available

If refinement is unavailable, keep the base structural plan.
Do not downgrade solely because optional refinement is absent.

## Minimum Actionability Requirements

An actionable plan requires all of the following:

- a valid setup family
- a meaningful location
- a valid trigger
- confirmation that is not rejected
- explicit invalidation
- explicit next-zone path
- acceptable reward-to-risk

If any item is missing, default to `WAIT`.

## Trace Requirements

Every actionable plan must report:

- entry zone and why it is valid
- invalidation level and why it invalidates the thesis
- stop level and stop basis
- next-zone target
- target ladder when relevant
- reward-to-risk by target

If the result is `WAIT`, report why:

- no clear zone
- no trigger
- no clear invalidation
- no clear path
- insufficient reward-to-risk

If adaptive MA is used for refinement, report:

- exact zone or condition used
- what it changed in the execution plan

## Reference Code

```python
def next_zone_target(entry: float, zones: list[float], side: str):
    if side == "long":
        cands = sorted([z for z in zones if z > entry])
    else:
        cands = sorted([z for z in zones if z < entry], reverse=True)
    return cands[0] if cands else None


def rr_ratio(entry: float, stop: float, target: float):
    risk = abs(entry - stop)
    reward = abs(target - entry)
    if risk <= 0:
        return None
    return reward / risk


def build_trade_plan(side, entry, invalidation, nearest_levels):
    """Build a chart-derived plan. Sizing is handled outside TA."""
    if side == "long":
        stop = min(invalidation, entry)
        targets = sorted([x for x in nearest_levels if x > entry])[:3]
    else:
        stop = max(invalidation, entry)
        targets = sorted([x for x in nearest_levels if x < entry], reverse=True)[:3]

    per_share_risk = abs(entry - stop)
    if per_share_risk <= 0:
        raise ValueError("Invalid stop distance")

    rr = []
    for t in targets:
        reward = abs(t - entry)
        rr.append(round(reward / per_share_risk, 2))

    return {
        "side": side,
        "entry": entry,
        "stop": stop,
        "invalidation": invalidation,
        "targets": targets,
        "rr_by_target": rr,
    }


def decision_with_position(has_position, setup_id, red_flag_severity):
    if not has_position:
        return "WAIT" if setup_id == "NO_VALID_SETUP" else "BUY"
    if red_flag_severity in {"HIGH", "CRITICAL"}:
        return "EXIT"
    if setup_id == "NO_VALID_SETUP":
        return "HOLD"
    return "HOLD"
```
