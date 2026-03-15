#!/usr/bin/env python3
"""Deterministic Wyckoff state helpers shared by TA scripts."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from ta_common import add_atr14, add_ma_stack, add_swings, add_volume_features


MIN_HISTORY_BARS = 70
RANGE_WINDOW = 35
PRIOR_WINDOW = 20
RECENT_WINDOW = 12
STATE_CONFIRM_BARS = 2
MIN_SEGMENT_BARS = 4


def _prepare_daily(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    needed = {"ATR14", "EMA21", "SMA50", "swing_high", "swing_low", "vol_ratio", "ret"}
    if "EMA21" not in x.columns or "SMA50" not in x.columns:
        x = add_ma_stack(x)
    if "ATR14" not in x.columns:
        x = add_atr14(x)
    if "swing_high" not in x.columns or "swing_low" not in x.columns:
        x = add_swings(x)
    if "vol_ratio" not in x.columns or "ret" not in x.columns:
        x = add_volume_features(x)
    if not needed.issubset(set(x.columns)):
        raise ValueError("daily dataframe missing required Wyckoff feature columns")
    return x.reset_index(drop=True)


def _bar_close_position(row: pd.Series) -> float:
    hi = float(row["high"])
    lo = float(row["low"])
    if hi <= lo:
        return 0.5
    return float((float(row["close"]) - lo) / (hi - lo))


def _effort_result_counts(window: pd.DataFrame) -> dict[str, int]:
    recent = window.tail(RECENT_WINDOW)
    strong_up = int(((recent["ret"] > 0.025) & (recent["vol_ratio"] > 1.25)).sum())
    strong_down = int(((recent["ret"] < -0.025) & (recent["vol_ratio"] > 1.25)).sum())
    climactic_down = int(
        (
            (recent["ret"] < -0.05)
            & (recent["vol_ratio"] > 1.7)
            & (recent.apply(_bar_close_position, axis=1) < 0.35)
        ).sum()
    )
    climactic_up = int(
        (
            (recent["ret"] > 0.05)
            & (recent["vol_ratio"] > 1.7)
            & (recent.apply(_bar_close_position, axis=1) > 0.65)
        ).sum()
    )
    return {
        "strong_up": strong_up,
        "strong_down": strong_down,
        "climactic_down": climactic_down,
        "climactic_up": climactic_up,
    }


def _range_stats(window: pd.DataFrame) -> dict[str, float]:
    rng = window.tail(RANGE_WINDOW)
    range_high = float(rng["high"].max())
    range_low = float(rng["low"].min())
    close_price = float(rng["close"].iloc[-1])
    range_span = max(range_high - range_low, 1e-9)
    pos_in_range = float((close_price - range_low) / range_span)
    span_pct = float(range_span / max(abs(close_price), 1e-9))
    return {
        "range_high": range_high,
        "range_low": range_low,
        "range_mid": float((range_high + range_low) / 2.0),
        "range_span": range_span,
        "range_span_pct": span_pct,
        "pos_in_range": pos_in_range,
    }


def _trend_snapshot(window: pd.DataFrame) -> dict[str, Any]:
    last = window.iloc[-1]
    close_price = float(last["close"])
    ema21 = float(last["EMA21"]) if pd.notna(last["EMA21"]) else close_price
    sma50 = float(last["SMA50"]) if pd.notna(last["SMA50"]) else close_price
    atr14 = float(last["ATR14"]) if pd.notna(last["ATR14"]) and float(last["ATR14"]) > 0 else max(close_price * 0.02, 1e-9)

    lookback_close = float(window["close"].iloc[max(0, len(window) - PRIOR_WINDOW)])
    slope_pct = float((close_price - lookback_close) / max(abs(lookback_close), 1e-9))
    bullish_stack = bool(close_price > ema21 > sma50)
    bearish_stack = bool(close_price < ema21 < sma50)
    above_ema_ratio = float((window.tail(10)["close"] > window.tail(10)["EMA21"]).mean())
    below_ema_ratio = float((window.tail(10)["close"] < window.tail(10)["EMA21"]).mean())

    return {
        "close": close_price,
        "ema21": ema21,
        "sma50": sma50,
        "atr14": atr14,
        "slope_pct": slope_pct,
        "bullish_stack": bullish_stack,
        "bearish_stack": bearish_stack,
        "above_ema_ratio": above_ema_ratio,
        "below_ema_ratio": below_ema_ratio,
    }


def _prior_trend_bias(window: pd.DataFrame) -> str:
    if len(window) < RANGE_WINDOW + PRIOR_WINDOW:
        return "unclear"
    prior = window.iloc[-(RANGE_WINDOW + PRIOR_WINDOW) : -RANGE_WINDOW]
    if prior.empty:
        return "unclear"
    last = prior.iloc[-1]
    first_close = float(prior["close"].iloc[0])
    last_close = float(prior["close"].iloc[-1])
    slope_pct = (last_close - first_close) / max(abs(first_close), 1e-9)
    ema21 = float(last["EMA21"]) if pd.notna(last["EMA21"]) else last_close
    sma50 = float(last["SMA50"]) if pd.notna(last["SMA50"]) else last_close
    if slope_pct > 0.08 or (last_close > ema21 > sma50):
        return "up"
    if slope_pct < -0.08 or (last_close < ema21 < sma50):
        return "down"
    return "unclear"


def _spring_or_upthrust(window: pd.DataFrame, range_low: float, range_high: float) -> dict[str, bool]:
    recent = window.tail(10)
    spring = bool(
        (
            (recent["low"] < (range_low * 0.99))
            & (recent["close"] > range_low)
            & (recent.apply(_bar_close_position, axis=1) > 0.45)
        ).any()
    )
    upthrust = bool(
        (
            (recent["high"] > (range_high * 1.01))
            & (recent["close"] < range_high)
            & (recent.apply(_bar_close_position, axis=1) < 0.55)
        ).any()
    )
    return {"spring": spring, "upthrust": upthrust}


def _classify_state(window: pd.DataFrame) -> dict[str, Any]:
    stats = _range_stats(window)
    trend = _trend_snapshot(window)
    effort = _effort_result_counts(window)
    prior_bias = _prior_trend_bias(window)
    event_flags = _spring_or_upthrust(window, stats["range_low"], stats["range_high"])

    range_like = bool(stats["range_span_pct"] <= 0.28 and abs(trend["slope_pct"]) <= 0.12)
    sos_recent = bool(
        len(window) >= 2
        and float(window["close"].iloc[-1]) > (stats["range_high"] * 1.005)
        and float(window["close"].iloc[-2]) >= stats["range_mid"]
    )
    sow_recent = bool(
        len(window) >= 2
        and float(window["close"].iloc[-1]) < (stats["range_low"] * 0.995)
        and float(window["close"].iloc[-2]) <= stats["range_mid"]
    )

    trend_up_score = 0.0
    trend_dn_score = 0.0
    if trend["bullish_stack"]:
        trend_up_score += 18.0
    if trend["bearish_stack"]:
        trend_dn_score += 18.0
    trend_up_score += max(trend["slope_pct"], 0.0) * 120.0
    trend_dn_score += max(-trend["slope_pct"], 0.0) * 120.0
    trend_up_score += max(trend["above_ema_ratio"] - 0.5, 0.0) * 20.0
    trend_dn_score += max(trend["below_ema_ratio"] - 0.5, 0.0) * 20.0

    acc_score = 0.0
    dist_score = 0.0
    if range_like:
        acc_score += 10.0
        dist_score += 10.0
    if prior_bias == "down":
        acc_score += 16.0
    if prior_bias == "up":
        dist_score += 16.0
    if stats["pos_in_range"] <= 0.45:
        acc_score += 8.0
    if stats["pos_in_range"] >= 0.55:
        dist_score += 8.0
    if effort["strong_up"] >= effort["strong_down"]:
        acc_score += 6.0
    if effort["strong_down"] >= effort["strong_up"]:
        dist_score += 6.0
    acc_score += effort["climactic_down"] * 10.0
    dist_score += effort["climactic_up"] * 10.0
    if event_flags["spring"]:
        acc_score += 16.0
    if event_flags["upthrust"]:
        dist_score += 16.0
    if sos_recent:
        acc_score += 10.0
    if sow_recent:
        dist_score += 10.0

    cycle_phase = "unclear"
    schematic_phase = "unclear"
    transition_reason = "unclear"
    confidence_base = 35.0

    if trend_up_score >= max(acc_score, dist_score) and trend_up_score >= 28.0 and not range_like:
        cycle_phase = "markup"
        schematic_phase = "not_applicable"
        transition_reason = "bull_trend_continuation"
        confidence_base = min(92.0, 40.0 + trend_up_score)
    elif trend_dn_score >= max(acc_score, dist_score) and trend_dn_score >= 28.0 and not range_like:
        cycle_phase = "markdown"
        schematic_phase = "not_applicable"
        transition_reason = "bear_trend_continuation"
        confidence_base = min(92.0, 40.0 + trend_dn_score)
    elif max(acc_score, dist_score) >= 18.0:
        cycle_phase = "accumulation" if acc_score >= dist_score else "distribution"
        confidence_base = min(88.0, 38.0 + max(acc_score, dist_score))
        recent_range = window.tail(RANGE_WINDOW)
        bars_near_range = int(len(recent_range))
        if cycle_phase == "accumulation":
            if event_flags["spring"]:
                schematic_phase = "C"
                transition_reason = "spring_confirmed"
            elif sos_recent or stats["pos_in_range"] > 0.62:
                schematic_phase = "D"
                transition_reason = "sos_or_reclaim_strength"
            elif bars_near_range <= 10 or effort["climactic_down"] > 0:
                schematic_phase = "A"
                transition_reason = "climax_and_range_birth"
            else:
                schematic_phase = "B"
                transition_reason = "range_building"
        else:
            if event_flags["upthrust"]:
                schematic_phase = "C"
                transition_reason = "upthrust_confirmed"
            elif sow_recent or stats["pos_in_range"] < 0.38:
                schematic_phase = "D"
                transition_reason = "sow_or_breakdown_pressure"
            elif bars_near_range <= 10 or effort["climactic_up"] > 0:
                schematic_phase = "A"
                transition_reason = "climax_and_range_birth"
            else:
                schematic_phase = "B"
                transition_reason = "range_building"

    confidence = int(round(np.clip(confidence_base, 25.0, 95.0)))
    return {
        "cycle_phase": cycle_phase,
        "schematic_phase": schematic_phase,
        "confidence": confidence,
        "transition_reason": transition_reason,
    }


def _segment_maturity(cycle_phase: str, schematic_phase: str, duration_bars: int) -> str:
    if schematic_phase == "A":
        return "fresh"
    if schematic_phase == "B":
        return "maturing"
    if schematic_phase in {"C", "D"}:
        return "mature"
    if schematic_phase == "E":
        return "degrading"
    if duration_bars <= 12:
        return "fresh"
    if duration_bars <= 35:
        return "maturing"
    if duration_bars <= 80:
        return "mature"
    return "degrading"


def _build_segment(
    x: pd.DataFrame,
    states: list[dict[str, Any]],
) -> dict[str, Any]:
    start_idx = int(states[0]["index"])
    end_idx = int(states[-1]["index"])
    price_slice = x.iloc[start_idx : end_idx + 1]
    duration = int(end_idx - start_idx + 1)
    cycle_phase = str(states[-1]["cycle_phase"])
    schematic_phase = str(states[-1]["schematic_phase"])
    segment: dict[str, Any] = {
        "cycle_phase": cycle_phase,
        "schematic_phase": schematic_phase,
        "start_ts": str(price_slice["datetime"].iloc[0]),
        "end_ts": str(price_slice["datetime"].iloc[-1]),
        "start_index": start_idx,
        "end_index": end_idx,
        "duration_bars": duration,
        "price_low": float(price_slice["low"].min()),
        "price_high": float(price_slice["high"].max()),
        "price_change_pct": round(
            (
                (float(price_slice["close"].iloc[-1]) - float(price_slice["close"].iloc[0]))
                / max(abs(float(price_slice["close"].iloc[0])), 1e-9)
            )
            * 100.0,
            2,
        ),
        "confidence": int(round(np.mean([int(s["confidence"]) for s in states]))),
        "transition_reason": str(states[0]["transition_reason"]),
    }
    segment["maturity"] = _segment_maturity(cycle_phase, schematic_phase, duration)
    return segment


def build_wyckoff_state(
    df_daily: pd.DataFrame,
    *,
    keep_segments: int = 8,
    return_full_history: bool = False,
) -> dict[str, Any]:
    x = _prepare_daily(df_daily)
    if len(x) < MIN_HISTORY_BARS:
        result: dict[str, Any] = {
            "as_of_date": str(x["datetime"].iloc[-1].date()),
            "timeframe": "1d",
            "current_cycle_phase": "unclear",
            "current_wyckoff_phase": "unclear",
            "wyckoff_current_confidence": 25,
            "wyckoff_current_maturity": "fresh",
            "wyckoff_history": [],
        }
        if return_full_history:
            result["_full_history"] = []
        return result

    raw_states: list[dict[str, Any]] = []
    for idx in range(MIN_HISTORY_BARS - 1, len(x)):
        state = _classify_state(x.iloc[: idx + 1])
        state["index"] = idx
        state["datetime"] = str(x.iloc[idx]["datetime"])
        state["close"] = float(x.iloc[idx]["close"])
        raw_states.append(state)

    confirmed: list[dict[str, Any]] = []
    current = raw_states[0].copy()
    pending_key: tuple[str, str] | None = None
    pending_count = 0
    pending_state: dict[str, Any] | None = None

    for state in raw_states:
        key = (str(state["cycle_phase"]), str(state["schematic_phase"]))
        current_key = (str(current["cycle_phase"]), str(current["schematic_phase"]))
        if key == current_key:
            pending_key = None
            pending_count = 0
            current = {**current, "confidence": int(state["confidence"])}
        else:
            if key == pending_key:
                pending_count += 1
            else:
                pending_key = key
                pending_count = 1
                pending_state = state.copy()
            if pending_count >= STATE_CONFIRM_BARS and pending_state is not None:
                current = pending_state.copy()
                pending_key = None
                pending_count = 0
        current = {
            **current,
            "index": int(state["index"]),
            "datetime": str(state["datetime"]),
            "close": float(state["close"]),
        }
        confirmed.append(current.copy())

    grouped_states: list[list[dict[str, Any]]] = []
    seg_start = 0
    for i in range(1, len(confirmed) + 1):
        is_break = i == len(confirmed) or (
            confirmed[i]["cycle_phase"] != confirmed[seg_start]["cycle_phase"]
            or confirmed[i]["schematic_phase"] != confirmed[seg_start]["schematic_phase"]
        )
        if not is_break:
            continue
        grouped_states.append(confirmed[seg_start:i])
        seg_start = i

    smoothed_groups: list[list[dict[str, Any]]] = []
    i = 0
    while i < len(grouped_states):
        group = grouped_states[i]
        duration = int(group[-1]["index"]) - int(group[0]["index"]) + 1
        if (
            0 < i < len(grouped_states) - 1
            and duration < MIN_SEGMENT_BARS
            and grouped_states[i - 1][-1]["cycle_phase"] == grouped_states[i + 1][-1]["cycle_phase"]
            and grouped_states[i - 1][-1]["schematic_phase"] == grouped_states[i + 1][-1]["schematic_phase"]
        ):
            merged_prev = smoothed_groups.pop()
            merged = merged_prev + group + grouped_states[i + 1]
            smoothed_groups.append(merged)
            i += 2
            continue
        smoothed_groups.append(group)
        i += 1

    segments = [_build_segment(x, group) for group in smoothed_groups]

    current_segment = segments[-1]
    result = {
        "as_of_date": str(x["datetime"].iloc[-1].date()),
        "timeframe": "1d",
        "current_cycle_phase": str(current_segment["cycle_phase"]),
        "current_wyckoff_phase": str(current_segment["schematic_phase"]),
        "wyckoff_current_confidence": int(current_segment["confidence"]),
        "wyckoff_current_maturity": str(current_segment["maturity"]),
        "wyckoff_history": segments[-keep_segments:],
    }
    if return_full_history:
        result["_full_history"] = segments
    return result
