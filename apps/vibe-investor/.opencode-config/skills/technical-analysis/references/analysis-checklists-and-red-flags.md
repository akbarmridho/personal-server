# Analysis Checklists And Red Flags

## Objective

Enforce a consistent analysis flow without forcing rigid sequencing in every scenario.

## Adaptive Checklist

Use these checkpoints in most analyses. Depth can vary by context.

1. `G1_DATA` - Data completeness and recency.
2. `G2_REGIME` - Daily regime is classifiable.
3. `G3_LEVELS` - Tradable levels/zones are present.
4. `G4_PARTICIPATION` - Volume and behavior do not contradict setup.
5. `G5_SETUP` - Exactly one valid setup family selected.
6. `G6_RISK` - Invalidation, stop, and size are explicit.

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


def highest_severity(flags):
    rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
    if not flags:
        return "LOW"
    return sorted(flags, key=lambda x: rank[x["severity"]])[-1]["severity"]
```
