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

# Event detection thresholds (ATR/RVOL-normalized, IDX-calibrated)
CLIMAX_RVOL = 2.5
HIGH_RVOL = 1.5
LOW_RVOL = 0.85
DRYUP_RVOL = 0.65
WIDE_SPREAD_ATR = 1.5
TEST_SPREAD_ATR = 1.0
NARROW_SPREAD_ATR = 0.7
CLIMAX_LOOKBACK = 40
RANGE_PROXIMITY_PCT = 0.02
RANGE_PIERCE_PCT = 0.005
AR_WINDOW = 6
TEST_OF_SPRING_WINDOW = 12
EVENT_DEDUPE_WINDOW = 3
PRELIMINARY_EVENT_GAP_BARS = 4
MAX_EVENTS_PER_SEGMENT = 6
EVENT_PRIORITY = [
    "PS",
    "PSY",
    "SC",
    "BC",
    "AR",
    "Spring",
    "UTAD",
    "UT",
    "SOS",
    "SOW",
    "ST",
    "Test",
    "ToS",
    "LPS",
    "LPSY",
]


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


def _new_schematic_ctx() -> dict[str, Any]:
    return {
        "side": "none",
        "anchored_low": None,
        "anchored_high": None,
        "anchor_source": "rolling",
        "ps_bar": None,
        "sc_bar": None,
        "sc_low": None,
        "ar_bar": None,
        "ar_high": None,
        "psy_bar": None,
        "bc_bar": None,
        "bc_high": None,
        "ar_low_dist": None,
        "spring_bar": None,
        "spring_low": None,
        "spring_type": None,
        "sos_bar": None,
        "sow_bar": None,
        "phase_unlocked": "A",
        "_reset_pending": 0,
    }


def _event(
    etype: str, bar_index: int, ts: str, price: float, score: float, vol_sig: str,
) -> dict[str, Any]:
    return {
        "type": etype,
        "bar_index": bar_index,
        "ts": ts,
        "price": round(price, 2),
        "score": round(min(max(score, 0.0), 1.0), 3),
        "vol_sig": vol_sig,
    }


def _has_preliminary_spacing(
    last_event_bar: int | None,
    bar_idx: int,
) -> bool:
    return (
        last_event_bar is None
        or (bar_idx - last_event_bar) >= PRELIMINARY_EVENT_GAP_BARS
    )


def _recent_move_pct(window: pd.DataFrame, lookback: int = PRIOR_WINDOW) -> float:
    if len(window) < 2:
        return 0.0
    anchor_idx = max(0, len(window) - lookback - 1)
    ref_close = float(window["close"].iloc[anchor_idx])
    close = float(window["close"].iloc[-1])
    return (close - ref_close) / max(abs(ref_close), 1e-9)


def _detect_events(
    window: pd.DataFrame,
    bar_idx: int,
    ctx: dict[str, Any],
    cycle_phase: str,
    schematic_phase: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Detect Wyckoff schematic events for the current bar. Returns (events, updated_ctx)."""
    events: list[dict[str, Any]] = []
    row = window.iloc[-1]
    ts = str(row["datetime"])
    close = float(row["close"])
    low = float(row["low"])
    high = float(row["high"])
    open_price = float(row["open"])
    vol_ratio = float(row["vol_ratio"]) if pd.notna(row["vol_ratio"]) else 1.0
    atr14 = float(row["ATR14"]) if pd.notna(row["ATR14"]) and float(row["ATR14"]) > 0 else max(close * 0.02, 1e-9)
    spread = high - low
    cp = _bar_close_position(row)
    ret = float(row["ret"]) if pd.notna(row["ret"]) else 0.0
    lower_tail_ratio = (
        float((min(open_price, close) - low) / spread)
        if spread > 0
        else 0.0
    )
    upper_tail_ratio = (
        float((high - max(open_price, close)) / spread)
        if spread > 0
        else 0.0
    )

    # Range references: prefer anchored, fall back to rolling
    stats = _range_stats(window)
    range_low = ctx["anchored_low"] if ctx["anchored_low"] is not None else stats["range_low"]
    range_high = ctx["anchored_high"] if ctx["anchored_high"] is not None else stats["range_high"]
    range_mid = (range_low + range_high) / 2.0

    side = ctx["side"]
    phase = ctx["phase_unlocked"]

    # --- Update side from cycle_phase ---
    if cycle_phase == "accumulation" and side != "accumulation":
        ctx = {**ctx, "side": "accumulation", "_reset_pending": 0}
        if phase == "A" and ctx["sc_bar"] is None:
            pass  # stay in A
        side = "accumulation"
    elif cycle_phase == "distribution" and side != "distribution":
        ctx = {**ctx, "side": "distribution", "_reset_pending": 0}
        if phase == "A" and ctx["bc_bar"] is None:
            pass
        side = "distribution"
    elif cycle_phase in {"markup", "markdown", "unclear"} and side != "none":
        # Require STATE_CONFIRM_BARS consecutive non-acc/dist readings before resetting
        pending = ctx.get("_reset_pending", 0) + 1
        if pending >= STATE_CONFIRM_BARS:
            ctx = _new_schematic_ctx()
            side = "none"
        else:
            ctx = {**ctx, "_reset_pending": pending}
    elif side != "none":
        ctx = {**ctx, "_reset_pending": 0}

    if side == "none":
        return events, ctx

    # ===== ACCUMULATION EVENTS =====
    if side == "accumulation":
        ps_emitted = False

        # --- PS: Preliminary Support ---
        if phase == "A" and ctx["sc_bar"] is None and _has_preliminary_spacing(
            ctx.get("ps_bar"), bar_idx
        ):
            lookback = window.tail(min(CLIMAX_LOOKBACK, len(window)))
            is_near_low = low <= float(lookback["low"].min()) * (1.0 + RANGE_PROXIMITY_PCT)
            decline_pct = _recent_move_pct(window)
            has_absorption = cp >= 0.55 or lower_tail_ratio >= 0.35
            non_climactic_volume = HIGH_RVOL <= vol_ratio < CLIMAX_RVOL
            wide_enough = spread >= TEST_SPREAD_ATR * atr14
            if (
                is_near_low
                and decline_pct <= -0.05
                and has_absorption
                and non_climactic_volume
                and wide_enough
            ):
                score = min(
                    0.82,
                    0.25
                    + (vol_ratio - HIGH_RVOL) * 0.08
                    + max(cp - 0.50, 0.0) * 0.35
                    + max(lower_tail_ratio - 0.25, 0.0) * 0.25
                    + min(abs(decline_pct), 0.20) * 0.6,
                )
                events.append(
                    _event(
                        "PS",
                        bar_idx,
                        ts,
                        low,
                        score,
                        "high_vol" if vol_ratio >= 1.8 else "moderate",
                    )
                )
                ps_emitted = True
                ctx = {
                    **ctx,
                    "ps_bar": bar_idx,
                    "anchored_low": low
                    if ctx["anchored_low"] is None
                    else min(float(ctx["anchored_low"]), low),
                    "anchor_source": "event",
                }

        # --- SC: Selling Climax ---
        if phase == "A" and ctx["sc_bar"] is None and not ps_emitted:
            lookback = window.tail(min(CLIMAX_LOOKBACK, len(window)))
            is_new_low = low <= float(lookback["low"].min())
            if is_new_low and vol_ratio >= CLIMAX_RVOL and spread >= WIDE_SPREAD_ATR * atr14 and cp >= 0.45:
                score = min(1.0, 0.4 + (vol_ratio - CLIMAX_RVOL) * 0.15 + (spread / atr14 - WIDE_SPREAD_ATR) * 0.1 + (cp - 0.45) * 0.5)
                events.append(_event("SC", bar_idx, ts, low, score, "climactic"))
                ctx = {**ctx, "sc_bar": bar_idx, "sc_low": low, "anchored_low": low, "anchor_source": "event"}
            # Softer SC: still climactic but slightly less extreme
            elif is_new_low and vol_ratio >= HIGH_RVOL and spread >= 1.2 * atr14 and cp >= 0.40:
                score = min(1.0, 0.25 + (vol_ratio - HIGH_RVOL) * 0.1 + (cp - 0.40) * 0.4)
                events.append(_event("SC", bar_idx, ts, low, score, "high_vol"))
                ctx = {**ctx, "sc_bar": bar_idx, "sc_low": low, "anchored_low": low, "anchor_source": "event"}

        # --- AR: Automatic Rally (post-SC) ---
        if ctx["sc_bar"] is not None and ctx["ar_bar"] is None:
            bars_since_sc = bar_idx - ctx["sc_bar"]
            if 1 <= bars_since_sc <= AR_WINDOW:
                # Strong single-bar rally or multi-bar rally
                rally_return = (close - ctx["sc_low"]) / max(abs(ctx["sc_low"]), 1e-9)
                if spread >= WIDE_SPREAD_ATR * atr14 or rally_return >= 0.05:
                    score = min(1.0, 0.4 + rally_return * 3.0 + (spread / atr14 - 1.0) * 0.1)
                    events.append(_event("AR", bar_idx, ts, high, score, "sharp_rally"))
                    ctx = {**ctx, "ar_bar": bar_idx, "ar_high": high, "anchored_high": high, "phase_unlocked": "B"}

        # --- ST: Secondary Test ---
        if phase in {"B", "C"} and ctx["sc_low"] is not None:
            near_sc = abs(low - ctx["sc_low"]) / max(abs(ctx["sc_low"]), 1e-9) <= RANGE_PROXIMITY_PCT
            if near_sc and vol_ratio <= LOW_RVOL and spread <= TEST_SPREAD_ATR * atr14:
                score = min(1.0, 0.3 + (LOW_RVOL - vol_ratio) * 0.5 + (TEST_SPREAD_ATR - spread / atr14) * 0.3)
                events.append(_event("ST", bar_idx, ts, low, score, "dryup"))

        # --- Spring ---
        if phase in {"B", "C"}:
            pierce = low < range_low * (1.0 - RANGE_PIERCE_PCT)
            reclaim = close > range_low
            if pierce and reclaim and cp >= 0.50:
                spring_type = 3 if vol_ratio <= 1.0 else 2
                vol_sig = "dryup" if spring_type == 3 else "elevated"
                score = min(1.0, 0.5 + (range_low - low) / max(atr14, 1e-9) * 0.2 + (cp - 0.50) * 0.4)
                events.append(_event("Spring", bar_idx, ts, low, score, vol_sig))
                ctx = {**ctx, "spring_bar": bar_idx, "spring_low": low, "spring_type": spring_type, "phase_unlocked": "C"}

        # --- Test of Spring ---
        if ctx["spring_bar"] is not None and ctx["spring_type"] == 2:
            bars_since_spring = bar_idx - ctx["spring_bar"]
            if 2 <= bars_since_spring <= TEST_OF_SPRING_WINDOW:
                higher_low = low > ctx["spring_low"]
                if higher_low and vol_ratio <= DRYUP_RVOL and cp >= 0.50:
                    score = min(1.0, 0.4 + (DRYUP_RVOL - vol_ratio) * 0.5 + (cp - 0.50) * 0.3)
                    events.append(_event("ToS", bar_idx, ts, low, score, "dryup"))

        # --- SOS: Sign of Strength ---
        if phase in {"C", "D"} or ctx["spring_bar"] is not None:
            near_or_above_high = close >= range_high * 0.98
            if near_or_above_high and vol_ratio >= HIGH_RVOL and spread >= WIDE_SPREAD_ATR * atr14 and cp >= 0.70:
                score = min(1.0, 0.4 + (vol_ratio - HIGH_RVOL) * 0.1 + (cp - 0.70) * 0.5 + (spread / atr14 - WIDE_SPREAD_ATR) * 0.1)
                events.append(_event("SOS", bar_idx, ts, close, score, "strong"))
                ctx = {**ctx, "sos_bar": bar_idx, "phase_unlocked": "D"}

        # --- LPS: Last Point of Support ---
        if ctx["sos_bar"] is not None:
            bars_since_sos = bar_idx - ctx["sos_bar"]
            if 1 <= bars_since_sos <= 20:
                above_spring = ctx["spring_low"] is None or low > ctx["spring_low"]
                above_mid = low >= range_mid * 0.98
                if ret < 0 and vol_ratio <= 0.75 and spread <= 0.8 * atr14 and above_spring and above_mid:
                    score = min(1.0, 0.3 + (0.75 - vol_ratio) * 0.5 + (0.8 - spread / atr14) * 0.3)
                    events.append(_event("LPS", bar_idx, ts, low, score, "dryup"))

    # ===== DISTRIBUTION EVENTS =====
    elif side == "distribution":
        psy_emitted = False

        # --- PSY: Preliminary Supply ---
        if phase == "A" and ctx["bc_bar"] is None and _has_preliminary_spacing(
            ctx.get("psy_bar"), bar_idx
        ):
            lookback = window.tail(min(CLIMAX_LOOKBACK, len(window)))
            is_near_high = high >= float(lookback["high"].max()) * (1.0 - RANGE_PROXIMITY_PCT)
            rally_pct = _recent_move_pct(window)
            has_rejection = cp <= 0.45 or upper_tail_ratio >= 0.35
            non_climactic_volume = HIGH_RVOL <= vol_ratio < CLIMAX_RVOL
            wide_enough = spread >= TEST_SPREAD_ATR * atr14
            if (
                is_near_high
                and rally_pct >= 0.05
                and has_rejection
                and non_climactic_volume
                and wide_enough
            ):
                score = min(
                    0.82,
                    0.25
                    + (vol_ratio - HIGH_RVOL) * 0.08
                    + max(0.50 - cp, 0.0) * 0.35
                    + max(upper_tail_ratio - 0.25, 0.0) * 0.25
                    + min(rally_pct, 0.20) * 0.6,
                )
                events.append(
                    _event(
                        "PSY",
                        bar_idx,
                        ts,
                        high,
                        score,
                        "high_vol" if vol_ratio >= 1.8 else "moderate",
                    )
                )
                psy_emitted = True
                ctx = {
                    **ctx,
                    "psy_bar": bar_idx,
                    "anchored_high": high
                    if ctx["anchored_high"] is None
                    else max(float(ctx["anchored_high"]), high),
                    "anchor_source": "event",
                }

        # --- BC: Buying Climax ---
        if phase == "A" and ctx["bc_bar"] is None and not psy_emitted:
            lookback = window.tail(min(CLIMAX_LOOKBACK, len(window)))
            is_new_high = high >= float(lookback["high"].max())
            if is_new_high and vol_ratio >= CLIMAX_RVOL and spread >= WIDE_SPREAD_ATR * atr14 and cp <= 0.40:
                score = min(1.0, 0.4 + (vol_ratio - CLIMAX_RVOL) * 0.15 + (spread / atr14 - WIDE_SPREAD_ATR) * 0.1 + (0.40 - cp) * 0.5)
                events.append(_event("BC", bar_idx, ts, high, score, "climactic"))
                ctx = {**ctx, "bc_bar": bar_idx, "bc_high": high, "anchored_high": high, "anchor_source": "event"}
            elif is_new_high and vol_ratio >= HIGH_RVOL and spread >= 1.2 * atr14 and cp <= 0.45:
                score = min(1.0, 0.25 + (vol_ratio - HIGH_RVOL) * 0.1 + (0.45 - cp) * 0.4)
                events.append(_event("BC", bar_idx, ts, high, score, "high_vol"))
                ctx = {**ctx, "bc_bar": bar_idx, "bc_high": high, "anchored_high": high, "anchor_source": "event"}

        # --- AR: Automatic Reaction (post-BC) ---
        if ctx["bc_bar"] is not None and ctx.get("ar_low_dist") is None:
            bars_since_bc = bar_idx - ctx["bc_bar"]
            if 1 <= bars_since_bc <= AR_WINDOW:
                decline = (ctx["bc_high"] - close) / max(abs(ctx["bc_high"]), 1e-9)
                if spread >= WIDE_SPREAD_ATR * atr14 or decline >= 0.05:
                    score = min(1.0, 0.4 + decline * 3.0 + (spread / atr14 - 1.0) * 0.1)
                    events.append(_event("AR", bar_idx, ts, low, score, "sharp_decline"))
                    ctx = {**ctx, "ar_low_dist": low, "anchored_low": low, "phase_unlocked": "B"}

        # --- ST: Secondary Test (distribution) ---
        if phase in {"B", "C"} and ctx["bc_high"] is not None:
            near_bc = abs(high - ctx["bc_high"]) / max(abs(ctx["bc_high"]), 1e-9) <= RANGE_PROXIMITY_PCT
            if near_bc and vol_ratio <= LOW_RVOL and spread <= TEST_SPREAD_ATR * atr14:
                score = min(1.0, 0.3 + (LOW_RVOL - vol_ratio) * 0.5 + (TEST_SPREAD_ATR - spread / atr14) * 0.3)
                events.append(_event("ST", bar_idx, ts, high, score, "dryup"))

        # --- UT: Upthrust ---
        if phase in {"B", "C"}:
            pierce = high > range_high * (1.0 + RANGE_PIERCE_PCT)
            reject = close < range_high
            if pierce and reject and cp <= 0.35 and vol_ratio < 2.0:
                score = min(1.0, 0.4 + (high - range_high) / max(atr14, 1e-9) * 0.2 + (0.35 - cp) * 0.5)
                events.append(_event("UT", bar_idx, ts, high, score, "moderate"))

        # --- UTAD: Upthrust After Distribution ---
        elif phase in {"B", "C"}:
            pierce = high > range_high * (1.0 + RANGE_PIERCE_PCT)
            reject = close < range_high
            if pierce and reject and cp <= 0.35 and vol_ratio >= 2.0:
                score = min(1.0, 0.5 + (vol_ratio - 2.0) * 0.15 + (high - range_high) / max(atr14, 1e-9) * 0.15 + (0.35 - cp) * 0.3)
                events.append(_event("UTAD", bar_idx, ts, high, score, "climactic"))
                ctx = {**ctx, "phase_unlocked": "C"}

        # --- SOW: Sign of Weakness ---
        if phase in {"C", "D"} or ctx.get("bc_bar") is not None:
            below_low = close <= range_low * 0.99
            if below_low and vol_ratio >= HIGH_RVOL and spread >= WIDE_SPREAD_ATR * atr14 and cp <= 0.30:
                score = min(1.0, 0.4 + (vol_ratio - HIGH_RVOL) * 0.1 + (0.30 - cp) * 0.5 + (spread / atr14 - WIDE_SPREAD_ATR) * 0.1)
                events.append(_event("SOW", bar_idx, ts, close, score, "strong"))
                ctx = {**ctx, "sow_bar": bar_idx, "phase_unlocked": "D"}

        # --- LPSY: Last Point of Supply ---
        if ctx["sow_bar"] is not None:
            bars_since_sow = bar_idx - ctx["sow_bar"]
            if 1 <= bars_since_sow <= 20:
                below_mid = high <= range_mid * 1.02
                if ret > 0 and vol_ratio <= 0.75 and spread <= 0.8 * atr14 and below_mid:
                    score = min(1.0, 0.3 + (0.75 - vol_ratio) * 0.5 + (0.8 - spread / atr14) * 0.3)
                    events.append(_event("LPSY", bar_idx, ts, high, score, "dryup"))

    return events, ctx


def _dedupe_events(raw_events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Cluster same-type events within temporal window, keep highest score, cap total."""
    if not raw_events:
        return []
    sorted_events = sorted(raw_events, key=lambda e: e["bar_index"])
    deduped: list[dict[str, Any]] = []
    for ev in sorted_events:
        similar = [
            d for d in deduped
            if d["type"] == ev["type"] and abs(ev["bar_index"] - d["bar_index"]) <= EVENT_DEDUPE_WINDOW
        ]
        if not similar:
            deduped.append(ev)
        else:
            best = max(similar, key=lambda d: d["score"])
            if ev["score"] > best["score"]:
                deduped.remove(best)
                deduped.append(ev)
    if len(deduped) <= MAX_EVENTS_PER_SEGMENT:
        return sorted(deduped, key=lambda e: e["bar_index"])
    # Over budget: keep by priority
    priority_map = {t: i for i, t in enumerate(EVENT_PRIORITY)}
    deduped.sort(key=lambda e: priority_map.get(e["type"], 99))
    trimmed = deduped[:MAX_EVENTS_PER_SEGMENT]
    return sorted(trimmed, key=lambda e: e["bar_index"])


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
    raw_events: list[dict[str, Any]] | None = None,
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
    # Attach deduped events for this segment's bar range
    if raw_events:
        seg_events = [e for e in raw_events if start_idx <= e["bar_index"] <= end_idx]
        deduped = _dedupe_events(seg_events)
        if deduped:
            segment["events"] = deduped
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
    all_events: list[dict[str, Any]] = []
    schematic_ctx = _new_schematic_ctx()
    for idx in range(MIN_HISTORY_BARS - 1, len(x)):
        state = _classify_state(x.iloc[: idx + 1])
        state["index"] = idx
        state["datetime"] = str(x.iloc[idx]["datetime"])
        state["close"] = float(x.iloc[idx]["close"])
        raw_states.append(state)
        # Event detection pass
        bar_events, schematic_ctx = _detect_events(
            x.iloc[: idx + 1], idx, schematic_ctx,
            state["cycle_phase"], state["schematic_phase"],
        )
        all_events.extend(bar_events)

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

    segments = [_build_segment(x, group, all_events) for group in smoothed_groups]

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
