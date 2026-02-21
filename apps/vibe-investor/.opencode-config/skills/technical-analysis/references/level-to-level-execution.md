# Level-To-Level Execution

## Objective

Turn analysis into a mechanical workflow where price is traded from validated zone to validated zone with explicit invalidation and predefined target logic.

## Core Idea

- Do not trade random mid-range noise.
- Trade reactions at mapped liquidity zones.
- Target the next validated zone, not arbitrary fixed points.

## Rules

- `R-L2L-01` Entry is valid only near a mapped decision zone.
- `R-L2L-02` Stop belongs beyond structural invalidation of entry zone.
- `R-L2L-03` Primary target is the next liquidity zone in path.
- `R-L2L-04` If no next zone is clear, default action is `WAIT`.
- `R-L2L-05` Alerts are preferred over constant chart watching.
- `R-L2L-06` Mid-range entries without zone confluence are low quality.
- `R-L2L-07` Minimum expected reward-to-risk must be stated before execution.

## Operational Workflow

1. Map top actionable zones (support, resistance, profile nodes, structural pivots).
2. Mark path between zones and likely next draw.
3. Set alert at candidate entry zone.
4. On trigger, re-check structure/volume context quickly.
5. Execute only if setup and risk rules pass.
6. Manage to next zone or invalidation.

## Trace Requirements

- Report entry zone, invalidation level, and next-zone target.
- Report reward-to-risk estimate and position size basis.
- Report if decision was `WAIT` because zone map was unclear.

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
```
