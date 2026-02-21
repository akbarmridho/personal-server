# Red Flag Helpers

## Objective

Provide helper functions to build red-flag outputs consistently.

## Reference Code

```python
def detect_red_flags(regime, breakout_state, level_touches, divergence_state, structure_state="no_signal"):
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

    if structure_state == "choch_only":
        flags.append({
            "flag_id": "F10_UNCONFIRMED_CHOCH",
            "severity": "MEDIUM",
            "why": "CHOCH detected without confirmation BOS",
        })

    return flags


def add_prior_context_flag(mode: str, has_prior_context: bool):
    if mode in {"UPDATE", "THESIS_REVIEW", "POSTMORTEM"} and not has_prior_context:
        return [{
            "flag_id": "F11_MISSING_PRIOR_CONTEXT",
            "severity": "MEDIUM",
            "why": "Non-initial mode missing prior analysis context",
        }]
    return []


def add_smc_evidence_gap_flag(lens: str, modules_used: list, evidence_count: int):
    if lens != "SMC_ICT_LIGHT":
        return []
    if len(modules_used) == 0:
        return [{
            "flag_id": "F12_SMC_EVIDENCE_GAP",
            "severity": "MEDIUM",
            "why": "SMC lens selected but no SMC module reported",
        }]
    if evidence_count < len(modules_used):
        return [{
            "flag_id": "F12_SMC_EVIDENCE_GAP",
            "severity": "MEDIUM",
            "why": "SMC modules used without sufficient evidence refs",
        }]
    return []


def add_volume_confluence_flag(used_volume_profile: bool, has_key_levels: bool, uses_only_developing_session: bool):
    if not used_volume_profile:
        return []
    flags = []
    if not has_key_levels:
        flags.append({
            "flag_id": "F13_VOLUME_CONFLUENCE_WEAK",
            "severity": "MEDIUM",
            "why": "Volume-profile used without clear POC/VAH/VAL or node confluence",
        })
    if uses_only_developing_session:
        flags.append({
            "flag_id": "F13_VOLUME_CONFLUENCE_WEAK",
            "severity": "MEDIUM",
            "why": "Decision depends on developing session profile without prior-session reference",
        })
    return flags


def add_imbalance_quality_flag(used_imbalance: bool, has_ce: bool, is_unmitigated_or_fresh: bool):
    if not used_imbalance:
        return []
    flags = []
    if not has_ce:
        flags.append({
            "flag_id": "F14_IMBALANCE_QUALITY_WEAK",
            "severity": "MEDIUM",
            "why": "Imbalance used without CE reference",
        })
    if not is_unmitigated_or_fresh:
        flags.append({
            "flag_id": "F14_IMBALANCE_QUALITY_WEAK",
            "severity": "MEDIUM",
            "why": "Imbalance appears spent/fully mitigated",
        })
    return flags


def add_no_next_zone_path_flag(action: str, has_next_zone_target: bool):
    if action in {"BUY", "EXIT"} and not has_next_zone_target:
        return [{
            "flag_id": "F15_NO_NEXT_ZONE_PATH",
            "severity": "MEDIUM",
            "why": "Action taken without clear next-zone target",
        }]
    return []


def add_liquidity_map_flag(has_current_draw: bool, has_opposing_draw: bool, has_sweep_label: bool):
    missing = not has_current_draw or not has_opposing_draw or not has_sweep_label
    if missing:
        return [{
            "flag_id": "F16_LIQUIDITY_MAP_MISSING",
            "severity": "MEDIUM",
            "why": "Liquidity map incomplete (draw targets or sweep labeling missing)",
        }]
    return []


def add_breakout_stalling_flag(is_breakout_setup: bool, has_displacement: bool):
    if is_breakout_setup and not has_displacement:
        return [{
            "flag_id": "F17_BREAKOUT_STALLING",
            "severity": "MEDIUM",
            "why": "Breakout lacks clean displacement and may be a trap",
        }]
    return []


def add_breakout_filter_weak_flag(is_breakout_setup: bool, base_quality_ok: bool, market_context_ok: bool):
    if not is_breakout_setup:
        return []
    if base_quality_ok and market_context_ok:
        return []
    return [{
        "flag_id": "F18_BREAKOUT_FILTER_WEAK",
        "severity": "MEDIUM",
        "why": "Breakout filters weak (base quality/market context)",
    }]


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
