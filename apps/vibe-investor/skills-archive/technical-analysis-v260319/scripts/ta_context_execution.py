from __future__ import annotations

from typing import Any

import pandas as pd

from ta_common import (
    add_intraday_context,
    summarize_intraday_liquidity,
    summarize_intraday_participation,
)
from ta_context_location import is_meaningful_location, near_zone


def build_intraday_timing(
    intraday_15m: pd.DataFrame, intraday_1m: pd.DataFrame, daily_bias: str
) -> dict[str, Any]:
    x = add_intraday_context(intraday_15m)
    liquidity = summarize_intraday_liquidity(intraday_1m)
    participation = summarize_intraday_participation(intraday_1m)
    if x.empty:
        return {
            "timing_bias": "neutral",
            "intraday_structure_state": "unclear",
            "acceptance_state": "unclear",
            "follow_through_state": "unclear",
            "timing_window_state": "unclear",
            "liquidity_quality_state": str(liquidity["liquidity_quality_state"]),
            "timing_authority": str(liquidity["timing_authority"]),
            "raw_participation_quality": str(participation["raw_participation_quality"]),
            "intraday_quality_summary": (
                f"{liquidity['summary']}|{participation['summary']}|no_intraday_timing"
            ),
        }

    last = x.iloc[-1]
    prev = x.iloc[-2] if len(x) > 1 else last
    recent3 = x.tail(min(3, len(x))).copy()
    recent4 = x.tail(min(4, len(x))).copy()
    close_price = float(last["close"])
    ema9 = float(last.get("EMA9", close_price))
    ema20 = float(last.get("EMA20", close_price))
    vwap = float(last.get("VWAP", close_price))
    range_series = (recent4["high"] - recent4["low"]).clip(lower=0)
    avg_range = float(range_series.mean()) if not range_series.empty else 0.0
    range_buffer = max(avg_range * 0.2, close_price * 0.0015)
    upper_ref = max(ema20, vwap)
    lower_ref = min(ema20, vwap)
    above_ref = close_price >= upper_ref - range_buffer
    below_ref = close_price <= lower_ref + range_buffer
    ema_stack_bullish = ema9 >= ema20
    ema_stack_bearish = ema9 <= ema20

    if close_price >= ema9 and above_ref and ema_stack_bullish:
        timing_bias = "bullish"
    elif close_price <= ema9 and below_ref and ema_stack_bearish:
        timing_bias = "bearish"
    else:
        timing_bias = "neutral"

    if daily_bias == "neutral" or timing_bias == "neutral":
        intraday_structure_state = "conflicted"
    elif timing_bias == daily_bias:
        intraday_structure_state = "aligned"
    else:
        intraday_structure_state = "counter_thesis"

    bullish_closes_recent = int((recent3["close"] >= (upper_ref - range_buffer)).sum())
    bearish_closes_recent = int((recent3["close"] <= (lower_ref + range_buffer)).sum())
    recent_lows = recent3["low"] if not recent3.empty else pd.Series(dtype="float64")
    recent_highs = recent3["high"] if not recent3.empty else pd.Series(dtype="float64")
    if len(x) < 2:
        acceptance_state = "unclear"
    elif close_price >= upper_ref and float(prev["close"]) < lower_ref:
        acceptance_state = "reclaimed_level"
    elif close_price <= lower_ref and float(prev["close"]) > upper_ref:
        acceptance_state = "rejected_at_level"
    elif (
        bullish_closes_recent >= 2
        and not recent_lows.empty
        and float(recent_lows.min()) >= lower_ref - range_buffer
    ):
        acceptance_state = "accepted_above_level"
    elif (
        bearish_closes_recent >= 2
        and not recent_highs.empty
        and float(recent_highs.max()) <= upper_ref + range_buffer
    ):
        acceptance_state = "accepted_below_level"
    else:
        acceptance_state = "inside_noise"

    if len(recent4) >= 2:
        close_deltas = recent4["close"].diff().dropna()
        low_deltas = recent4["low"].diff().dropna()
        high_deltas = recent4["high"].diff().dropna()
        bull_bodies = int((recent4["close"] > recent4["open"]).sum())
        bear_bodies = int((recent4["close"] < recent4["open"]).sum())
        higher_close_count = int((close_deltas > 0).sum())
        lower_close_count = int((close_deltas < 0).sum())
        higher_low_count = int((low_deltas > 0).sum())
        lower_high_count = int((high_deltas < 0).sum())
        net_move = float(recent4["close"].iloc[-1] - recent4["close"].iloc[0])
        displacement_threshold = max(avg_range * 0.75, close_price * 0.0025)

        if timing_bias == "bullish":
            if (
                acceptance_state == "rejected_at_level"
                or close_price < lower_ref - range_buffer
                or (lower_close_count >= 2 and bear_bodies >= 2 and net_move < 0)
            ):
                follow_through_state = "failing"
            elif (
                acceptance_state in {"reclaimed_level", "accepted_above_level"}
                and higher_close_count >= 2
                and higher_low_count >= 2
                and bull_bodies >= 2
                and bullish_closes_recent >= 2
                and net_move >= displacement_threshold
            ):
                follow_through_state = "strong"
            elif (
                acceptance_state in {"reclaimed_level", "accepted_above_level", "inside_noise"}
                and net_move >= 0
                and bullish_closes_recent >= 2
                and bull_bodies >= 1
            ):
                follow_through_state = "adequate"
            else:
                follow_through_state = "weak"
        elif timing_bias == "bearish":
            if (
                acceptance_state == "reclaimed_level"
                or close_price > upper_ref + range_buffer
                or (higher_close_count >= 2 and bull_bodies >= 2 and net_move > 0)
            ):
                follow_through_state = "failing"
            elif (
                acceptance_state in {"rejected_at_level", "accepted_below_level"}
                and lower_close_count >= 2
                and lower_high_count >= 2
                and bear_bodies >= 2
                and bearish_closes_recent >= 2
                and abs(net_move) >= displacement_threshold
            ):
                follow_through_state = "strong"
            elif (
                acceptance_state in {"rejected_at_level", "accepted_below_level", "inside_noise"}
                and net_move <= 0
                and bearish_closes_recent >= 2
                and bear_bodies >= 1
            ):
                follow_through_state = "adequate"
            else:
                follow_through_state = "weak"
        elif acceptance_state in {"reclaimed_level", "rejected_at_level"}:
            follow_through_state = (
                "adequate" if abs(net_move) >= avg_range * 0.35 else "weak"
            )
        else:
            follow_through_state = "weak"
    else:
        follow_through_state = "unclear"

    if liquidity["timing_authority"] == "wait_only":
        timing_window_state = "unclear"
    elif liquidity["timing_authority"] == "daily_only":
        timing_window_state = "developing"
    elif follow_through_state == "failing":
        timing_window_state = "stale"
    elif (
        intraday_structure_state == "aligned"
        and acceptance_state in {"reclaimed_level", "accepted_above_level"}
        and follow_through_state in {"strong", "adequate"}
    ):
        timing_window_state = "active"
    elif intraday_structure_state == "aligned" and follow_through_state == "weak":
        timing_window_state = "late"
    else:
        timing_window_state = "developing"

    return {
        "timing_bias": timing_bias,
        "intraday_structure_state": intraday_structure_state,
        "acceptance_state": acceptance_state,
        "follow_through_state": follow_through_state,
        "timing_window_state": timing_window_state,
        "liquidity_quality_state": str(liquidity["liquidity_quality_state"]),
        "timing_authority": str(liquidity["timing_authority"]),
        "raw_participation_quality": str(participation["raw_participation_quality"]),
        "intraday_quality_summary": (
            f"{liquidity['summary']}|{participation['summary']}|"
            f"acceptance_{acceptance_state}|follow_{follow_through_state}|window_{timing_window_state}"
        ),
    }


def build_disabled_intraday_timing(mode: str = "daily_only") -> dict[str, Any]:
    return {
        "timing_bias": "not_evaluated",
        "intraday_structure_state": "not_evaluated",
        "acceptance_state": "not_evaluated",
        "follow_through_state": "not_evaluated",
        "timing_window_state": "not_evaluated",
        "liquidity_quality_state": "not_evaluated",
        "timing_authority": mode,
        "raw_participation_quality": "not_evaluated",
        "intraday_quality_summary": f"{mode}_intraday_skipped",
    }


def latest_structure_event_payload(events: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not events:
        return None
    event = events[-1]
    return {
        "event_type": str(event["label"]),
        "side": str(event["side"]),
        "level": float(event["broken_level"]),
        "timestamp": str(event["datetime"]),
        "relevance": "confirmation" if str(event["label"]) == "BOS" else "warning",
    }


def breakout_quality_payload(
    breakout: dict[str, Any], regime: str, displacement: str | None
) -> dict[str, Any]:
    raw_status = str(breakout.get("status", "no_breakout"))
    if raw_status == "valid_breakout":
        status = "clean" if displacement == "clean_displacement" else "adequate"
    elif raw_status == "failed_breakout":
        status = "failed"
    else:
        status = "stalling"
    return {
        "status": status,
        "trigger_vol_ratio": breakout.get("trigger_vol_ratio"),
        "follow_through_close": breakout.get("follow_close"),
        "base_quality": "strong" if raw_status == "valid_breakout" else "weak",
        "market_context": "supportive" if regime == "trend_continuation" else "neutral",
    }


def evaluate_range_edge_behavior(
    *,
    location_state: str,
    supports: list[dict[str, Any]],
    resistances: list[dict[str, Any]],
    intraday_timing: dict[str, Any],
    last_open: float,
    last_high: float,
    last_low: float,
    last_close: float,
    prev_close: float | None,
) -> dict[str, Any]:
    support_zone = supports[0] if supports else None
    resistance_zone = resistances[0] if resistances else None
    if location_state != "at_range_edge" or support_zone is None or resistance_zone is None:
        return {
            "edge_side": "none",
            "trigger_state": "not_triggered",
            "confirmation_state": "not_applicable",
            "participation_quality": "adequate",
            "edge_to_edge_path": False,
            "trigger_level": None,
        }

    support_high = float(support_zone["high"])
    support_mid = float(support_zone["mid"])
    resistance_low = float(resistance_zone["low"])
    resistance_mid = float(resistance_zone["mid"])
    near_support = last_low <= support_high or near_zone(last_close, support_zone, pct=0.015)
    near_resistance = last_high >= resistance_low or near_zone(last_close, resistance_zone, pct=0.015)

    acceptance_state = str(intraday_timing.get("acceptance_state", "unclear"))
    follow_state = str(intraday_timing.get("follow_through_state", "unclear"))
    participation = str(intraday_timing.get("raw_participation_quality", "adequate"))

    support_reclaim = (
        near_support
        and last_close >= support_mid
        and (
            last_close > last_open
            or (prev_close is not None and last_close > prev_close)
        )
    )
    support_accepted = acceptance_state in {"reclaimed_level", "accepted_above_level"}
    follow_ok = follow_state in {"strong", "adequate"}
    edge_to_edge_path = resistance_mid > support_mid

    if support_reclaim and support_accepted and follow_ok and edge_to_edge_path:
        return {
            "edge_side": "lower",
            "trigger_state": "triggered",
            "confirmation_state": "confirmed",
            "participation_quality": "strong" if participation == "strong" else "adequate",
            "edge_to_edge_path": True,
            "trigger_level": support_mid,
        }

    if near_support and edge_to_edge_path:
        return {
            "edge_side": "lower",
            "trigger_state": "watchlist_only",
            "confirmation_state": "mixed",
            "participation_quality": "adequate",
            "edge_to_edge_path": True,
            "trigger_level": support_mid,
        }

    upper_edge_rejection = (
        near_resistance
        and last_close <= resistance_mid
        and (
            last_close < last_open
            or (prev_close is not None and last_close < prev_close)
        )
    )
    if upper_edge_rejection:
        return {
            "edge_side": "upper",
            "trigger_state": "failed",
            "confirmation_state": "rejected",
            "participation_quality": "contradictory",
            "edge_to_edge_path": False,
            "trigger_level": resistance_mid,
        }

    if near_resistance:
        return {
            "edge_side": "upper",
            "trigger_state": "watchlist_only",
            "confirmation_state": "mixed",
            "participation_quality": "weak",
            "edge_to_edge_path": False,
            "trigger_level": resistance_mid,
        }

    return {
        "edge_side": "none",
        "trigger_state": "not_triggered",
        "confirmation_state": "not_applicable",
        "participation_quality": "adequate",
        "edge_to_edge_path": False,
        "trigger_level": None,
    }


def build_trigger_confirmation(
    setup_id: str,
    breakout: dict[str, Any],
    raw_structure_status: str,
    spring: dict[str, Any],
    events: list[dict[str, Any]],
    regime: str,
    value_acceptance_state: str,
    displacement: str | None,
    intraday_timing: dict[str, Any],
    location_state: str,
    supports: list[dict[str, Any]],
    resistances: list[dict[str, Any]],
    last_open: float,
    last_high: float,
    last_low: float,
    last_close: float,
    prev_close: float | None,
    ema21: float,
    latest_event_age_bars: int | None,
) -> dict[str, Any]:
    trigger_state = "not_triggered"
    trigger_type = "none"
    trigger_level = None
    trigger_ts = None
    confirmation_state = "not_applicable"
    participation_quality = "adequate"

    if setup_id == "S1":
        trigger_type = "breakout_close"
        trigger_level = breakout.get("up_level")
        trigger_ts = breakout.get("trigger_dt")
        if breakout.get("status") == "valid_breakout":
            trigger_state = "triggered"
            confirmation_state = "confirmed"
            participation_quality = "strong"
        elif breakout.get("status") == "failed_breakout":
            trigger_state = "failed"
            confirmation_state = "rejected"
            participation_quality = "contradictory"
        else:
            trigger_state = "watchlist_only"
            confirmation_state = "mixed"
            participation_quality = "weak"
    elif setup_id == "S2":
        trigger_type = "retest_hold"
        nearest_support = supports[0] if supports else None
        support_mid = (
            float(nearest_support["mid"]) if nearest_support is not None else None
        )
        support_high = (
            float(nearest_support["high"]) if nearest_support is not None else None
        )
        support_touch = bool(
            nearest_support is not None
            and (
                last_low <= max(support_high or last_low, ema21 * 1.01)
                or location_state == "near_support_in_bullish_structure"
            )
        )
        reclaimed_support = bool(
            support_mid is not None
            and last_close >= max(support_mid, ema21)
            and (
                last_close > last_open
                or (prev_close is not None and last_close > prev_close)
            )
        )
        breakout_failed = breakout.get("status") == "failed_breakout"
        if (
            regime == "trend_continuation"
            and support_touch
            and reclaimed_support
            and not breakout_failed
        ):
            trigger_state = "triggered"
            confirmation_state = "confirmed"
        elif regime == "trend_continuation" and (
            support_touch or location_state == "near_support_in_bullish_structure"
        ):
            trigger_state = "watchlist_only"
            confirmation_state = "mixed"
        else:
            trigger_state = "not_triggered"
            confirmation_state = "not_applicable"
    elif setup_id == "S3":
        trigger_type = "choch_bos_reversal"
        latest = latest_structure_event_payload(events)
        trigger_level = latest["level"] if latest else None
        trigger_ts = latest["timestamp"] if latest else None
        if trigger_level is None:
            trigger_type = "none"
        if latest_event_age_bars is not None and latest_event_age_bars > 5:
            trigger_state = "not_triggered"
            confirmation_state = "not_applicable"
        elif raw_structure_status == "choch_plus_bos_confirmed":
            trigger_state = "triggered"
            confirmation_state = "confirmed"
            participation_quality = "adequate"
        elif raw_structure_status == "choch_only":
            trigger_state = "watchlist_only"
            confirmation_state = "mixed"
        else:
            trigger_state = "not_triggered"
    elif setup_id == "S4":
        trigger_type = "range_edge_rejection"
        range_edge = evaluate_range_edge_behavior(
            location_state=location_state,
            supports=supports,
            resistances=resistances,
            intraday_timing=intraday_timing,
            last_open=last_open,
            last_high=last_high,
            last_low=last_low,
            last_close=last_close,
            prev_close=prev_close,
        )
        trigger_state = str(range_edge["trigger_state"])
        confirmation_state = str(range_edge["confirmation_state"])
        participation_quality = str(range_edge["participation_quality"])
        trigger_level = range_edge.get("trigger_level")
        if trigger_level is None:
            trigger_type = "none"
    elif setup_id == "S5":
        trigger_type = "spring_reclaim"
        trigger_level = spring.get("support_level")
        trigger_ts = spring.get("support_datetime")
        if trigger_level is None:
            trigger_type = "none"
        if spring.get("detected"):
            trigger_state = "triggered"
            confirmation_state = "confirmed"
            participation_quality = "adequate"
        else:
            trigger_state = "watchlist_only"
            confirmation_state = "mixed"

    timing_authority = str(intraday_timing.get("timing_authority", "full_15m"))
    raw_participation = str(
        intraday_timing.get("raw_participation_quality", "adequate")
    )
    if participation_quality != "contradictory":
        if raw_participation == "weak":
            participation_quality = "weak"
        elif raw_participation == "adequate" and participation_quality == "strong":
            participation_quality = "adequate"

    if timing_authority == "wait_only" and trigger_state == "triggered":
        trigger_state = "watchlist_only"
        confirmation_state = "mixed"
        if participation_quality != "contradictory":
            participation_quality = "weak"

    out: dict[str, Any] = {
        "trigger_state": trigger_state,
        "trigger_type": trigger_type,
        "confirmation_state": confirmation_state,
        "participation_quality": participation_quality,
        "value_acceptance_state": value_acceptance_state,
        "timing_authority": timing_authority,
    }
    if trigger_level is not None:
        out["trigger_level"] = float(trigger_level)
    if trigger_ts is not None:
        out["trigger_ts"] = str(trigger_ts)
    latest_event = latest_structure_event_payload(events)
    if latest_event is not None:
        out["latest_structure_event"] = latest_event
    if setup_id == "S1" and breakout:
        out["breakout_quality"] = breakout_quality_payload(
            breakout, regime, displacement
        )
    return out


def zone_width(zone: dict[str, Any]) -> float:
    return max(float(zone["high"]) - float(zone["low"]), 0.0)


def synthetic_breakout_zone(
    breakout_level: float,
    atr14: float,
    fallback_zone: dict[str, Any] | None,
) -> dict[str, Any]:
    if fallback_zone is not None:
        fallback_low = float(fallback_zone["low"])
        fallback_high = float(fallback_zone["high"])
        if fallback_low <= breakout_level <= fallback_high:
            return fallback_zone

    half_width = max(
        float(atr14) * 0.3 if atr14 > 0 else 0.0,
        breakout_level * 0.005,
        zone_width(fallback_zone) * 0.35 if fallback_zone is not None else 0.0,
    )
    low = breakout_level - half_width
    high = breakout_level + half_width
    return {
        "label": "breakout_retest",
        "kind": "support",
        "low": float(low),
        "high": float(high),
        "mid": float(breakout_level),
        "timeframe": "1d",
        "strength": (
            str(fallback_zone.get("strength", "moderate"))
            if fallback_zone is not None
            else "moderate"
        ),
        "source": (
            str(fallback_zone.get("source", "horizontal"))
            if fallback_zone is not None
            else "horizontal"
        ),
    }


def build_structural_risk_plan(
    *,
    position_state: str,
    close_price: float,
    atr14: float,
    entry_zone: dict[str, Any],
    resistances: list[dict[str, Any]],
    min_rr_required: float,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "actionable": False,
        "min_rr_required": float(min_rr_required),
        "risk_status": "wait",
        "stale_setup_condition": "no_trigger_within_5_trading_days",
    }

    entry = max(close_price, float(entry_zone["mid"]))
    zone_low = float(entry_zone["low"])
    current_zone_width = zone_width(entry_zone)
    stop_buffer = max(
        float(atr14) * 0.75 if atr14 > 0 else 0.0,
        entry * 0.015,
        current_zone_width * 0.5,
    )
    invalidation_level = min(zone_low, entry - stop_buffer)
    stop_level = invalidation_level
    if entry <= stop_level:
        result["risk_status"] = "no_clear_invalidation"
        return result

    targets = [float(zone["mid"]) for zone in resistances if float(zone["mid"]) > entry]
    rr_by_target = [
        round((target - entry) / (entry - stop_level), 2)
        for target in targets
    ]
    if not rr_by_target:
        result["risk_status"] = "no_clear_path"
        return result

    best_rr = max(rr_by_target)
    risk_status = "valid" if best_rr >= min_rr_required else "insufficient_rr"
    result.update(
        {
            "entry_zone": entry_zone,
            "invalidation_level": invalidation_level,
            "stop_level": stop_level,
            "next_zone_target": targets[0],
            "target_ladder": targets,
            "rr_by_target": rr_by_target,
            "best_rr": best_rr,
            "risk_status": risk_status,
            "actionable": bool(position_state == "flat" and risk_status == "valid"),
        }
    )
    return result


def build_risk_map(
    setup_id: str,
    position_state: str,
    close_price: float,
    atr14: float,
    location_state: str,
    supports: list[dict[str, Any]],
    resistances: list[dict[str, Any]],
    min_rr_required: float,
    breakout: dict[str, Any] | None = None,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "actionable": False,
        "min_rr_required": float(min_rr_required),
        "risk_status": "wait",
        "stale_setup_condition": "no_trigger_within_5_trading_days",
    }
    if setup_id == "NO_VALID_SETUP":
        return result
    if not is_meaningful_location(location_state):
        result["risk_status"] = "poor_location"
        return result
    if setup_id != "S1" and not supports:
        result["risk_status"] = "no_clear_invalidation"
        return result
    if not resistances:
        result["risk_status"] = "no_clear_path"
        return result

    entry_zone = supports[0] if supports else None
    if setup_id == "S1":
        breakout_level = (
            float(breakout["up_level"])
            if breakout is not None and breakout.get("up_level") is not None
            else None
        )
        if breakout_level is None:
            result["risk_status"] = "no_clear_invalidation"
            return result
        entry_zone = synthetic_breakout_zone(
            breakout_level=breakout_level,
            atr14=atr14,
            fallback_zone=supports[0] if supports else None,
        )
        extension_limit = max(
            float(atr14) * 0.75 if atr14 > 0 else 0.0,
            close_price * 0.02,
            zone_width(entry_zone) * 1.25,
        )
        if close_price - float(entry_zone["high"]) > extension_limit:
            result["entry_zone"] = entry_zone
            result["risk_status"] = "poor_location"
            return result
    elif entry_zone is None:
        result["risk_status"] = "no_clear_invalidation"
        return result

    return build_structural_risk_plan(
        position_state=position_state,
        close_price=close_price,
        atr14=atr14,
        entry_zone=entry_zone,
        resistances=resistances,
        min_rr_required=min_rr_required,
    )
