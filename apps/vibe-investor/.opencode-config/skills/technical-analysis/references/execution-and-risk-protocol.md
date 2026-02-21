# Execution And Risk Protocol

## Objective

Convert valid setup into executable swing plan with explicit invalidation and measurable risk.

## Core Rules

- `R-RISK-01` No setup without invalidation.
- `R-RISK-02` Position sizing is risk-first, not conviction-first.
- `R-RISK-03` Add only when trade is working and structure remains valid.
- `R-RISK-04` Do not average down into structural failure.
- `R-RISK-05` Action must be one of: `BUY`, `HOLD`, `WAIT`, `EXIT`.

## Stop Hierarchy

1. Structural invalidation stop (preferred).
2. ATR fallback stop when structure is unclear.
3. Time stop for stale setup (no progress in defined window).

## Target And Management

- Use nearest liquidity/level as first target.
- Use partial exits at major resistance/support transitions.
- Keep trailing stop rule explicit after first target.

## Trace Requirements

- Provide proof for each risk field:
  - entry basis and exact level
  - stop basis and exact level
  - position size math
  - target ladder source levels

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


def decision_from_plan(setup_id, red_flag_severity):
    if setup_id == "NO_VALID_SETUP":
        return "WAIT"
    if red_flag_severity in {"HIGH", "CRITICAL"}:
        return "WAIT"
    return "BUY"
```
