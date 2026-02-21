# Analysis Checkpoints

## Objective

Enforce a consistent analysis flow without forcing rigid sequencing in every scenario.

## Adaptive Checklist

1. `G1_MODE` - Analysis mode and lens are explicitly declared.
2. `G2_DATA` - Data completeness and recency.
3. `G3_STATE_REGIME` - Daily state (`balance` or `imbalance`) and regime are classifiable.
4. `G4_LEVELS` - Tradable levels/zones are present.
5. `G5_PARTICIPATION` - Volume and behavior do not contradict setup.
6. `G6_STRUCTURE_CONFIRM` - Reversal intent requires `CHOCH + BOS` confirmation.
7. `G7_SETUP` - Exactly one valid setup family selected.
8. `G8_RISK` - Invalidation, stop, and size are explicit.
9. `G9_CONFLICTS` - Any chart vs numeric contradiction is resolved explicitly.
10. `G10_DELTA` - Non-initial mode includes prior snapshot, delta log, and thesis status.
11. `G11_SMC` - If lens is `SMC_ICT_LIGHT`, used SMC modules and evidence are explicitly reported.
12. `G12_VOLUME_PROFILE` - If volume-profile context is used, report POC/VAH/VAL, HVN/LVN, and prior-session POC references.
13. `G13_IMBALANCE` - If FVG/IFVG is used, report type, bounds, CE behavior, and mitigation state.
14. `G14_L2L_PATH` - If action is BUY/EXIT, report next-zone target and expected RR.
15. `G15_LIQUIDITY_MAP` - Report current draw, opposing draw, sweep event/outcome, and liquidity path state.
16. `G16_LEVEL_HEURISTICS` - Include HTF-first mapping, time-based levels, and round-number checks when relevant.
17. `G17_BREAKOUT_FILTERS` - For breakout setups, include base quality and market-context filters; MA posture should be covered in level context.

## Hard Stops

- Missing required data -> stop and report dependency.
- Missing invalidation/stop for actionable call -> downgrade to `WAIT`.

## Soft Stops

- Mixed or conflicting evidence -> reduce confidence and prefer `WAIT` or smaller risk.

## Reference Code

```python
def checkpoint_result(checkpoint_id, status, why, evidence_refs):
    return {
        "checkpoint_id": checkpoint_id,
        "status": status,  # PASS, MIXED, FAIL
        "why": why,
        "evidence_refs": evidence_refs,
    }
```
