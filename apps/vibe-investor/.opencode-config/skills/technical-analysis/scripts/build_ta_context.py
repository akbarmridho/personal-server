#!/usr/bin/env python3
# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportAttributeAccessIssue=false

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ta_common import (
    add_intraday_context,
    add_atr14,
    add_ma_stack,
    add_swings,
    add_volume_features,
    classify_price_volume,
    classify_regime,
    choose_adaptive_ma,
    cluster_levels,
    derive_levels,
    detect_structure_events,
    detect_trendline_levels,
    detect_wyckoff_spring,
    liquidity_draws,
    liquidity_path_after_event,
    pick_draw_targets,
    profile_from_range,
    summarize_intraday_liquidity,
    summarize_intraday_participation,
    structure_status,
    sweep_outcome,
    value_area_from_hist,
)
from wyckoff_state import build_wyckoff_state


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build deterministic technical-analysis context from OHLCV JSON."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Input JSON path (must match fetch-ohlcv output_path).",
    )
    parser.add_argument("--symbol", required=True, help="Ticker symbol, e.g. BBCA.")
    parser.add_argument("--outdir", default="work", help="Output directory.")
    parser.add_argument(
        "--output", default=None, help="Optional explicit output JSON path."
    )
    parser.add_argument(
        "--modules",
        default="core",
        help="Comma-separated modules: core,vpvr,breakout or all.",
    )
    parser.add_argument(
        "--purpose-mode",
        choices=["INITIAL", "UPDATE", "POSTMORTEM"],
        default="INITIAL",
        help="Runtime purpose mode.",
    )
    parser.add_argument(
        "--position-state",
        choices=["flat", "long"],
        default="flat",
        help="Current position state.",
    )
    parser.add_argument(
        "--min-rr-required",
        type=float,
        default=1.2,
        help="Minimum reward-to-risk required for an actionable plan.",
    )
    parser.add_argument(
        "--prior-thesis-json",
        default=None,
        help="Optional JSON file for prior thesis context. Required for UPDATE and POSTMORTEM.",
    )
    parser.add_argument(
        "--thesis-status",
        choices=["intact", "improving", "degrading", "invalidated"],
        default=None,
        help="Required when purpose-mode is UPDATE.",
    )
    parser.add_argument(
        "--review-reason",
        choices=[
            "routine",
            "contradiction",
            "level_break",
            "regime_change",
            "trigger_failure",
        ],
        default=None,
        help="Required when purpose-mode is UPDATE.",
    )
    parser.add_argument(
        "--swing-n", type=int, default=2, help="Swing pivot lookback (default 2)."
    )
    return parser.parse_args()


def parse_modules(raw: str) -> set[str]:
    out = {x.strip().lower() for x in raw.split(",") if x.strip()}
    if not out:
        out = {"core"}
    if "all" in out:
        return {"core", "vpvr", "breakout"}
    out.add("core")
    return out


# ---------------------------------------------------------------------------
# State / regime helpers
# ---------------------------------------------------------------------------


def infer_state(
    last_close: float,
    value_low: float,
    value_high: float,
    follow_close: float | None = None,
) -> tuple[str, str]:
    outside = (last_close > value_high) or (last_close < value_low)
    if not outside:
        return "balance", "inside_value_area"
    if follow_close is None:
        return "imbalance", "outside_value_area_unconfirmed"
    if last_close > value_high and follow_close >= value_high:
        return "imbalance", "accepted_above_value"
    if last_close < value_low and follow_close <= value_low:
        return "imbalance", "accepted_below_value"
    return "balance", "failed_acceptance_back_inside"


# ---------------------------------------------------------------------------
# Level helpers
# ---------------------------------------------------------------------------


def role_reversal(last_close: float, level: float, was_support: bool) -> str:
    if was_support and last_close < level:
        return "support_broken_may_flip_to_resistance"
    if (not was_support) and last_close > level:
        return "resistance_broken_may_flip_to_support"
    return "no_flip_signal"


def ma_posture(row: pd.Series) -> dict[str, bool]:
    c = float(row["close"])
    return {
        "above_ema21": c >= float(row.get("EMA21", c)),
        "above_sma50": c >= float(row.get("SMA50", c)),
        "above_sma200": c >= float(row.get("SMA200", c)),
    }


def time_based_opens(df_daily: pd.DataFrame) -> dict[str, Any]:
    x = df_daily.copy()
    latest = x.iloc[-1]
    d_open = float(
        x[x["datetime"].dt.date == latest["datetime"].date()].iloc[0]["open"]
    )
    week_key = latest["datetime"].isocalendar().week
    w = x[x["datetime"].dt.isocalendar().week == week_key]
    month_key = latest["datetime"].to_period("M")
    m = x[x["datetime"].dt.to_period("M") == month_key]
    return {
        "daily_open": d_open,
        "weekly_open": float(w.iloc[0]["open"]) if len(w) > 0 else None,
        "monthly_open": float(m.iloc[0]["open"]) if len(m) > 0 else None,
    }


def nearest_round_levels(price: float, step: float = 100.0) -> dict[str, float]:
    base = round(price / step) * step
    return {
        "round_below": float(base - step),
        "round_at": float(base),
        "round_above": float(base + step),
    }


# ---------------------------------------------------------------------------
# Volume profile helpers
# ---------------------------------------------------------------------------


def acceptance_vs_value(
    close_price: float, vah: float, val: float, prev_close: float | None = None
) -> str:
    if close_price > vah:
        if prev_close is not None and prev_close >= vah:
            return "accepted_above_vah"
        return "probe_above_vah"
    if close_price < val:
        if prev_close is not None and prev_close <= val:
            return "accepted_below_val"
        return "probe_below_val"
    return "inside_value"


def vpvr_core(df: pd.DataFrame, bins: int = 40) -> dict[str, Any]:
    return profile_from_range(df, bins=bins)


def anchored_profile(
    df_daily: pd.DataFrame, trend_bias: str, max_bars: int = 260
) -> dict[str, Any]:
    x = df_daily.tail(max_bars).copy()
    lows = x[x["swing_low"].notna()]
    highs = x[x["swing_high"].notna()]
    if trend_bias == "bearish" and len(highs) > 0:
        anchor = highs.iloc[-1]
        anchor_type = "swing_high"
    elif len(lows) > 0:
        anchor = lows.iloc[-1]
        anchor_type = "swing_low"
    else:
        anchor = x.iloc[0]
        anchor_type = "range_start"
    anchor_dt = pd.Timestamp(anchor["datetime"])
    rng = x[x["datetime"] >= anchor_dt]
    if len(rng) < 20:
        rng = x
    prof = profile_from_range(rng, bins=35)
    return {
        "mode": "anchored",
        "anchor_type": anchor_type,
        "anchor_datetime": str(anchor_dt),
        "anchor_end": str(x["datetime"].iloc[-1]),
        **prof,
    }


# ---------------------------------------------------------------------------
# Breakout
# ---------------------------------------------------------------------------


def breakout_snapshot(df: pd.DataFrame, levels: list[dict[str, Any]]) -> dict[str, Any]:
    x = add_volume_features(df).tail(10).reset_index(drop=True)
    if len(x) < 2:
        return {"status": "insufficient_data"}
    last_close = float(x.iloc[-1]["close"])
    mids = sorted([float(z["zone_mid"]) for z in levels])
    above = [v for v in mids if v > last_close]
    below = [v for v in mids if v < last_close]
    up_level = above[0] if above else None
    dn_level = below[-1] if below else None
    trig = x.iloc[-2]
    foll = x.iloc[-1]

    status = "no_breakout"
    side = None
    level = None
    if up_level is not None and float(trig["close"]) > up_level:
        side = "up"
        level = float(up_level)
    elif dn_level is not None and float(trig["close"]) < dn_level:
        side = "down"
        level = float(dn_level)

    if side is not None and level is not None:
        status, proof = breakout_quality(df, level=level, side=side)
    else:
        proof = {
            "trigger_dt": str(trig["datetime"]),
            "trigger_close": float(trig["close"]),
            "follow_dt": str(foll["datetime"]),
            "follow_close": float(foll["close"]),
            "trigger_vol_ratio": float(trig["vol_ratio"])
            if pd.notna(trig["vol_ratio"])
            else None,
        }

    return {
        "status": status,
        "side": side,
        "up_level": up_level,
        "down_level": dn_level,
        "trigger_dt": proof["trigger_dt"],
        "trigger_close": proof["trigger_close"],
        "follow_dt": proof["follow_dt"],
        "follow_close": proof["follow_close"],
        "trigger_vol_ratio": proof["trigger_vol_ratio"],
    }


def breakout_quality(
    df: pd.DataFrame, level: float, side: str
) -> tuple[str, dict[str, Any]]:
    x = add_volume_features(df).tail(10).reset_index(drop=True)
    if len(x) < 2:
        return "no_breakout", {"reason": "insufficient_data"}
    trig = x.iloc[-2]
    foll = x.iloc[-1]
    if side == "up":
        trigger = float(trig["close"]) > level
        follow = float(foll["close"]) >= level
    else:
        trigger = float(trig["close"]) < level
        follow = float(foll["close"]) <= level
    vol_ok = pd.notna(trig["vol_ratio"]) and float(trig["vol_ratio"]) >= 1.2
    if trigger and follow and vol_ok:
        quality = "valid_breakout"
    elif trigger and not follow:
        quality = "failed_breakout"
    else:
        quality = "no_breakout"
    proof = {
        "trigger_dt": str(trig["datetime"]),
        "trigger_close": float(trig["close"]),
        "follow_dt": str(foll["datetime"]),
        "follow_close": float(foll["close"]),
        "trigger_vol_ratio": float(trig["vol_ratio"])
        if pd.notna(trig["vol_ratio"])
        else None,
    }
    return quality, proof


def breakout_displacement(df: pd.DataFrame, level: float, side: str) -> str:
    x = add_volume_features(df).tail(5).reset_index(drop=True)
    if len(x) < 2:
        return "stalling"
    trig = x.iloc[-2]
    atr = (
        float(trig["ATR14"])
        if "ATR14" in trig.index and pd.notna(trig.get("ATR14"))
        else 0.0
    )
    if atr <= 0:
        return "stalling"
    candle_range = abs(float(trig["close"]) - float(trig["open"]))
    if candle_range >= atr * 0.8:
        return "clean_displacement"
    return "stalling"


# ---------------------------------------------------------------------------
# Setup selection and pattern detection
# ---------------------------------------------------------------------------


def base_quality(
    window: pd.DataFrame, min_weeks: int = 7, max_depth: float = 0.35
) -> dict[str, Any]:
    n_days = len(window)
    weeks = n_days / 5.0
    hi = float(window["high"].max())
    lo = float(window["low"].min())
    depth = (hi - lo) / hi if hi > 0 else 0.0
    too_short = weeks < min_weeks
    too_deep = depth > max_depth
    status = "weak" if (too_short or too_deep) else "ok"
    return {
        "weeks": float(weeks),
        "depth": float(depth),
        "too_short": bool(too_short),
        "too_deep": bool(too_deep),
        "status": status,
    }


def choose_setup(
    regime: str,
    breakout_state: str,
    structure_state: str = "no_signal",
    spring_confirmed: bool = False,
) -> str:
    if structure_state == "choch_plus_bos_confirmed":
        return "S3"
    if structure_state == "choch_only":
        return "NO_VALID_SETUP"
    if spring_confirmed:
        return "S5"
    if regime == "trend_continuation" and breakout_state == "valid_breakout":
        return "S1"
    if regime == "trend_continuation":
        return "S2"
    if regime == "potential_reversal":
        return "S3"
    if regime == "range_rotation":
        return "S4"
    return "NO_VALID_SETUP"


def build_intent(purpose_mode: str, position_state: str) -> str:
    if purpose_mode == "POSTMORTEM":
        return "postmortem"
    if position_state == "long":
        return "maintenance"
    return "entry"


def normalize_structure_status(
    raw_status: str, regime: str, trend_bias: str
) -> str:
    if raw_status == "choch_only":
        return "transitioning"
    if raw_status == "choch_plus_bos_confirmed":
        return "transitioning"
    if regime == "potential_reversal":
        return "damaged"
    if regime == "trend_continuation" and trend_bias in {"bullish", "bearish"}:
        return "trend_intact"
    if regime == "range_rotation":
        return "range_intact"
    if regime == "no_trade":
        return "unclear"
    return "unclear"


def ma_role(close_price: float, ma_value: float | None, tol: float = 0.03) -> str:
    if ma_value is None or pd.isna(ma_value):
        return "noise"
    if abs(close_price - float(ma_value)) / max(abs(close_price), 1e-9) > tol:
        return "noise"
    return "support" if close_price >= float(ma_value) else "resistance"


def baseline_ma_payload(row: pd.Series) -> dict[str, Any]:
    close_price = float(row["close"])
    ema21 = float(row.get("EMA21", close_price))
    sma50 = float(row.get("SMA50", close_price))
    sma200 = float(row.get("SMA200", close_price))
    posture = ma_posture(row)
    posture["ema21_role"] = ma_role(close_price, ema21)
    posture["sma50_role"] = ma_role(close_price, sma50)
    posture["sma200_role"] = ma_role(close_price, sma200)
    return posture


def zone_strength(value: str) -> str:
    if value in {"strong_first_test", "strong"}:
        return "strong"
    if value == "weakening":
        return "moderate"
    return "weak"


def zone_payload(
    level: dict[str, Any],
    label: str,
    kind: str,
    source: str = "horizontal",
    timeframe: str = "1d",
) -> dict[str, Any]:
    return {
        "label": label,
        "kind": kind,
        "low": float(level["zone_low"]),
        "high": float(level["zone_high"]),
        "mid": float(level["zone_mid"]),
        "timeframe": timeframe,
        "strength": zone_strength(str(level.get("strength", ""))),
        "source": source,
    }


def split_support_resistance(
    levels: list[dict[str, Any]], last_close: float
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    supports = [
        zone_payload(z, f"support_{i+1}", "support")
        for i, z in enumerate(
            sorted(
                [lvl for lvl in levels if float(lvl["zone_mid"]) <= last_close],
                key=lambda x: float(x["zone_mid"]),
                reverse=True,
            )[:4]
        )
    ]
    resistances = [
        zone_payload(z, f"resistance_{i+1}", "resistance")
        for i, z in enumerate(
            sorted(
                [lvl for lvl in levels if float(lvl["zone_mid"]) > last_close],
                key=lambda x: float(x["zone_mid"]),
            )[:4]
        )
    ]
    return supports, resistances


def round_level_payload(round_levels: dict[str, float]) -> list[dict[str, Any]]:
    return [
        {"price": float(price), "label": label}
        for label, price in round_levels.items()
    ]


def build_value_area(
    vp: dict[str, Any], close_price: float, prev_close: float | None
) -> dict[str, Any]:
    vah = float(vp["vah"]) if vp.get("vah") is not None else close_price
    val = float(vp["val"]) if vp.get("val") is not None else close_price
    return {
        "poc": float(vp["poc"]) if vp.get("poc") is not None else close_price,
        "vah": vah,
        "val": val,
        "acceptance_state": acceptance_vs_value(
            close_price,
            vah,
            val,
            prev_close=prev_close,
        ),
        "major_hvn": [float(x) for x in vp.get("hvn_top3", [])],
        "major_lvn": [float(x) for x in vp.get("lvn_top3", [])],
    }


def near_zone(close_price: float, zone: dict[str, Any], pct: float = 0.025) -> bool:
    mid = float(zone["mid"])
    return abs(close_price - mid) / max(abs(close_price), 1e-9) <= pct


def infer_location_state(
    close_price: float,
    trend_bias: str,
    regime: str,
    supports: list[dict[str, Any]],
    resistances: list[dict[str, Any]],
) -> str:
    nearest_support = supports[0] if supports else None
    nearest_resistance = resistances[0] if resistances else None
    if regime == "range_rotation":
        if nearest_support and near_zone(close_price, nearest_support):
            return "at_range_edge"
        if nearest_resistance and near_zone(close_price, nearest_resistance):
            return "at_range_edge"
    if trend_bias == "bullish" and nearest_support and near_zone(close_price, nearest_support):
        return "near_support_in_bullish_structure"
    if trend_bias == "bearish" and nearest_resistance and near_zone(close_price, nearest_resistance):
        return "near_resistance_in_bearish_structure"
    if nearest_resistance and close_price > float(nearest_resistance["high"]):
        return "accepted_above_resistance"
    if nearest_support and close_price < float(nearest_support["low"]):
        return "accepted_below_support"
    return "mid_range_noise"


def build_intraday_timing(
    intraday_15m: pd.DataFrame, intraday_1m: pd.DataFrame, daily_bias: str
) -> dict[str, Any]:
    x = add_intraday_context(intraday_15m)
    liquidity = summarize_intraday_liquidity(intraday_1m)
    participation = summarize_intraday_participation(intraday_1m)
    last = x.iloc[-1]
    prev = x.iloc[-2] if len(x) > 1 else last
    close_price = float(last["close"])
    ema9 = float(last.get("EMA9", close_price))
    ema20 = float(last.get("EMA20", close_price))
    vwap = float(last.get("VWAP", close_price))

    if close_price >= ema9 and close_price >= vwap:
        timing_bias = "bullish"
    elif close_price <= ema9 and close_price <= vwap:
        timing_bias = "bearish"
    else:
        timing_bias = "neutral"

    if daily_bias == "neutral" or timing_bias == "neutral":
        intraday_structure_state = "conflicted"
    elif timing_bias == daily_bias:
        intraday_structure_state = "aligned"
    else:
        intraday_structure_state = "counter_thesis"

    if len(x) < 2:
        acceptance_state = "unclear"
    elif close_price >= ema20 and float(prev["close"]) < ema20:
        acceptance_state = "reclaimed_level"
    elif close_price < ema20 and float(prev["close"]) >= ema20:
        acceptance_state = "rejected_at_level"
    elif close_price >= ema20 and close_price >= vwap:
        acceptance_state = "accepted_above_level"
    elif close_price <= ema20 and close_price <= vwap:
        acceptance_state = "accepted_below_level"
    else:
        acceptance_state = "inside_noise"

    if len(x) >= 3:
        recent = x.tail(3)["close"]
        if recent.is_monotonic_increasing:
            follow_through_state = "strong"
        elif recent.is_monotonic_decreasing:
            follow_through_state = "failing" if timing_bias == "bullish" else "strong"
        else:
            follow_through_state = "adequate"
    else:
        follow_through_state = "unclear"

    if liquidity["timing_authority"] == "wait_only":
        timing_window_state = "unclear"
    elif liquidity["timing_authority"] == "daily_only":
        timing_window_state = "developing"
    else:
        timing_window_state = (
            "active"
            if intraday_structure_state == "aligned"
            and follow_through_state in {"strong", "adequate"}
            else "developing"
        )

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
            f"{liquidity['summary']}|{participation['summary']}"
        ),
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
        trigger_state = "watchlist_only" if regime == "trend_continuation" else "not_triggered"
        confirmation_state = "mixed" if trigger_state == "watchlist_only" else "not_applicable"
    elif setup_id == "S3":
        trigger_type = "choch_bos_reversal"
        latest = latest_structure_event_payload(events)
        trigger_level = latest["level"] if latest else None
        trigger_ts = latest["timestamp"] if latest else None
        if raw_structure_status == "choch_plus_bos_confirmed":
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
        trigger_state = "watchlist_only"
        confirmation_state = "mixed"
    elif setup_id == "S5":
        trigger_type = "spring_reclaim"
        trigger_level = spring.get("support_level")
        trigger_ts = spring.get("support_datetime")
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
    if breakout:
        out["breakout_quality"] = breakout_quality_payload(breakout, regime, displacement)
    return out


def build_risk_map(
    setup_id: str,
    position_state: str,
    close_price: float,
    supports: list[dict[str, Any]],
    resistances: list[dict[str, Any]],
    min_rr_required: float,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "actionable": False,
        "min_rr_required": float(min_rr_required),
        "risk_status": "wait",
        "stale_setup_condition": "no_trigger_within_5_trading_days",
    }
    if setup_id == "NO_VALID_SETUP":
        return result
    if not supports:
        result["risk_status"] = "no_clear_invalidation"
        return result
    if not resistances:
        result["risk_status"] = "no_clear_path"
        return result

    entry_zone = supports[0]
    entry = float(entry_zone["mid"])
    invalidation_level = float(entry_zone["low"])
    stop_level = invalidation_level
    if entry <= stop_level:
        result["risk_status"] = "no_clear_invalidation"
        return result

    targets = [float(z["mid"]) for z in resistances]
    rr_by_target = [
        round((target - entry) / (entry - stop_level), 2)
        for target in targets
        if target > entry
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
            "actionable": bool(
                position_state == "flat" and risk_status == "valid"
            ),
        }
    )
    return result


def normalize_red_flags(red_flags: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "code": str(flag["flag_id"]),
            "severity": str(flag["severity"]).lower(),
            "summary": str(flag["why"]),
        }
        for flag in red_flags.get("flags", [])
    ]


def load_prior_thesis(path_str: str | None) -> dict[str, Any] | None:
    if not path_str:
        return None
    path = Path(path_str).expanduser().resolve()
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, dict):
        raise ValueError("prior thesis JSON must be an object")
    return raw


def count_distribution_days(df: pd.DataFrame, window: int = 20) -> dict[str, Any]:
    x = add_volume_features(df).tail(window)
    days = x[(x["ret"] < -0.03) & (x["vol_ratio"] > 1.2)]
    return {
        "count": int(len(days)),
        "dates": [str(d) for d in days["datetime"].tolist()]
        if "datetime" in days.columns
        else [],
    }


# ---------------------------------------------------------------------------
# Red flags
# ---------------------------------------------------------------------------


def detect_ma_whipsaw(
    df: pd.DataFrame,
    adaptive_period: int | None = None,
    lookback: int = 30,
) -> list[dict[str, Any]]:
    x = add_atr14(add_ma_stack(df)).tail(lookback).copy()
    if x.empty:
        return []

    ma_specs: list[tuple[str, str]] = [
        ("EMA21", "ema21"),
        ("SMA50", "sma50"),
    ]
    if adaptive_period is not None:
        adaptive_col = f"SMA{int(adaptive_period)}"
        if adaptive_col not in x.columns:
            x[adaptive_col] = x["close"].rolling(int(adaptive_period)).mean()
        ma_specs.append((adaptive_col, f"adaptive_sma{int(adaptive_period)}"))

    diagnostics: list[dict[str, Any]] = []
    for col, label in ma_specs:
        y = x.dropna(subset=[col]).copy()
        if len(y) < 12:
            continue
        band = y["ATR14"].fillna((y["high"] - y["low"]).rolling(5).mean()).fillna(
            (y["high"] - y["low"]).median()
        ) * 0.18
        dist = y["close"] - y[col]
        state = pd.Series(np.where(dist > band, 1, np.where(dist < -band, -1, 0)), index=y.index)
        state_ffill = state.replace(0, np.nan).ffill()
        cross_mask = (
            state_ffill.notna()
            & state_ffill.shift(1).notna()
            & (state_ffill != state_ffill.shift(1))
        )
        cross_count = int(cross_mask.sum())
        if cross_count == 0:
            continue

        cross_positions = np.flatnonzero(cross_mask.to_numpy())
        recent_cluster_count = 0
        for i in range(1, len(cross_positions)):
            if int(cross_positions[i] - cross_positions[i - 1]) <= 4:
                recent_cluster_count += 1
        last_state = int(state.iloc[-1])
        severity = None
        if cross_count >= 4 or recent_cluster_count >= 2:
            severity = "HIGH"
        elif cross_count >= 3 or recent_cluster_count >= 1:
            severity = "MEDIUM"
        if severity is None:
            continue
        diagnostics.append(
            {
                "flag_id": "F19_MA_WHIPSAW",
                "severity": severity,
                "why": (
                    f"{label}_cross_count_{cross_count}_cluster_count_{recent_cluster_count}"
                    f"_last_state_{last_state}"
                ),
            }
        )
    return diagnostics


def build_red_flags(
    regime: str,
    breakout_state: str,
    level_touches: int,
    structure_state: str,
    last_close: float,
    ema21: float,
    sma50: float,
    position_state: str,
    risk_status: str,
    distribution_day_count: int,
    breakout_displacement_state: str | None = None,
    ma_whipsaw_flags: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    flags: list[dict[str, Any]] = []
    if regime == "potential_reversal":
        flags.append(
            {
                "flag_id": "F1_STRUCTURE_BREAK",
                "severity": "HIGH",
                "why": "daily_structure_transitioning",
            }
        )
    if breakout_state == "failed_breakout":
        flags.append(
            {
                "flag_id": "F3_WEAK_BREAKOUT",
                "severity": "HIGH",
                "why": "breakout_failed_follow_through",
            }
        )
    if level_touches >= 4:
        flags.append(
            {
                "flag_id": "F4_LEVEL_EXHAUSTION",
                "severity": "MEDIUM",
                "why": "repeated_tests_reduce_level_reliability",
            }
        )
    if structure_state == "choch_only":
        flags.append(
            {
                "flag_id": "F9_UNCONFIRMED_STRUCTURE_SHIFT",
                "severity": "MEDIUM",
                "why": "choch_without_confirmation_bos",
            }
        )
    if last_close < ema21:
        flags.append(
            {
                "flag_id": "F6_MA_BREAKDOWN",
                "severity": "HIGH",
                "why": "price_below_ema21",
            }
        )
    if last_close < sma50:
        flags.append(
            {
                "flag_id": "F6_MA_BREAKDOWN",
                "severity": "CRITICAL",
                "why": "price_below_sma50",
            }
        )
    if position_state == "long" and (
        risk_status != "valid" or last_close < ema21 or last_close < sma50
    ):
        flags.append(
            {
                "flag_id": "F7_POSITION_RISK",
                "severity": "HIGH" if last_close < ema21 else "MEDIUM",
                "why": "open_position_under_technical_stress",
            }
        )
    if risk_status == "no_clear_path":
        flags.append(
            {
                "flag_id": "F11_NO_NEXT_ZONE_PATH",
                "severity": "MEDIUM",
                "why": "risk_map_missing_next_zone_target",
            }
        )
    if distribution_day_count >= 2:
        flags.append(
            {
                "flag_id": "F2_DISTRIBUTION",
                "severity": "HIGH",
                "why": f"{distribution_day_count}_distribution_days_detected",
            }
        )
    if breakout_state == "valid_breakout" and breakout_displacement_state == "stalling":
        flags.append(
            {
                "flag_id": "F13_BREAKOUT_STALLING",
                "severity": "MEDIUM",
                "why": "breakout_lacks_clean_displacement",
            }
        )
    for flag in ma_whipsaw_flags or []:
        add_flag(
            flags,
            str(flag["flag_id"]),
            str(flag["severity"]),
            str(flag["why"]),
        )
    severity_rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
    overall = "LOW"
    if flags:
        overall = max(flags, key=lambda f: severity_rank[f["severity"]])["severity"]
    return {"flags": flags, "overall_severity": overall}


def add_flag(
    flags: list[dict[str, Any]], flag_id: str, severity: str, why: str
) -> None:
    key = (flag_id, why)
    for f in flags:
        if (f.get("flag_id"), f.get("why")) == key:
            return
    flags.append({"flag_id": flag_id, "severity": severity, "why": why})


def nearest_support_distance_pct(
    last_close: float, levels: list[dict[str, Any]]
) -> float | None:
    supports = [
        float(z["zone_mid"]) for z in levels if float(z["zone_mid"]) < last_close
    ]
    if not supports:
        return None
    nearest = max(supports)
    return abs((last_close - nearest) / max(last_close, 1e-9))


def enrich_red_flags(
    red_flags: dict[str, Any],
    last_close: float,
    regime: str,
    levels: list[dict[str, Any]],
    modules: set[str],
    liquidity: dict[str, Any],
    vpvr: dict[str, Any] | None,
    breakout: dict[str, Any] | None,
) -> dict[str, Any]:
    flags: list[dict[str, Any]] = [dict(x) for x in red_flags.get("flags", [])]

    if breakout is not None:
        b_status = str(breakout.get("status", "no_breakout"))
        b_side = breakout.get("side")
        b_base = breakout.get("base_quality", {})
        if b_status == "valid_breakout" and regime in {
            "range_rotation",
            "potential_reversal",
        }:
            add_flag(
                flags,
                "F5_MARKET_CONTEXT_MISMATCH",
                "MEDIUM",
                "breakout_signal_conflicts_with_current_regime",
            )
        if b_status == "valid_breakout":
            base_ok = (
                bool(b_base.get("status") == "ok") if isinstance(b_base, dict) else True
            )
            context_ok = regime in {"trend_continuation"}
            if not (base_ok and context_ok):
                add_flag(
                    flags,
                    "F18_BREAKOUT_FILTER_WEAK",
                    "MEDIUM",
                    "breakout_filters_weak_base_or_context",
                )

            targets = (
                liquidity.get("draw_targets", {}) if isinstance(liquidity, dict) else {}
            )
            if b_side == "up" and targets.get("external_up") is None:
                add_flag(
                    flags,
                    "F11_NO_NEXT_ZONE_PATH",
                    "MEDIUM",
                    "breakout_without_next_zone_target",
                )
            if b_side == "down" and targets.get("external_down") is None:
                add_flag(
                    flags,
                    "F11_NO_NEXT_ZONE_PATH",
                    "MEDIUM",
                    "breakout_without_next_zone_target",
                )

    ns = nearest_support_distance_pct(last_close, levels)
    if ns is not None and ns > 0.10:
        add_flag(
            flags,
            "F8_NO_NEARBY_SUPPORT",
            "MEDIUM",
            "nearest_support_too_far_from_current_price",
        )

    missing_liq = any(
        liquidity.get(k) is None
        for k in ("current_draw", "opposing_draw", "sweep_event")
    )
    if missing_liq:
        add_flag(
            flags,
            "F12_LIQUIDITY_MAP_MISSING",
            "MEDIUM",
            "liquidity_map_incomplete_draw_targets_or_sweep",
        )

    if "vpvr" in modules and vpvr is not None:
        has_key = (
            vpvr.get("poc") is not None
            and vpvr.get("vah") is not None
            and vpvr.get("val") is not None
        )
        if not has_key:
            add_flag(
                flags,
                "F15_VOLUME_CONFLUENCE_WEAK",
                "MEDIUM",
                "volume_profile_context_lacks_core_levels",
            )

    severity_rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
    overall = "LOW"
    if flags:
        overall = max(
            flags, key=lambda f: severity_rank.get(str(f.get("severity")), 1)
        )["severity"]
    return {"flags": flags, "overall_severity": overall}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    from ta_common import load_ohlcv

    args = parse_args()
    modules = parse_modules(args.modules)
    symbol = args.symbol.strip().upper()
    purpose_mode = args.purpose_mode
    position_state = args.position_state

    if purpose_mode in {"UPDATE", "POSTMORTEM"} and not args.prior_thesis_json:
        raise ValueError(
            "prior thesis context is required for UPDATE and POSTMORTEM"
        )
    if purpose_mode == "UPDATE" and (
        args.thesis_status is None or args.review_reason is None
    ):
        raise ValueError(
            "thesis-status and review-reason are required for UPDATE"
        )

    input_path = Path(args.input).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    daily, intraday_1m, intraday, corp = load_ohlcv(input_path)
    daily = add_ma_stack(daily)
    daily = add_atr14(daily)
    daily = add_swings(daily, n=args.swing_n)
    daily = add_volume_features(daily)

    # Compute structure status first so classify_regime can detect potential_reversal
    events = detect_structure_events(daily)
    last_labels = [e["label"] for e in events[-4:]]
    choch_triggered = "CHOCH" in last_labels
    bos_confirmed = choch_triggered and ("BOS" in last_labels)

    # Infer preliminary trend bias from last 4 swings for structure_status
    swings_h = daily[daily["swing_high"].notna()][["datetime", "swing_high"]].tail(4)
    swings_l = daily[daily["swing_low"].notna()][["datetime", "swing_low"]].tail(4)
    if len(swings_h) >= 2 and len(swings_l) >= 2:
        hh = swings_h["swing_high"].iloc[-1] > swings_h["swing_high"].iloc[-2]
        hl = swings_l["swing_low"].iloc[-1] > swings_l["swing_low"].iloc[-2]
        lh = swings_h["swing_high"].iloc[-1] < swings_h["swing_high"].iloc[-2]
        ll = swings_l["swing_low"].iloc[-1] < swings_l["swing_low"].iloc[-2]
        if hh and hl:
            prelim_bias = "bullish"
        elif lh and ll:
            prelim_bias = "bearish"
        else:
            prelim_bias = "neutral"
    else:
        prelim_bias = "neutral"

    structure_state = structure_status(prelim_bias, choch_triggered, bos_confirmed)
    regime = classify_regime(daily, structure_status_val=structure_state)
    normalized_structure_status = normalize_structure_status(
        structure_state, regime["regime"], regime["trend_bias"]
    )

    levels = derive_levels(daily)
    last = daily.iloc[-1]
    last_close = float(last["close"])
    prev_close = float(daily.iloc[-2]["close"]) if len(daily) > 1 else None
    posture = baseline_ma_payload(last)
    adaptive_ma = choose_adaptive_ma(daily)
    ma_whipsaw_flags = detect_ma_whipsaw(
        daily,
        adaptive_period=(
            int(adaptive_ma["adaptive_period"])
            if adaptive_ma.get("adaptive_period") is not None
            else None
        ),
    )
    vp_base = vpvr_core(daily.tail(260))
    value_area = build_value_area(vp_base, last_close, prev_close)

    state, state_reason = infer_state(
        last_close,
        float(vp_base["val"]) if vp_base["val"] is not None else last_close,
        float(vp_base["vah"]) if vp_base["vah"] is not None else last_close,
        follow_close=prev_close,
    )

    wyckoff_state = build_wyckoff_state(daily)
    dist_days = count_distribution_days(daily, window=20)

    nearest_mid = levels[-1]["zone_mid"] if levels else last_close
    role_reversal_note = role_reversal(
        last_close, float(nearest_mid), was_support=(regime["trend_bias"] == "bullish")
    )
    bo_snap = breakout_snapshot(daily, levels)
    bo_displacement = (
        breakout_displacement(
            daily,
            level=float(
                bo_snap.get("up_level") or bo_snap.get("down_level") or last_close
            ),
            side=bo_snap.get("side") or "up",
        )
        if bo_snap.get("status") == "valid_breakout"
        else None
    )
    spring = detect_wyckoff_spring(
        daily, events, str(wyckoff_state["current_cycle_phase"])
    )
    setup_id = choose_setup(
        regime=regime["regime"],
        breakout_state=bo_snap.get("status", "no_breakout"),
        structure_state=structure_state,
        spring_confirmed=bool(spring.get("detected", False)),
    )

    supports, resistances = split_support_resistance(levels, last_close)
    location_state = infer_location_state(
        last_close, regime["trend_bias"], regime["regime"], supports, resistances
    )
    intraday_timing = build_intraday_timing(
        intraday, intraday_1m, regime["trend_bias"]
    )
    risk_map = build_risk_map(
        setup_id=setup_id,
        position_state=position_state,
        close_price=last_close,
        supports=supports,
        resistances=resistances,
        min_rr_required=args.min_rr_required,
    )

    max_touches = max((z["touches"] for z in levels), default=0)
    red_flags = build_red_flags(
        regime=regime["regime"],
        breakout_state=bo_snap.get("status", "no_breakout"),
        level_touches=max_touches,
        structure_state=structure_state,
        last_close=last_close,
        ema21=float(last.get("EMA21", last_close)),
        sma50=float(last.get("SMA50", last_close)),
        position_state=position_state,
        risk_status=str(risk_map["risk_status"]),
        distribution_day_count=dist_days["count"],
        breakout_displacement_state=bo_displacement,
        ma_whipsaw_flags=ma_whipsaw_flags,
    )

    liq = liquidity_draws(last_close, levels, internal_levels=None)
    ext_levels = [float(z["zone_mid"]) for z in levels]
    int_levels: list[float] = []
    liq["draw_targets"] = pick_draw_targets(ext_levels, int_levels, last_close)

    # Sweep event detection with richer enum support
    sweep_event = "none"
    sweep_outcome_value = "unresolved"
    if events:
        last_event = events[-1]
        side = "above" if last_event["side"] == "up" else "below"
        sweep_event = "swing_swept"
        sweep_outcome_value = sweep_outcome(
            last_close, float(last_event["broken_level"]), side
        )

    liq["sweep_event"] = sweep_event
    liq["sweep_outcome"] = sweep_outcome_value
    event_type = "external_sweep" if sweep_event != "none" else "none"
    liq["liquidity_path"] = liquidity_path_after_event(event_type)

    # Trendline sweep check (only when not already classified as eqh/eql)
    if liq["sweep_event"] == "swing_swept" and events:
        trendlines = detect_trendline_levels(daily)
        broken_lvl = float(events[-1]["broken_level"])
        for tl in trendlines:
            proj = float(tl["projected_level"])
            if abs(proj - broken_lvl) / max(broken_lvl, 1e-9) < 0.01:
                liq["sweep_event"] = "trendline_swept"
                break

    breakout_result = None
    if "breakout" in modules:
        breakout_result = breakout_snapshot(daily, levels)
        latest = add_volume_features(daily).iloc[-1]
        breakout_result["price_volume_class"] = classify_price_volume(
            float(latest.get("ret", 0.0) or 0.0),
            float(latest.get("vol_ratio", 1.0) or 1.0),
        )
        breakout_result["base_quality"] = base_quality(daily.tail(35))
        if bo_displacement is not None:
            breakout_result["displacement"] = bo_displacement

    trigger_confirmation = build_trigger_confirmation(
        setup_id=setup_id,
        breakout=breakout_result or bo_snap,
        raw_structure_status=structure_state,
        spring=spring,
        events=events,
        regime=regime["regime"],
        value_acceptance_state=value_area["acceptance_state"],
        displacement=bo_displacement,
        intraday_timing=intraday_timing,
    )

    prior_thesis = load_prior_thesis(args.prior_thesis_json)
    if prior_thesis is None and purpose_mode in {"UPDATE", "POSTMORTEM"}:
        raise ValueError("prior thesis context is required")

    enriched_red_flags = enrich_red_flags(
        red_flags=red_flags,
        last_close=last_close,
        regime=regime["regime"],
        levels=levels,
        modules=modules,
        liquidity=liq,
        vpvr={"poc": value_area["poc"], "vah": value_area["vah"], "val": value_area["val"]},
        breakout=breakout_result,
    )

    result: dict[str, Any] = {
        "analysis": {
            "symbol": symbol,
            "as_of_date": str(daily["datetime"].iloc[-1].date()),
            "purpose_mode": purpose_mode,
            "intent": build_intent(purpose_mode, position_state),
            "position_state": position_state,
            "daily_timeframe": "1d",
            "intraday_timeframe": "15m",
            "intraday_source_timeframe": "1m",
            "min_rr_required": float(args.min_rr_required),
        },
        "daily_thesis": {
            "state": state,
            "regime": regime["regime"],
            "trend_bias": regime["trend_bias"],
            "structure_status": normalized_structure_status,
            "current_cycle_phase": str(wyckoff_state["current_cycle_phase"]),
            "current_wyckoff_phase": str(wyckoff_state["current_wyckoff_phase"]),
            "wyckoff_current_confidence": int(
                wyckoff_state["wyckoff_current_confidence"]
            ),
            "wyckoff_current_maturity": str(
                wyckoff_state["wyckoff_current_maturity"]
            ),
            "wyckoff_history": list(wyckoff_state["wyckoff_history"]),
            "baseline_ma_posture": posture,
        },
        "intraday_timing": intraday_timing,
        "location": {
            "location_state": location_state,
            "support_zones": supports,
            "resistance_zones": resistances,
            "value_area": value_area,
            "liquidity_map": {
                "current_draw": liq.get("current_draw"),
                "opposing_draw": liq.get("opposing_draw"),
                "last_sweep_type": liq.get("sweep_event", "none"),
                "last_sweep_outcome": liq.get("sweep_outcome", "unresolved"),
                "path_state": liq.get("liquidity_path", "unclear"),
            },
            "time_levels": time_based_opens(daily),
            "round_levels": round_level_payload(nearest_round_levels(last_close)),
        },
        "setup": {
            "primary_setup": setup_id,
            "candidate_setups": [setup_id],
            "setup_side": "long" if setup_id != "NO_VALID_SETUP" else "neutral",
            "setup_validity": (
                "invalid"
                if setup_id == "NO_VALID_SETUP"
                else "valid" if trigger_confirmation["trigger_state"] == "triggered" else "watchlist_only"
            ),
            "setup_drivers": [
                regime["regime"],
                location_state,
                role_reversal_note,
            ],
        },
        "trigger_confirmation": trigger_confirmation,
        "risk_map": risk_map,
        "red_flags": normalize_red_flags(enriched_red_flags),
    }

    if purpose_mode == "UPDATE":
        result["analysis"]["thesis_status"] = str(args.thesis_status)
        result["analysis"]["review_reason"] = str(args.review_reason)
    if adaptive_ma.get("adaptive_period") is not None:
        adaptive_details = adaptive_ma.get("details") if isinstance(adaptive_ma.get("details"), dict) else {}
        justification_bits = [
            f"touches={int(adaptive_details.get('touch_count', 0))}",
            f"reclaims={int(adaptive_details.get('reclaim_count', 0))}",
            f"whipsaws={int(adaptive_details.get('whipsaw_count', 0))}",
        ]
        result["daily_thesis"]["adaptive_ma"] = {
            "period": int(adaptive_ma["adaptive_period"]),
            "ma_type": "sma",
            "respect_score": float(adaptive_ma["score"]),
            "role": "timing_refinement",
            "justification": ",".join(justification_bits),
        }
    if prior_thesis is not None:
        result["prior_thesis"] = prior_thesis

    output_path = (
        Path(args.output).expanduser().resolve()
        if args.output
        else outdir / f"{symbol}_ta_context.json"
    )
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(json.dumps({"ok": True, "output": str(output_path)}, indent=2))


if __name__ == "__main__":
    main()
