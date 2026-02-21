# Execution And Risk Protocol

## Objective

Convert valid setup into executable swing plan with explicit invalidation and measurable risk.

## Core Rules

- `R-RISK-01` No setup without invalidation.
- `R-RISK-02` Position sizing is risk-first, not conviction-first.
- `R-RISK-03` Add only when trade is working and structure remains valid.
- `R-RISK-04` Do not average down into structural failure.
- `R-RISK-05` Action must be one of: `BUY`, `HOLD`, `WAIT`, `EXIT`.
- `R-RISK-06` Every actionable decision must include explicit stop-loss and invalidator.
- `R-RISK-07` FVG/OTE are optional entry refinements only after structure confirmation.
- `R-RISK-08` Optional confluence never overrides invalidation, stop, or risk sizing.
- `R-RISK-09` Fib retracement/extension may support entry/target mapping only when swing anchors and structure context are explicit.

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
- Fib retracement and extension context from `levels-fibonacci-retracement-and-extension.md`

If refinement is not available, continue with base structural plan. Do not downgrade solely because optional confluence is absent.

## Divergence Action Ladder

1. `divergence_unconfirmed`: reduce aggressiveness, tighten risk, avoid adding size.
2. `divergence_confirmed` with structure break: de-risk or exit by structure.
3. No structural confirmation: remain reactive, avoid top prediction.

## Trace Requirements

- Provide proof for each risk field:
  - entry basis and exact level
  - stop basis and exact level
  - position size math
  - target ladder source levels
- Include confidence and invalidators in plain language.
- If optional confluence is used, include: type (`FVG` or `OTE`), exact zone, and source swing/time references.
- If Fib is used, include: anchor swings, retracement level used, and extension target references.

## Reference Code

```python
def position_size(capital, risk_pct, entry, stop):
    risk_amount = capital * risk_pct
    per_share_risk = abs(entry - stop)
    if per_share_risk <= 0:
        raise ValueError("Invalid stop distance")
    qty = risk_amount / per_share_risk
    return {
        "risk_amount": risk_amount,
        "per_share_risk": per_share_risk,
        "quantity": qty,
        "position_value": qty * entry,
    }


def build_trade_plan(side, entry, invalidation, nearest_levels, capital=100_000_000, risk_pct=0.01):
    if side == "long":
        stop = min(invalidation, entry)
        targets = sorted([x for x in nearest_levels if x > entry])[:3]
    else:
        stop = max(invalidation, entry)
        targets = sorted([x for x in nearest_levels if x < entry], reverse=True)[:3]

    sizing = position_size(capital, risk_pct, entry, stop)
    rr = []
    for t in targets:
        reward = abs(t - entry)
        rr.append(reward / sizing["per_share_risk"])

    return {
        "side": side,
        "entry": entry,
        "stop": stop,
        "invalidation": invalidation,
        "targets": targets,
        "rr_by_target": rr,
        "sizing": sizing,
    }


def attach_optional_refinement(plan: dict, refinement_type=None, zone=None, source_ref=None):
    # refinement_type in {None, "FVG", "OTE"}
    if refinement_type is None:
        return plan
    out = dict(plan)
    out["entry_refinement"] = {
        "type": refinement_type,
        "zone": zone,
        "source_ref": source_ref,
    }
    return out


def decision_with_position(has_position: bool, setup_id: str, red_flag_severity: str):
    if not has_position:
        return "WAIT" if setup_id == "NO_VALID_SETUP" else "BUY"
    if red_flag_severity in {"HIGH", "CRITICAL"}:
        return "EXIT"
    if setup_id == "NO_VALID_SETUP":
        return "HOLD"
    return "HOLD"
```
