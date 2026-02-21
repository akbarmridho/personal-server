# Analysis Checklists And Red Flags

## Objective

Enforce a consistent analysis flow without forcing rigid sequencing in every scenario.

## Adaptive Checklist

Use these checkpoints in most analyses. Depth can vary by context.

1. `G1_DATA` - Data completeness and recency.
2. `G2_STATE_REGIME` - Daily state (`balance` or `imbalance`) and regime are classifiable.
3. `G3_LEVELS` - Tradable levels/zones are present.
4. `G4_PARTICIPATION` - Volume and behavior do not contradict setup.
5. `G5_SETUP` - Exactly one valid setup family selected.
6. `G6_RISK` - Invalidation, stop, and size are explicit.
7. `G7_CONFLICTS` - Any chart vs numeric contradiction is resolved explicitly.

Hard stops:

- Missing required data -> stop and report dependency.
- Missing invalidation/stop for actionable call -> downgrade to `WAIT`.

Soft stops:

- Mixed or conflicting evidence -> reduce confidence and prefer `WAIT` or smaller risk.

## Red Flag Taxonomy

- `F1_STRUCTURE_BREAK`
- `F2_DISTRIBUTION`
- `F3_WEAK_BREAKOUT`
- `F4_LEVEL_EXHAUSTION`
- `F5_DIVERGENCE_ESCALATION`
- `F6_MARKET_CONTEXT_MISMATCH`
- `F7_MA_BREAKDOWN`
- `F8_POSITION_RISK`
- `F9_NO_NEARBY_SUPPORT`

Severity:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

## Trace Requirements

- Every red flag must include:
  - `flag_id`
  - `severity`
  - `why`
  - `evidence_refs`

Also include overall risk summary: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` with one-sentence rationale.

## Reference Code

```python
def checkpoint_result(checkpoint_id, status, why, evidence_refs):
    return {
        "checkpoint_id": checkpoint_id,
        "status": status,  # "PASS", "MIXED", "FAIL"
        "why": why,
        "evidence_refs": evidence_refs,
    }


def detect_red_flags(regime, breakout_state, level_touches, divergence_state):
    flags = []

    if regime == "potential_reversal":
        flags.append({
            "flag_id": "F1_STRUCTURE_BREAK",
            "severity": "HIGH",
            "why": "Daily structure is transitioning",
        })

    if breakout_state == "failed_breakout":
        flags.append({
            "flag_id": "F3_WEAK_BREAKOUT",
            "severity": "HIGH",
            "why": "Breakout failed follow-through",
        })

    if level_touches >= 4:
        flags.append({
            "flag_id": "F4_LEVEL_EXHAUSTION",
            "severity": "MEDIUM",
            "why": "Repeated tests reduce level reliability",
        })

    if divergence_state == "divergence_confirmed":
        flags.append({
            "flag_id": "F5_DIVERGENCE_ESCALATION",
            "severity": "HIGH",
            "why": "Confirmed momentum divergence",
        })

    return flags


def add_ma_breakdown_flag(price, ma20, ma50):
    flags = []
    if price < ma20:
        flags.append({
            "flag_id": "F7_MA_BREAKDOWN",
            "severity": "HIGH",
            "why": "Price below MA20",
        })
    if price < ma50:
        flags.append({
            "flag_id": "F7_MA_BREAKDOWN",
            "severity": "CRITICAL",
            "why": "Price below MA50",
        })
    return flags


def add_position_risk_flag(entry_price, current_price, stop_price):
    flags = []
    if entry_price is not None and current_price < entry_price:
        dd = (current_price - entry_price) / entry_price
        sev = "MEDIUM" if dd > -0.10 else "HIGH"
        flags.append({
            "flag_id": "F8_POSITION_RISK",
            "severity": sev,
            "why": f"Position underwater {dd * 100:.1f}%",
        })
    if stop_price is not None and current_price > 0:
        dist = abs((current_price - stop_price) / current_price)
        if dist < 0.05:
            flags.append({
                "flag_id": "F8_POSITION_RISK",
                "severity": "HIGH",
                "why": f"Stop distance only {dist * 100:.1f}%",
            })
    return flags


def add_support_proximity_flag(nearest_support_distance_pct):
    if nearest_support_distance_pct is None:
        return []
    if nearest_support_distance_pct > 0.10:
        return [{
            "flag_id": "F9_NO_NEARBY_SUPPORT",
            "severity": "MEDIUM",
            "why": "Nearest support is far from current price",
        }]
    return []


def highest_severity(flags):
    rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
    if not flags:
        return "LOW"
    return sorted(flags, key=lambda x: rank[x["severity"]])[-1]["severity"]
```
