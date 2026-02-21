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
    add_atr14,
    add_ma_stack,
    add_swings,
    add_volume_features,
    calculate_rsi,
    classify_price_volume,
    classify_regime,
    cluster_levels,
    compute_period_ib_levels,
    derive_levels,
    detect_imbalance_zones,
    detect_structure_events,
    detect_trendline_levels,
    detect_wyckoff_spring,
    fvg_bounds,
    infer_ifvg_zones,
    latest_intraday_ib,
    liquidity_draws,
    liquidity_path_after_event,
    mitigation_state,
    pick_draw_targets,
    profile_from_range,
    structure_status,
    sweep_outcome,
    value_area_from_hist,
)


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
        help="Comma-separated modules: core,vpvr,imbalance,breakout,smc or all.",
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
        return {"core", "vpvr", "imbalance", "breakout", "smc"}
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
        "above_sma100": c >= float(row.get("SMA100", c)),
        "above_sma200": c >= float(row.get("SMA200", c)),
    }


def choose_adaptive_ma(
    df: pd.DataFrame,
    candidates: tuple[int, ...] = (3, 5, 10, 20, 50),
    lookback: int = 120,
) -> dict[str, Any]:
    x = df.tail(lookback).copy()
    best_n = None
    best_score = -1.0
    for n in candidates:
        col = f"SMA{n}"
        x[col] = x["close"].rolling(n).mean()
        v = x[col].dropna()
        if len(v) < 20:
            continue
        slope = x[col].diff()
        above = (x["close"] >= x[col]).astype(float)
        score = float((above * (slope > 0).astype(float)).sum())
        if score > best_score:
            best_score = score
            best_n = n
    return {"adaptive_period": best_n, "score": best_score}


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
# Period IB state
# ---------------------------------------------------------------------------


def latest_period_ib_state(
    df_daily: pd.DataFrame, period: str = "M", first_n_bars: int = 2
) -> dict[str, Any]:
    x, ibh_line, ibl_line, info = compute_period_ib_levels(
        df_daily, period=period, first_n_bars=first_n_bars
    )
    if len(info) == 0:
        return {"state": "insufficient_period_bars"}
    last = x.index[-1]
    prev = x.index[-2] if len(x) >= 2 else x.index[-1]
    ibh = float(ibh_line.loc[last])
    ibl = float(ibl_line.loc[last])
    c0 = float(x.loc[last, "close"])
    c1 = float(x.loc[prev, "close"])
    if c1 > ibh and c0 >= ibh:
        state = "accepted_above_ibh"
    elif c1 < ibl and c0 <= ibl:
        state = "accepted_below_ibl"
    elif c1 > ibh and c0 < ibh:
        state = "failed_break_above_ibh"
    elif c1 < ibl and c0 > ibl:
        state = "failed_break_below_ibl"
    else:
        state = "inside_ib_range"
    return {
        "period": period,
        "first_n_bars": first_n_bars,
        "ibh": ibh,
        "ibl": ibl,
        "state": state,
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


def prior_session_profiles(
    df_intraday: pd.DataFrame, max_sessions: int = 3
) -> list[dict[str, Any]]:
    x = df_intraday.copy()
    x["session"] = x["datetime"].dt.date
    sessions = sorted(x["session"].unique())
    if len(sessions) <= 1:
        return []
    out = []
    for s in sessions[-(max_sessions + 1) : -1]:
        d = x[x["session"] == s]
        if len(d) == 0:
            continue
        prof = profile_from_range(d, bins=30)
        out.append({"session": str(s), **prof})
    return out


def prior_session_pocs(
    df_intraday: pd.DataFrame, max_sessions: int = 3
) -> list[dict[str, Any]]:
    sessions = prior_session_profiles(df_intraday, max_sessions=max_sessions)
    return [{"session": s["session"], "poc": s["poc"]} for s in sessions]


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
# SMC helpers
# ---------------------------------------------------------------------------


def detect_equal_levels(df: pd.DataFrame, atr_mult: float = 0.2) -> dict[str, Any]:
    highs = df[df["swing_high"].notna()][["datetime", "swing_high", "ATR14"]].copy()
    lows = df[df["swing_low"].notna()][["datetime", "swing_low", "ATR14"]].copy()
    eqh, eql = [], []
    for i in range(1, len(highs)):
        h0 = float(highs.iloc[i - 1]["swing_high"])
        h1 = float(highs.iloc[i]["swing_high"])
        atr = highs.iloc[i]["ATR14"]
        tol = float(atr) * atr_mult if pd.notna(atr) else 0.0
        if abs(h1 - h0) <= tol:
            eqh.append({"datetime": str(highs.iloc[i]["datetime"]), "level": h1})
    for i in range(1, len(lows)):
        l0 = float(lows.iloc[i - 1]["swing_low"])
        l1 = float(lows.iloc[i]["swing_low"])
        atr = lows.iloc[i]["ATR14"]
        tol = float(atr) * atr_mult if pd.notna(atr) else 0.0
        if abs(l1 - l0) <= tol:
            eql.append({"datetime": str(lows.iloc[i]["datetime"]), "level": l1})
    return {"eqh": eqh[-5:], "eql": eql[-5:]}


def premium_discount_zone(
    range_low: float, range_high: float, price: float
) -> dict[str, Any]:
    eq = (range_low + range_high) / 2.0
    if price > eq:
        zone = "premium"
    elif price < eq:
        zone = "discount"
    else:
        zone = "equilibrium"
    return {
        "range_low": range_low,
        "range_high": range_high,
        "equilibrium": eq,
        "zone": zone,
    }


def choose_structure_bias(swing_bias: str, internal_bias: str) -> str:
    if swing_bias != "neutral":
        return swing_bias
    return internal_bias


def detect_ob_breaker_zones(
    df: pd.DataFrame, events: list[dict[str, Any]], lookback: int = 6
) -> list[dict[str, Any]]:
    if len(events) == 0:
        return []
    x = df.reset_index(drop=True)
    out: list[dict[str, Any]] = []
    for e in events[-8:]:
        edt = pd.Timestamp(e["datetime"])
        idxs = x.index[x["datetime"] == edt]
        if len(idxs) == 0:
            continue
        i = int(idxs[0])
        start = max(i - lookback, 0)
        seed = x.iloc[start:i]
        if len(seed) == 0:
            continue

        if e["side"] == "up":
            prior = seed[seed["close"] < seed["open"]]
            if len(prior) == 0:
                continue
            c = prior.iloc[-1]
            direction = "bullish"
        else:
            prior = seed[seed["close"] > seed["open"]]
            if len(prior) == 0:
                continue
            c = prior.iloc[-1]
            direction = "bearish"

        zone_low = float(min(c["open"], c["close"]))
        zone_high = float(max(c["open"], c["close"]))
        out.append(
            {
                "block_type": "OB",
                "direction": direction,
                "low": zone_low,
                "high": zone_high,
                "source_event": e["label"],
                "source_datetime": str(e["datetime"]),
            }
        )

    if len(out) == 0:
        return out
    last_close = float(x["close"].iloc[-1])
    for z in out:
        if z["direction"] == "bullish" and last_close < z["low"]:
            z["block_type"] = "BREAKER"
            z["direction"] = "bearish"
        elif z["direction"] == "bearish" and last_close > z["high"]:
            z["block_type"] = "BREAKER"
            z["direction"] = "bullish"
    return out[-6:]


# ---------------------------------------------------------------------------
# Fibonacci
# ---------------------------------------------------------------------------


def fib_retracement_levels(
    swing_low: float, swing_high: float, trend: str = "up"
) -> dict[str, float]:
    ratios = [0.236, 0.382, 0.5, 0.618, 0.706, 0.786]
    span = swing_high - swing_low
    out: dict[str, float] = {}
    if trend == "up":
        for r in ratios:
            out[f"fib_{r}"] = float(swing_high - span * r)
    else:
        for r in ratios:
            out[f"fib_{r}"] = float(swing_low + span * r)
    return out


def fib_extension_levels(
    swing_low: float, swing_high: float, trend: str = "up"
) -> dict[str, float]:
    ratios = [1.0, 1.272, 1.618, 2.618]
    span = swing_high - swing_low
    out: dict[str, float] = {}
    if trend == "up":
        for r in ratios:
            out[f"ext_{r}"] = float(swing_low + span * r)
    else:
        for r in ratios:
            out[f"ext_{r}"] = float(swing_high - span * r)
    return out


def ote_zone(swing_low: float, swing_high: float) -> dict[str, float]:
    span = swing_high - swing_low
    return {
        "fib_0_618": float(swing_high - span * 0.618),
        "fib_0_706": float(swing_high - span * 0.706),
        "fib_0_786": float(swing_high - span * 0.786),
    }


def derive_fib_context(
    df_daily: pd.DataFrame, trend_bias: str
) -> dict[str, Any] | None:
    highs = df_daily[df_daily["swing_high"].notna()][["datetime", "swing_high"]].copy()
    lows = df_daily[df_daily["swing_low"].notna()][["datetime", "swing_low"]].copy()
    if len(highs) == 0 or len(lows) == 0:
        return None

    if trend_bias == "bearish":
        trend = "down"
        anchor_high = highs.iloc[-1]
        cands = lows[lows["datetime"] >= anchor_high["datetime"]]
        anchor_low = cands.iloc[-1] if len(cands) > 0 else lows.iloc[-1]
    else:
        trend = "up"
        anchor_low = lows.iloc[-1]
        cands = highs[highs["datetime"] >= anchor_low["datetime"]]
        anchor_high = cands.iloc[-1] if len(cands) > 0 else highs.iloc[-1]

    swing_low = float(anchor_low["swing_low"])
    swing_high = float(anchor_high["swing_high"])
    if swing_high <= swing_low:
        return None

    retr = fib_retracement_levels(swing_low, swing_high, trend=trend)
    ext = fib_extension_levels(swing_low, swing_high, trend=trend)
    return {
        "trend": trend,
        "anchors": {
            "swing_low": {
                "datetime": str(anchor_low["datetime"]),
                "value": swing_low,
            },
            "swing_high": {
                "datetime": str(anchor_high["datetime"]),
                "value": swing_high,
            },
        },
        "retracements": retr,
        "extensions": ext,
        "ote": ote_zone(swing_low, swing_high),
    }


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


def detect_cup_and_handle(
    df: pd.DataFrame,
    lookback: int = 140,
    handle_lookback: int = 22,
    min_cup_depth: float = 0.12,
    max_handle_depth: float = 0.12,
    rim_tolerance: float = 0.04,
) -> dict[str, Any]:
    x = df.tail(lookback).reset_index(drop=True)
    if len(x) < 60:
        return {"detected": False, "reason": "insufficient_bars"}

    hi_idx = int(x["high"].idxmax())
    left_rim = float(x.loc[hi_idx, "high"])
    if hi_idx >= len(x) - 20:
        return {"detected": False, "reason": "left_rim_too_recent"}

    right_window = x.iloc[hi_idx + 20 :]
    if right_window.empty:
        return {"detected": False, "reason": "missing_right_window"}
    right_idx_local = int(right_window["high"].idxmax())
    right_rim = float(x.loc[right_idx_local, "high"])

    rim_delta = abs(right_rim - left_rim) / max(left_rim, 1e-9)
    if rim_delta > rim_tolerance:
        return {"detected": False, "reason": "rim_mismatch"}

    cup_slice = x.iloc[hi_idx : right_idx_local + 1]
    if len(cup_slice) < 20:
        return {"detected": False, "reason": "cup_too_short"}
    cup_low = float(cup_slice["low"].min())
    cup_depth = (left_rim - cup_low) / max(left_rim, 1e-9)
    if cup_depth < min_cup_depth:
        return {"detected": False, "reason": "cup_too_shallow"}

    handle_slice = x.tail(handle_lookback)
    handle_low = float(handle_slice["low"].min())
    handle_depth = (right_rim - handle_low) / max(right_rim, 1e-9)
    if handle_depth > max_handle_depth:
        return {"detected": False, "reason": "handle_too_deep"}

    last_close = float(x["close"].iloc[-1])
    breakout_ready = last_close >= right_rim * (1 - rim_tolerance)
    return {
        "detected": bool(breakout_ready),
        "reason": "ok" if breakout_ready else "not_breakout_ready",
        "left_rim": left_rim,
        "right_rim": right_rim,
        "cup_low": cup_low,
        "cup_depth": float(cup_depth),
        "handle_depth": float(handle_depth),
    }


def choose_setup(
    regime: str,
    ib_state: str,
    breakout_state: str,
    structure_state: str = "no_signal",
    spring_confirmed: bool = False,
    cup_handle_confirmed: bool = False,
) -> str:
    if structure_state == "choch_plus_bos_confirmed":
        return "S3"
    if structure_state == "choch_only":
        return "NO_VALID_SETUP"
    if spring_confirmed:
        return "S6"
    if regime == "trend_continuation" and breakout_state == "valid_breakout":
        return "S1"
    if regime == "trend_continuation" and cup_handle_confirmed:
        return "S5"
    if regime == "trend_continuation" and ib_state in {
        "inside_ib_range",
        "failed_break_below_ibl",
    }:
        return "S2"
    if regime in {"potential_reversal", "range_rotation"} and ib_state in {
        "failed_break_above_ibh",
        "failed_break_below_ibl",
    }:
        return "S3"
    if regime == "range_rotation":
        return "S4"
    return "NO_VALID_SETUP"


# ---------------------------------------------------------------------------
# Divergence and volume diagnostics
# ---------------------------------------------------------------------------


def detect_bearish_divergence(
    df: pd.DataFrame, min_bars: int = 5, max_bars: int = 60
) -> dict[str, Any]:
    pivots = df[df["swing_high"].notna()].copy()
    pivots = pivots[pivots["RSI14"].notna()]
    if len(pivots) < 2:
        return {"status": "no_divergence", "reason": "insufficient_pivot_highs"}
    last2 = pivots.tail(2)
    i1, i2 = last2.index[0], last2.index[1]
    bars_apart = df.index.get_loc(i2) - df.index.get_loc(i1)
    if bars_apart < min_bars or bars_apart > max_bars:
        return {"status": "no_divergence", "reason": "pivot_spacing_not_comparable"}
    p1, p2 = float(last2["high"].iloc[0]), float(last2["high"].iloc[1])
    r1, r2 = float(last2["RSI14"].iloc[0]), float(last2["RSI14"].iloc[1])
    if not (p2 > p1 and r2 < r1):
        return {"status": "no_divergence", "reason": "no_price_rsi_divergence"}
    recent_sl = (
        float(df[df["swing_low"].notna()]["swing_low"].iloc[-1])
        if df["swing_low"].notna().any()
        else np.nan
    )
    vf = df.iloc[-1]
    vol_ratio = (
        float(vf["vol_ratio"])
        if "vol_ratio" in vf.index and pd.notna(vf.get("vol_ratio"))
        else 0.0
    )
    confirmed = (
        pd.notna(recent_sl)
        and float(df["close"].iloc[-1]) < recent_sl
        and vol_ratio > 1.0
    )
    status = "divergence_confirmed" if confirmed else "divergence_unconfirmed"
    confidence = "HIGH" if max(r1, r2) >= 60 and (r1 - r2) >= 5 else "MEDIUM"
    return {
        "status": status,
        "confidence": confidence,
        "price_high_1": p1,
        "price_high_2": p2,
        "rsi_high_1": r1,
        "rsi_high_2": r2,
        "reference_swing_low": recent_sl if pd.notna(recent_sl) else None,
    }


def classify_pv_window(df: pd.DataFrame, window: int = 20) -> dict[str, Any]:
    x = add_volume_features(df).tail(window)
    counts: dict[str, int] = {}
    for _, row in x.iterrows():
        chg = float(row.get("ret", 0.0) or 0.0)
        vr = float(row.get("vol_ratio", 1.0) or 1.0)
        label = classify_price_volume(chg, vr)
        counts[label] = counts.get(label, 0) + 1
    return {"window": window, "distribution": counts}


def infer_wyckoff_context(
    state: str, trend_bias: str, pv_summary: dict[str, Any]
) -> str:
    dist = pv_summary.get("distribution", {})
    dist_count = dist.get("distribution", 0)
    strong_up = dist.get("strong_up", 0)
    if state == "imbalance" and trend_bias == "bullish":
        return "markup"
    if state == "imbalance" and trend_bias == "bearish":
        return "markdown"
    if state == "balance" and trend_bias == "bearish":
        if strong_up > dist_count:
            return "accumulation"
        return "markdown"
    if state == "balance" and trend_bias == "bullish":
        if dist_count > strong_up:
            return "distribution"
        return "markup"
    if state == "balance":
        if dist_count >= 3:
            return "distribution"
        if strong_up >= 3:
            return "accumulation"
    return "unclear"


def count_distribution_days(df: pd.DataFrame, window: int = 20) -> dict[str, Any]:
    x = add_volume_features(df).tail(window)
    days = x[(x["ret"] < -0.03) & (x["vol_ratio"] > 1.2)]
    return {
        "count": int(len(days)),
        "dates": [str(d) for d in days["datetime"].tolist()]
        if "datetime" in days.columns
        else [],
    }


def analyze_informed_money(df: pd.DataFrame) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    x = add_volume_features(df)
    recent = x.tail(30)
    if recent.empty:
        return signals
    recent_high = float(recent["high"].max())
    high_idx = int(x.index.get_loc(recent["high"].idxmax()))
    days_since_peak = len(x) - high_idx - 1
    if days_since_peak <= 10:
        near_peak = recent[recent["high"] > recent_high * 0.95]
        if len(near_peak) > 0:
            mean_vr = (
                float(near_peak["vol_ratio"].mean())
                if near_peak["vol_ratio"].notna().any()
                else 0.0
            )
            if mean_vr > 1.3:
                signals.append(
                    {
                        "type": "peak_distribution",
                        "evidence": f"high_volume_{mean_vr:.1f}x_near_peak",
                    }
                )
    dist_days = recent[(recent["ret"] < -0.03) & (recent["vol_ratio"] > 1.2)]
    if len(dist_days) >= 2:
        signals.append(
            {
                "type": "persistent_distribution",
                "evidence": f"{len(dist_days)}_distribution_days",
            }
        )
    if len(dist_days) > 0:
        last_dist_idx = int(x.index.get_loc(dist_days.index[-1]))
        days_after = len(x) - last_dist_idx - 1
        if days_after >= 2:
            recovery = x.iloc[
                last_dist_idx + 1 : last_dist_idx + min(days_after, 4) + 1
            ]
            if len(recovery) >= 2:
                gain = (
                    float(recovery["close"].iloc[-1]) - float(recovery["close"].iloc[0])
                ) / max(float(recovery["close"].iloc[0]), 1e-9)
                if gain < 0.03:
                    signals.append(
                        {
                            "type": "weak_recovery",
                            "evidence": f"only_{gain * 100:.1f}pct_bounce_after_distribution",
                        }
                    )
    return signals


# ---------------------------------------------------------------------------
# Red flags
# ---------------------------------------------------------------------------


def build_red_flags(
    regime: str,
    breakout_state: str,
    level_touches: int,
    divergence_state: str,
    structure_state: str,
    last_close: float,
    ema21: float,
    sma50: float,
    distribution_day_count: int,
    breakout_displacement_state: str | None = None,
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
    if divergence_state == "divergence_confirmed":
        flags.append(
            {
                "flag_id": "F5_DIVERGENCE_ESCALATION",
                "severity": "HIGH",
                "why": "confirmed_momentum_divergence",
            }
        )
    if structure_state == "choch_only":
        flags.append(
            {
                "flag_id": "F10_UNCONFIRMED_CHOCH",
                "severity": "MEDIUM",
                "why": "choch_without_confirmation_bos",
            }
        )
    if last_close < ema21:
        flags.append(
            {
                "flag_id": "F7_MA_BREAKDOWN",
                "severity": "HIGH",
                "why": "price_below_ema21",
            }
        )
    if last_close < sma50:
        flags.append(
            {
                "flag_id": "F7_MA_BREAKDOWN",
                "severity": "CRITICAL",
                "why": "price_below_sma50",
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
                "flag_id": "F17_BREAKOUT_STALLING",
                "severity": "MEDIUM",
                "why": "breakout_lacks_clean_displacement",
            }
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
    imbalance: dict[str, Any] | None,
    breakout: dict[str, Any] | None,
    smc: dict[str, Any] | None,
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
                "F6_MARKET_CONTEXT_MISMATCH",
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
                    "F15_NO_NEXT_ZONE_PATH",
                    "MEDIUM",
                    "breakout_without_next_zone_target",
                )
            if b_side == "down" and targets.get("external_down") is None:
                add_flag(
                    flags,
                    "F15_NO_NEXT_ZONE_PATH",
                    "MEDIUM",
                    "breakout_without_next_zone_target",
                )

    ns = nearest_support_distance_pct(last_close, levels)
    if ns is not None and ns > 0.10:
        add_flag(
            flags,
            "F9_NO_NEARBY_SUPPORT",
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
            "F16_LIQUIDITY_MAP_MISSING",
            "MEDIUM",
            "liquidity_map_incomplete_draw_targets_or_sweep",
        )

    if "smc" in modules and smc is not None:
        eq = smc.get("equal_levels", {}) if isinstance(smc, dict) else {}
        obs = smc.get("ob_breaker_zones", []) if isinstance(smc, dict) else []
        has_smc_evidence = (
            len(eq.get("eqh", [])) + len(eq.get("eql", [])) + len(obs)
        ) > 0
        if not has_smc_evidence:
            add_flag(
                flags,
                "F12_SMC_EVIDENCE_GAP",
                "MEDIUM",
                "smc_module_selected_without_sufficient_smc_evidence",
            )

    if "vpvr" in modules and vpvr is not None:
        has_key = (
            vpvr.get("poc") is not None
            and vpvr.get("vah") is not None
            and vpvr.get("val") is not None
        )
        has_prior_session = len(vpvr.get("prior_session_pocs", [])) > 0
        if not has_key or not has_prior_session:
            add_flag(
                flags,
                "F13_VOLUME_CONFLUENCE_WEAK",
                "MEDIUM",
                "volume_profile_context_lacks_confluence_or_prior_session_reference",
            )

    if "imbalance" in modules and imbalance is not None:
        zones = imbalance.get("zones", []) if isinstance(imbalance, dict) else []
        if len(zones) == 0:
            add_flag(
                flags,
                "F14_IMBALANCE_QUALITY_WEAK",
                "MEDIUM",
                "imbalance_module_selected_without_active_zones",
            )
        else:
            has_ce = all("ce" in z and z.get("ce") is not None for z in zones)
            fresh = any(
                z.get("mitigation_state") in {"unmitigated", "partially_mitigated"}
                for z in zones
            )
            if not has_ce or not fresh:
                add_flag(
                    flags,
                    "F14_IMBALANCE_QUALITY_WEAK",
                    "MEDIUM",
                    "imbalance_quality_weak_missing_ce_or_fresh_state",
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

    input_path = Path(args.input).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    daily, intraday, corp = load_ohlcv(input_path)
    daily = add_ma_stack(daily)
    daily = add_atr14(daily)
    daily = add_swings(daily, n=args.swing_n)
    daily["RSI14"] = calculate_rsi(daily["close"])
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

    levels = derive_levels(daily)
    last = daily.iloc[-1]
    last_close = float(last["close"])
    prev_close = float(daily.iloc[-2]["close"]) if len(daily) > 1 else None
    posture = ma_posture(last)
    adaptive_ma = choose_adaptive_ma(daily)
    ib = latest_intraday_ib(intraday)
    period_ib = latest_period_ib_state(daily, period="M", first_n_bars=2)
    vp_base = vpvr_core(daily.tail(260))

    state, state_reason = infer_state(
        last_close,
        float(vp_base["val"]) if vp_base["val"] is not None else last_close,
        float(vp_base["vah"]) if vp_base["vah"] is not None else last_close,
        follow_close=prev_close,
    )

    divergence = detect_bearish_divergence(daily)
    pv_summary = classify_pv_window(daily, window=20)
    wyckoff_ctx = infer_wyckoff_context(state, regime["trend_bias"], pv_summary)
    dist_days = count_distribution_days(daily, window=20)
    informed_money = analyze_informed_money(daily)

    nearest_mid = levels[-1]["zone_mid"] if levels else last_close
    role_reversal_note = role_reversal(
        last_close, float(nearest_mid), was_support=(regime["trend_bias"] == "bullish")
    )
    fib_ctx = derive_fib_context(daily, trend_bias=regime["trend_bias"])
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
    cup_handle = detect_cup_and_handle(daily)
    spring = detect_wyckoff_spring(daily, events, wyckoff_ctx)
    setup_id = choose_setup(
        regime=regime["regime"],
        ib_state=str(ib.get("state", "inside_ib_range")),
        breakout_state=bo_snap.get("status", "no_breakout"),
        structure_state=structure_state,
        spring_confirmed=bool(spring.get("detected", False)),
        cup_handle_confirmed=bool(cup_handle.get("detected", False)),
    )
    max_touches = max((z["touches"] for z in levels), default=0)
    red_flags = build_red_flags(
        regime=regime["regime"],
        breakout_state=bo_snap.get("status", "no_breakout"),
        level_touches=max_touches,
        divergence_state=divergence["status"],
        structure_state=structure_state,
        last_close=last_close,
        ema21=float(last.get("EMA21", last_close)),
        sma50=float(last.get("SMA50", last_close)),
        distribution_day_count=dist_days["count"],
        breakout_displacement_state=bo_displacement,
    )

    result: dict[str, Any] = {
        "symbol": symbol,
        "input_path": str(input_path),
        "modules": sorted(modules),
        "data": {
            "daily_rows": int(len(daily)),
            "intraday_rows": int(len(intraday)),
            "corp_actions_rows": int(len(corp)),
            "daily_start": str(daily["datetime"].iloc[0]),
            "daily_end": str(daily["datetime"].iloc[-1]),
            "intraday_start": str(intraday["datetime"].iloc[0]),
            "intraday_end": str(intraday["datetime"].iloc[-1]),
        },
        "state_and_regime": {
            "state": state,
            "state_reason": state_reason,
            "regime": regime["regime"],
            "trend_bias": regime["trend_bias"],
            "regime_proof": regime["proof"],
            "structure_status": structure_state,
            "wyckoff_context": wyckoff_ctx,
        },
        "levels": {
            "zones": levels[:12],
            "ma_posture": posture,
            "adaptive_ma": adaptive_ma,
            "time_based_opens": time_based_opens(daily),
            "round_levels": nearest_round_levels(last_close),
            "role_reversal_note": role_reversal_note,
            "fib_context": fib_ctx,
        },
        "ib_state": ib,
        "period_ib_state": period_ib,
        "structure_events": [
            {
                "datetime": str(e["datetime"]),
                "side": e["side"],
                "label": e["label"],
                "broken_level": float(e["broken_level"]),
                "close": float(e["close"]),
                "count": int(e.get("count", 1)),
            }
            for e in events
        ],
        "setup_selection": {
            "setup_id": setup_id,
            "cup_handle": cup_handle,
            "spring": spring,
        },
        "divergence": divergence,
        "price_volume_summary": pv_summary,
        "distribution_days": dist_days,
        "informed_money": informed_money,
        "red_flags": red_flags,
    }

    imbalance_zones: list[dict[str, Any]] = []
    if "imbalance" in modules:
        imbalance_zones = detect_imbalance_zones(daily, dt_key="start")
        ifvg_zones = infer_ifvg_zones(imbalance_zones, last_close, prev_close)
        imbalance_zones.extend(ifvg_zones)
        imbalance_zones = imbalance_zones[-20:]
        low = float(daily["low"].iloc[-1])
        high = float(daily["high"].iloc[-1])
        result["imbalance"] = {
            "zones": [
                {
                    **z,
                    "mitigation_state": mitigation_state(
                        float(z["low"]), float(z["high"]), low, high
                    ),
                }
                for z in imbalance_zones
            ],
        }

    internal_levels = (
        [float(z["ce"]) for z in imbalance_zones if "ce" in z]
        if imbalance_zones
        else None
    )
    liq = liquidity_draws(last_close, levels, internal_levels=internal_levels)
    ext_levels = [float(z["zone_mid"]) for z in levels]
    int_levels = internal_levels if internal_levels is not None else []
    liq["draw_targets"] = pick_draw_targets(ext_levels, int_levels, last_close)

    # Sweep event detection with richer enum support
    sweep_event = "none"
    sweep_outcome_value = "unresolved"
    if events:
        last_event = events[-1]
        side = "above" if last_event["side"] == "up" else "below"
        # Check if the swept level matches an EQH/EQL (when smc module active)
        sweep_event = "swing_swept"
        sweep_outcome_value = sweep_outcome(
            last_close, float(last_event["broken_level"]), side
        )
    liq["sweep_event"] = sweep_event
    liq["sweep_outcome"] = sweep_outcome_value
    event_type = "external_sweep" if sweep_event != "none" else "none"
    liq["liquidity_path"] = liquidity_path_after_event(event_type)

    # Trendline sweep check (runs regardless of smc module)
    if liq["sweep_event"] == "swing_swept" and events:
        trendlines = detect_trendline_levels(daily)
        broken_lvl = float(events[-1]["broken_level"])
        for tl in trendlines:
            proj = float(tl["projected_level"])
            if abs(proj - broken_lvl) / max(broken_lvl, 1e-9) < 0.01:
                liq["sweep_event"] = "trendline_swept"
                break

    result["liquidity"] = liq

    if "vpvr" in modules:
        vp = vpvr_core(daily.tail(260))
        anchor_vp = anchored_profile(daily, regime["trend_bias"], max_bars=260)
        session_profiles = prior_session_profiles(intraday, max_sessions=3)
        result["vpvr"] = {
            **vp,
            "acceptance": acceptance_vs_value(
                last_close,
                float(vp["vah"]),
                float(vp["val"]),
                prev_close=prev_close,
            )
            if vp["vah"] is not None and vp["val"] is not None
            else "inside_value",
            "profile_modes": ["fixed", "anchored", "session"],
            "anchored_profile": anchor_vp,
            "session_profiles": session_profiles,
            "prior_session_pocs": prior_session_pocs(intraday, max_sessions=3),
        }

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
        result["breakout"] = breakout_result

    if "smc" in modules:
        eq = detect_equal_levels(daily)
        ob_breaker = detect_ob_breaker_zones(daily, events)
        range_low = float(daily.tail(120)["low"].min())
        range_high = float(daily.tail(120)["high"].max())
        internal_bias = "neutral"
        if events:
            internal_bias = "bullish" if events[-1]["side"] == "up" else "bearish"

        # Enrich sweep_event with EQH/EQL context
        if eq and liq.get("sweep_event") in ("swing_swept", "trendline_swept"):
            broken_lvl = float(events[-1]["broken_level"]) if events else 0.0
            for h in eq.get("eqh", []):
                if abs(float(h["level"]) - broken_lvl) / max(broken_lvl, 1e-9) < 0.005:
                    liq["sweep_event"] = "eqh_swept"
                    break
            for l_item in eq.get("eql", []):
                if abs(float(l_item["level"]) - broken_lvl) / max(broken_lvl, 1e-9) < 0.005:
                    liq["sweep_event"] = "eql_swept"
                    break

        result["smc"] = {
            "equal_levels": eq,
            "ob_breaker_zones": ob_breaker,
            "premium_discount": premium_discount_zone(
                range_low, range_high, last_close
            ),
            "structure_bias": choose_structure_bias(
                regime["trend_bias"], internal_bias
            ),
        }

    result["red_flags"] = enrich_red_flags(
        red_flags=result["red_flags"],
        last_close=last_close,
        regime=regime["regime"],
        levels=levels,
        modules=modules,
        liquidity=result.get("liquidity", {}),
        vpvr=result.get("vpvr"),
        imbalance=result.get("imbalance"),
        breakout=result.get("breakout"),
        smc=result.get("smc"),
    )

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
