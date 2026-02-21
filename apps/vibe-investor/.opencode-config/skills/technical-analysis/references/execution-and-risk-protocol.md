# Execution And Risk Protocol

## Objective

Convert a valid technical setup into an executable swing plan with structural invalidation, chart-derived targets, and measurable risk-reward.

## Scope Boundary

This file owns the bridge from TA setup to trade plan: stop placement, target mapping, entry refinement, divergence handling, and R:R calculation using chart-derived levels.

Portfolio-level concerns are owned by the portfolio-management skill:

- Position sizing formula and portfolio heat limits -> `position-sizing-and-diversification.md`
- Conviction scaling and hard-loss fallback caps -> `position-sizing-and-diversification.md`
- Adding to winners / averaging down portfolio rules -> `entry-exit-and-rebalancing-playbook.md`
- Cut-loss behavioral discipline and thesis-break exits -> `entry-exit-and-rebalancing-playbook.md`

When both skills are active, TA produces the plan (entry, stop, targets, R:R), PM validates sizing against portfolio constraints before execution.

## Core Rules

- `R-RISK-01` No setup without invalidation.
- `R-RISK-02` Every actionable decision must include explicit stop-loss and invalidator.
- `R-RISK-03` Action must be one of: `BUY`, `HOLD`, `WAIT`, `EXIT`.
- `R-RISK-04` Add only when trade is working and structure remains valid.
- `R-RISK-05` Do not average down into structural failure.
- `R-RISK-06` FVG/OTE are optional entry refinements only after structure confirmation.
- `R-RISK-07` Optional confluence never overrides invalidation, stop, or risk sizing.
- `R-RISK-08` Fib retracement/extension may support entry/target mapping only when swing anchors and structure context are explicit.

## Stop Hierarchy

1. Structural invalidation stop (preferred).
2. ATR fallback stop when structure is unclear.
3. Time stop for stale setup (no progress in defined window).

Use stop as thesis invalidation, not arbitrary percentage.

## Target And Management

- Use nearest liquidity/level as first target.
- Use partial exits at major resistance/support transitions.
- Keep trailing stop rule explicit after first target.

In no-resistance conditions (price discovery), prioritize structural trailing logic over fixed target projection.

## Optional Entry Refinement

If structural setup is already valid, entry may be refined with:

- FVG retrace zone
- OTE zone (`0.618`, `0.706`, `0.786`)
- Fib retracement and extension context from the Fibonacci Retracement And Extension section of `levels.md`

If refinement is not available, continue with base structural plan. Do not downgrade solely because optional confluence is absent.

## Divergence Action Ladder

1. `divergence_unconfirmed`: reduce aggressiveness, tighten risk, avoid adding size.
2. `divergence_confirmed` with structure break: de-risk or exit by structure.
3. No structural confirmation: remain reactive, avoid top prediction.

## Trace Requirements

- Provide proof for each risk field:
  - entry basis and exact level
  - stop basis and exact level
  - target ladder source levels
  - R:R per target
- Include confidence and invalidators in plain language.
- If optional confluence is used, include: type (`FVG` or `OTE`), exact zone, and source swing/time references.
- If Fib is used, include: anchor swings, retracement level used, and extension target references.

## Reference Code

```python
def build_trade_plan(side, entry, invalidation, nearest_levels):
    """Build chart-derived trade plan. Sizing is deferred to PM."""
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


def attach_optional_refinement(plan, refinement_type=None, zone=None, source_ref=None):
    """refinement_type in {None, "FVG", "OTE"}"""
    if refinement_type is None:
        return plan
    out = dict(plan)
    out["entry_refinement"] = {
        "type": refinement_type,
        "zone": zone,
        "source_ref": source_ref,
    }
    return out


def decision_with_position(has_position, setup_id, red_flag_severity):
    if not has_position:
        return "WAIT" if setup_id == "NO_VALID_SETUP" else "BUY"
    if red_flag_severity in {"HIGH", "CRITICAL"}:
        return "EXIT"
    if setup_id == "NO_VALID_SETUP":
        return "HOLD"
    return "HOLD"
```

## Implementation Note

Enforcement: agent workflow during `SETUP_RISK` and `DECISION` phases (see SKILL.md preferred workflow). The `build_trade_plan` function is reference logic for constructing the risk section of the output report. Actual position sizing is computed by the portfolio-management skill using its own rules and the entry/stop from this plan.
