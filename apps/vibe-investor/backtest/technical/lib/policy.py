"""Deterministic daily-only policy for technical backtest ablation mode."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

ENTRY_BLOCKING_FLAGS = {"F1_STRUCTURE_BREAK", "F3_WEAK_BREAKOUT", "F6_MA_BREAKDOWN"}
EXIT_FLAGS = {"F1_STRUCTURE_BREAK", "F3_WEAK_BREAKOUT", "F6_MA_BREAKDOWN"}


@dataclass(frozen=True)
class PolicyDecision:
    action: str
    reason: str
    setup_id: str
    pending_setup_active: bool
    pending_setup_id: str | None = None
    pending_setup_expiry_bars: int | None = None


def stale_expiry_bars(setup_id: str) -> int:
    return 3 if setup_id == "S1" else 5


def _flag_codes(context: dict[str, Any], severity: str | None = None) -> set[str]:
    flags = context.get("red_flags", [])
    if not isinstance(flags, list):
        return set()
    codes: set[str] = set()
    for raw_flag in flags:
        if not isinstance(raw_flag, dict):
            continue
        code = raw_flag.get("code")
        if not isinstance(code, str) or not code:
            continue
        if severity is not None and str(raw_flag.get("severity", "")).lower() != severity.lower():
            continue
        codes.add(code)
    return codes


def _strong_location(context: dict[str, Any]) -> bool:
    """Check if price is at a meaningful location for relaxed entry."""
    location = context.get("location", {})
    location_state = str(location.get("location_state", ""))
    return location_state in {
        "near_support_in_bullish_structure",
        "at_range_edge",
        "accepted_above_resistance",
    }


def liquidity_snapshot(context: dict[str, Any]) -> dict[str, str]:
    liquidity = context.get("location", {}).get("liquidity_map", {})
    if not isinstance(liquidity, dict):
        return {
            "last_sweep_type": "none",
            "last_sweep_side": "none",
            "last_sweep_outcome": "unresolved",
            "path_state": "unclear",
        }
    return {
        "last_sweep_type": str(liquidity.get("last_sweep_type", "none")),
        "last_sweep_side": str(liquidity.get("last_sweep_side", "none")),
        "last_sweep_outcome": str(liquidity.get("last_sweep_outcome", "unresolved")),
        "path_state": str(liquidity.get("path_state", "unclear")),
    }


def liquidity_entry_alignment(context: dict[str, Any], setup_id: str) -> str:
    liq = liquidity_snapshot(context)
    side = liq["last_sweep_side"]
    outcome = liq["last_sweep_outcome"]
    if side not in {"up", "down"} or outcome not in {"accepted", "rejected"}:
        return "neutral"

    if setup_id == "S1":
        if side == "up" and outcome == "accepted":
            return "supportive"
        if side == "down" and outcome == "rejected":
            return "supportive"
        if (side == "up" and outcome == "rejected") or (
            side == "down" and outcome == "accepted"
        ):
            return "contradictory"
        return "neutral"

    if setup_id == "S2":
        if side == "down" and outcome == "rejected":
            return "supportive"
        if side == "down" and outcome == "accepted":
            return "contradictory"
        if side == "up" and outcome == "rejected":
            return "contradictory"
        return "neutral"

    if setup_id in {"S3", "S4", "S5"}:
        if side == "down" and outcome == "rejected":
            return "supportive"
        if side == "down" and outcome == "accepted":
            return "contradictory"
        if side == "up" and outcome == "rejected":
            return "contradictory"
        return "neutral"

    return "neutral"


def liquidity_exit_pressure(context: dict[str, Any]) -> str:
    liq = liquidity_snapshot(context)
    side = liq["last_sweep_side"]
    outcome = liq["last_sweep_outcome"]
    if side == "down" and outcome == "accepted":
        return "hard_exit"
    if side == "up" and outcome == "rejected":
        return "caution_exit"
    return "neutral"


def evaluate_flat_policy(context: dict[str, Any], cooldown_active: bool) -> PolicyDecision:
    setup = context.get("setup", {})
    trigger = context.get("trigger_confirmation", {})
    risk_map = context.get("risk_map", {})
    daily_thesis = context.get("daily_thesis", {})

    setup_id = str(setup.get("primary_setup", "NO_VALID_SETUP"))
    trigger_state = str(trigger.get("trigger_state", "not_triggered"))
    risk_actionable = bool(risk_map.get("actionable", False))
    risk_status = str(risk_map.get("risk_status", "wait"))
    trend_bias = str(daily_thesis.get("trend_bias", "neutral"))
    structure_status = str(daily_thesis.get("structure_status", "unclear"))
    high_flags = _flag_codes(context, severity="high")
    liquidity_alignment = liquidity_entry_alignment(context, setup_id)

    if cooldown_active:
        return PolicyDecision("WAIT", "cooldown_after_exit", setup_id, False)
    if setup_id == "NO_VALID_SETUP":
        return PolicyDecision("WAIT", "no_valid_setup", setup_id, False)
    if trend_bias == "bearish" or structure_status == "damaged":
        return PolicyDecision("WAIT", "daily_thesis_not_supportive", setup_id, False)
    if high_flags & ENTRY_BLOCKING_FLAGS:
        return PolicyDecision("WAIT", "high_severity_entry_blocker", setup_id, False)
    if liquidity_alignment == "contradictory":
        return PolicyDecision("WAIT", "liquidity_contradicts_setup", setup_id, False)
    if trigger_state == "triggered" and risk_actionable:
        return PolicyDecision("BUY", "triggered_actionable_setup", setup_id, False)
    # Relaxed gate: watchlist setups with strong location and valid risk
    if (
        setup.get("setup_validity") == "watchlist_only"
        and _strong_location(context)
        and risk_status == "valid"
        and trend_bias == "bullish"
        and liquidity_alignment != "contradictory"
    ):
        return PolicyDecision("BUY", "watchlist_setup_strong_location", setup_id, False)
    if setup.get("setup_validity") == "watchlist_only":
        return PolicyDecision(
            "WAIT", "watchlist_setup_pending_trigger", setup_id, True,
            pending_setup_id=setup_id, pending_setup_expiry_bars=stale_expiry_bars(setup_id),
        )
    return PolicyDecision("WAIT", "setup_not_actionable", setup_id, False)


def evaluate_long_policy(context: dict[str, Any]) -> PolicyDecision:
    daily_thesis = context.get("daily_thesis", {})
    trigger = context.get("trigger_confirmation", {})
    setup = context.get("setup", {})

    setup_id = str(setup.get("primary_setup", "NO_VALID_SETUP"))
    trend_bias = str(daily_thesis.get("trend_bias", "neutral"))
    structure_status = str(daily_thesis.get("structure_status", "unclear"))
    confirmation_state = str(trigger.get("confirmation_state", "not_applicable"))
    high_flags = _flag_codes(context, severity="high")
    ma_posture = daily_thesis.get("baseline_ma_posture", {})
    above_sma50 = bool(ma_posture.get("above_sma50", False))
    above_sma200 = bool(ma_posture.get("above_sma200", False))
    exit_pressure = liquidity_exit_pressure(context)

    if high_flags & EXIT_FLAGS:
        return PolicyDecision("EXIT", "high_severity_exit_flag", setup_id, False)
    if exit_pressure == "hard_exit":
        return PolicyDecision("EXIT", "accepted_downside_sweep", setup_id, False)
    if trend_bias == "bearish":
        return PolicyDecision("EXIT", "bearish_trend_bias", setup_id, False)
    if structure_status == "damaged":
        return PolicyDecision("EXIT", "damaged_structure", setup_id, False)
    if exit_pressure == "caution_exit" and confirmation_state in {"mixed", "rejected"}:
        return PolicyDecision("EXIT", "upside_sweep_rejected", setup_id, False)
    if structure_status == "transitioning" and confirmation_state in {"mixed", "rejected"}:
        return PolicyDecision("EXIT", "transitioning_structure_with_weak_confirmation", setup_id, False)
    if not above_sma200 or (not above_sma50 and confirmation_state == "rejected"):
        return PolicyDecision("EXIT", "ma_posture_breakdown", setup_id, False)
    return PolicyDecision("HOLD", "thesis_still_intact", setup_id, False)
