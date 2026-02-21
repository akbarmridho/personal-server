#!/usr/bin/env python3
# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportAttributeAccessIssue=false

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


REQUIRED_ARRAYS = ("daily", "intraday", "corp_actions")
REQUIRED_PRICE_COLS = ("datetime", "open", "high", "low", "close", "volume")


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


def load_ohlcv(path: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    for key in REQUIRED_ARRAYS:
        if key not in raw or not isinstance(raw[key], list) or len(raw[key]) == 0:
            raise ValueError(f"Missing required dependency: {key}")

    def prep(df: pd.DataFrame, name: str) -> pd.DataFrame:
        for col in REQUIRED_PRICE_COLS:
            if col not in df.columns:
                raise ValueError(f"{name} missing required field: {col}")
        x = df.copy()
        x["datetime"] = pd.to_datetime(x["datetime"], errors="coerce")
        x = (
            x.dropna(subset=["datetime"])
            .sort_values("datetime")
            .drop_duplicates(subset=["datetime"])
            .reset_index(drop=True)
        )
        for col in ("open", "high", "low", "close", "volume"):
            x[col] = pd.to_numeric(x[col], errors="coerce")
        x = x.dropna(subset=["open", "high", "low", "close", "volume"])
        if x.empty:
            raise ValueError(f"{name} has no valid rows")
        return x

    daily = prep(pd.DataFrame(raw["daily"]), "daily")
    intraday = prep(pd.DataFrame(raw["intraday"]), "intraday")

    corp = pd.DataFrame(raw["corp_actions"])
    if "datetime" in corp.columns:
        corp["datetime"] = pd.to_datetime(corp["datetime"], errors="coerce")
    elif "timestamp" in corp.columns:
        corp["datetime"] = pd.to_datetime(corp["timestamp"], unit="ms", errors="coerce")
    else:
        corp["datetime"] = pd.NaT

    return daily, intraday, corp


def add_ma_stack(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    x["EMA21"] = x["close"].ewm(span=21, adjust=False).mean()
    x["SMA50"] = x["close"].rolling(50).mean()
    x["SMA100"] = x["close"].rolling(100).mean()
    x["SMA200"] = x["close"].rolling(200).mean()
    return x


def add_atr14(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    prev_close = x["close"].shift(1)
    tr = pd.concat(
        [
            x["high"] - x["low"],
            (x["high"] - prev_close).abs(),
            (x["low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    x["ATR14"] = tr.rolling(14).mean()
    return x


def add_swings(df: pd.DataFrame, n: int = 2) -> pd.DataFrame:
    x = df.copy()
    sh = pd.Series(True, index=x.index)
    sl = pd.Series(True, index=x.index)
    for i in range(1, n + 1):
        sh &= x["high"] > x["high"].shift(i)
        sh &= x["high"] > x["high"].shift(-i)
        sl &= x["low"] < x["low"].shift(i)
        sl &= x["low"] < x["low"].shift(-i)
    x["swing_high"] = np.where(sh, x["high"], np.nan)
    x["swing_low"] = np.where(sl, x["low"], np.nan)
    return x


def classify_regime(df: pd.DataFrame) -> dict[str, Any]:
    swings_h = df[df["swing_high"].notna()][["datetime", "swing_high"]].tail(4)
    swings_l = df[df["swing_low"].notna()][["datetime", "swing_low"]].tail(4)
    if len(swings_h) < 2 or len(swings_l) < 2:
        return {
            "regime": "no_trade",
            "trend_bias": "neutral",
            "proof": {"reason": "insufficient_swings"},
        }

    hh = swings_h["swing_high"].iloc[-1] > swings_h["swing_high"].iloc[-2]
    hl = swings_l["swing_low"].iloc[-1] > swings_l["swing_low"].iloc[-2]
    lh = swings_h["swing_high"].iloc[-1] < swings_h["swing_high"].iloc[-2]
    ll = swings_l["swing_low"].iloc[-1] < swings_l["swing_low"].iloc[-2]

    if hh and hl:
        regime, trend_bias = "trend_continuation", "bullish"
    elif lh and ll:
        regime, trend_bias = "trend_continuation", "bearish"
    else:
        regime, trend_bias = "range_rotation", "neutral"

    return {
        "regime": regime,
        "trend_bias": trend_bias,
        "proof": {
            "last_swing_high": {
                "datetime": str(swings_h["datetime"].iloc[-1]),
                "value": float(swings_h["swing_high"].iloc[-1]),
            },
            "last_swing_low": {
                "datetime": str(swings_l["datetime"].iloc[-1]),
                "value": float(swings_l["swing_low"].iloc[-1]),
            },
        },
    }


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


def structure_status(
    prev_trend: str, choch_triggered: bool, bos_confirmed: bool
) -> str:
    if prev_trend == "neutral":
        return "no_signal"
    if choch_triggered and bos_confirmed:
        return "choch_plus_bos_confirmed"
    if choch_triggered:
        return "choch_only"
    return "no_signal"


def cluster_levels(
    levels: list[float], tolerance: float = 0.02
) -> list[dict[str, Any]]:
    if not levels:
        return []
    clusters: list[list[float]] = []
    for lvl in sorted(levels):
        if not clusters:
            clusters.append([lvl])
            continue
        center = float(np.mean(clusters[-1]))
        if abs(lvl - center) / max(center, 1e-9) <= tolerance:
            clusters[-1].append(lvl)
        else:
            clusters.append([lvl])
    out = []
    for c in clusters:
        touches = len(c)
        strength = classify_level_strength(touches)
        out.append(
            {
                "zone_mid": float(np.mean(c)),
                "zone_low": float(min(c)),
                "zone_high": float(max(c)),
                "touches": touches,
                "strength": strength,
            }
        )
    return out


def classify_level_strength(touches: int) -> str:
    if touches <= 1:
        return "strong_first_test"
    if touches == 2:
        return "strong"
    if touches == 3:
        return "weakening"
    return "fragile"


def role_reversal(last_close: float, level: float, was_support: bool) -> str:
    if was_support and last_close < level:
        return "support_broken_may_flip_to_resistance"
    if (not was_support) and last_close > level:
        return "resistance_broken_may_flip_to_support"
    return "no_flip_signal"


def derive_levels(df: pd.DataFrame) -> list[dict[str, Any]]:
    highs = df["swing_high"].dropna().tail(20).tolist()
    lows = df["swing_low"].dropna().tail(20).tolist()
    return cluster_levels([float(v) for v in highs + lows], tolerance=0.02)


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


def time_based_levels(df_daily: pd.DataFrame) -> dict[str, Any]:
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


def time_based_opens(df_daily: pd.DataFrame) -> dict[str, Any]:
    return time_based_levels(df_daily)


def nearest_round_levels(price: float, step: float = 100.0) -> dict[str, float]:
    base = round(price / step) * step
    return {
        "round_below": float(base - step),
        "round_at": float(base),
        "round_above": float(base + step),
    }


def latest_intraday_ib(df_intraday: pd.DataFrame) -> dict[str, Any]:
    x = df_intraday.copy()
    x["session"] = x["datetime"].dt.date
    latest_sess = sorted(x["session"].unique())[-1]
    d = x[x["session"] == latest_sess].copy()
    order = np.argsort(d["datetime"].to_numpy())
    d = d.iloc[order].reset_index(drop=True)
    if len(d) < 3:
        return {"state": "insufficient_session_bars"}

    seed = d.iloc[:2]
    ibh = float(seed["high"].max())
    ibl = float(seed["low"].min())
    state = "inside_ib_range"
    for i in range(2, len(d) - 1):
        c0 = float(d.iloc[i]["close"])
        c1 = float(d.iloc[i + 1]["close"])
        if c0 > ibh and c1 >= ibh:
            state = "accepted_above_ibh"
        elif c0 < ibl and c1 <= ibl:
            state = "accepted_below_ibl"
        elif c0 > ibh and c1 < ibh:
            state = "failed_break_above_ibh"
        elif c0 < ibl and c1 > ibl:
            state = "failed_break_below_ibl"
    return {"session": str(latest_sess), "ibh": ibh, "ibl": ibl, "state": state}


def latest_ib_state(df_intraday: pd.DataFrame) -> dict[str, Any]:
    return latest_intraday_ib(df_intraday)


def compute_period_ib_levels(
    df_daily: pd.DataFrame, period: str = "M", first_n_bars: int = 2
) -> tuple[pd.DataFrame, pd.Series, pd.Series, list[dict[str, Any]]]:
    x = df_daily.copy()
    x["period"] = x["datetime"].dt.to_period(period)
    ibh_line = pd.Series(np.nan, index=x.index, dtype="float64")
    ibl_line = pd.Series(np.nan, index=x.index, dtype="float64")
    period_info: list[dict[str, Any]] = []
    for p, g in x.groupby("period", sort=True):
        seed = g.head(first_n_bars)
        if len(seed) < first_n_bars:
            continue
        ibh = float(seed["high"].max())
        ibl = float(seed["low"].min())
        ibh_line.loc[g.index] = ibh
        ibl_line.loc[g.index] = ibl
        period_info.append({"period": str(p), "ibh": ibh, "ibl": ibl})
    return x, ibh_line, ibl_line, period_info


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


def detect_structure_events(df_daily: pd.DataFrame) -> list[dict[str, Any]]:
    x = df_daily.reset_index(drop=True)
    events: list[dict[str, Any]] = []
    last_high = None
    last_low = None
    last_side = None

    for i in range(len(x)):
        if pd.notna(x.loc[i, "swing_high"]):
            last_high = float(x.loc[i, "swing_high"])
        if pd.notna(x.loc[i, "swing_low"]):
            last_low = float(x.loc[i, "swing_low"])
        close = float(x.loc[i, "close"])
        dt = x.loc[i, "datetime"]

        if last_high is not None and close > last_high:
            events.append(
                {
                    "datetime": str(dt),
                    "side": "up",
                    "label": "BOS" if last_side == "up" else "CHOCH",
                    "broken_level": last_high,
                    "close": close,
                }
            )
            last_side = "up"
        elif last_low is not None and close < last_low:
            events.append(
                {
                    "datetime": str(dt),
                    "side": "down",
                    "label": "BOS" if last_side == "down" else "CHOCH",
                    "broken_level": last_low,
                    "close": close,
                }
            )
            last_side = "down"

    dedup: list[dict[str, Any]] = []
    seen = set()
    for e in events:
        key = (e["datetime"], e["side"], round(float(e["broken_level"]), 4))
        if key in seen:
            continue
        seen.add(key)
        dedup.append(e)
    return dedup[-16:]


def liquidity_draws(
    price: float,
    levels: list[dict[str, Any]],
    internal_levels: list[float] | None = None,
) -> dict[str, Any]:
    mids = sorted([float(z["zone_mid"]) for z in levels])
    above = [x for x in mids if x > price]
    below = [x for x in mids if x < price]
    out = {
        "current_draw": above[0] if above else None,
        "opposing_draw": below[-1] if below else None,
    }
    if internal_levels is not None:
        i_up = sorted([x for x in internal_levels if x > price])
        i_dn = sorted([x for x in internal_levels if x < price], reverse=True)
        out["internal_up"] = i_up[0] if i_up else None
        out["internal_down"] = i_dn[0] if i_dn else None
    return out


def liquidity_path_after_event(event_type: str) -> str:
    if event_type == "external_sweep":
        return "external_to_internal"
    if event_type == "internal_tag":
        return "internal_to_external"
    return "unclear"


def sweep_outcome(close_price: float, level: float, side: str) -> str:
    if side == "above":
        return "accepted" if close_price > level else "rejected"
    return "accepted" if close_price < level else "rejected"


def pick_draw_targets(
    external_levels: list[float], internal_levels: list[float], price: float
) -> dict[str, Any]:
    ext_up = sorted([x for x in external_levels if x > price])
    ext_dn = sorted([x for x in external_levels if x < price], reverse=True)
    int_up = sorted([x for x in internal_levels if x > price])
    int_dn = sorted([x for x in internal_levels if x < price], reverse=True)
    return {
        "external_up": ext_up[0] if ext_up else None,
        "external_down": ext_dn[0] if ext_dn else None,
        "internal_up": int_up[0] if int_up else None,
        "internal_down": int_dn[0] if int_dn else None,
    }


def value_area_from_hist(
    mids: np.ndarray, hist: np.ndarray, pct: float = 0.70
) -> dict[str, Any]:
    total = float(hist.sum())
    if total <= 0:
        return {"poc": None, "vah": None, "val": None}
    poc_idx = int(hist.argmax())
    order = np.argsort(hist)[::-1]
    cum = 0.0
    chosen = []
    for i in order:
        chosen.append(i)
        cum += float(hist[i])
        if cum >= total * pct:
            break
    vals = mids[np.array(chosen)]
    return {
        "poc": float(mids[poc_idx]),
        "vah": float(vals.max()),
        "val": float(vals.min()),
    }


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


def profile_from_range(df: pd.DataFrame, bins: int = 40) -> dict[str, Any]:
    lo, hi = float(df["low"].min()), float(df["high"].max())
    edges = np.linspace(lo, hi, bins + 1)
    hist = np.zeros(bins)
    mids = (edges[:-1] + edges[1:]) / 2.0
    for _, row in df.iterrows():
        li = max(np.searchsorted(edges, row["low"], side="right") - 1, 0)
        hi_i = min(np.searchsorted(edges, row["high"], side="right") - 1, bins - 1)
        if hi_i >= li:
            hist[li : hi_i + 1] += float(row["volume"])
    va = value_area_from_hist(mids, hist, pct=0.70)
    return {
        "poc": va["poc"],
        "vah": va["vah"],
        "val": va["val"],
        "hvn_top3": [float(x) for x in mids[np.argsort(hist)[-3:]]],
        "lvn_top3": [float(x) for x in mids[np.argsort(hist)[:3]]],
    }


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


def detect_imbalance_zones(df: pd.DataFrame) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    x = df.reset_index(drop=True)
    for i in range(1, len(x)):
        c2 = x.iloc[i - 1]
        c3 = x.iloc[i]
        # Opening gap (session-to-session void)
        if float(c3["low"]) > float(c2["high"]):
            low = float(c2["high"])
            high = float(c3["low"])
            out.append(
                {
                    "type": "OPENING_GAP",
                    "direction": "bullish",
                    "low": low,
                    "high": high,
                    "ce": float((low + high) / 2.0),
                    "start": str(c2["datetime"]),
                    "end": str(c3["datetime"]),
                }
            )
        elif float(c3["high"]) < float(c2["low"]):
            low = float(c3["high"])
            high = float(c2["low"])
            out.append(
                {
                    "type": "OPENING_GAP",
                    "direction": "bearish",
                    "low": low,
                    "high": high,
                    "ce": float((low + high) / 2.0),
                    "start": str(c2["datetime"]),
                    "end": str(c3["datetime"]),
                }
            )

        # Volume imbalance (close-open displacement with partial overlap)
        if float(c3["close"]) > float(c2["high"]) and float(c3["open"]) < float(
            c2["high"]
        ):
            low = float(max(min(c3["open"], c2["high"]), min(c3["low"], c2["low"])))
            high = float(c2["high"])
            if high > low:
                out.append(
                    {
                        "type": "VOLUME_IMBALANCE",
                        "direction": "bullish",
                        "low": low,
                        "high": high,
                        "ce": float((low + high) / 2.0),
                        "start": str(c2["datetime"]),
                        "end": str(c3["datetime"]),
                    }
                )
        elif float(c3["close"]) < float(c2["low"]) and float(c3["open"]) > float(
            c2["low"]
        ):
            low = float(c2["low"])
            high = float(min(max(c3["open"], c2["low"]), max(c3["high"], c2["high"])))
            if high > low:
                out.append(
                    {
                        "type": "VOLUME_IMBALANCE",
                        "direction": "bearish",
                        "low": low,
                        "high": high,
                        "ce": float((low + high) / 2.0),
                        "start": str(c2["datetime"]),
                        "end": str(c3["datetime"]),
                    }
                )

        if i >= 2:
            c1 = x.iloc[i - 2]
            bull = fvg_bounds(
                float(c1["high"]),
                float(c1["low"]),
                float(c3["high"]),
                float(c3["low"]),
                "bullish",
            )
            bear = fvg_bounds(
                float(c1["high"]),
                float(c1["low"]),
                float(c3["high"]),
                float(c3["low"]),
                "bearish",
            )
            if bull is not None:
                out.append(
                    {
                        "type": "FVG",
                        "direction": "bullish",
                        "low": float(bull["low"]),
                        "high": float(bull["high"]),
                        "ce": float(bull["ce"]),
                        "start": str(c1["datetime"]),
                        "end": str(c3["datetime"]),
                    }
                )
            elif bear is not None:
                out.append(
                    {
                        "type": "FVG",
                        "direction": "bearish",
                        "low": float(bear["low"]),
                        "high": float(bear["high"]),
                        "ce": float(bear["ce"]),
                        "start": str(c1["datetime"]),
                        "end": str(c3["datetime"]),
                    }
                )
    return out[-20:]


def infer_ifvg_zones(
    zones: list[dict[str, Any]], close_price: float, prev_close: float | None
) -> list[dict[str, Any]]:
    if prev_close is None:
        return []
    out: list[dict[str, Any]] = []
    for z in zones:
        if z.get("type") != "FVG":
            continue
        z_low = float(z["low"])
        z_high = float(z["high"])
        if z["direction"] == "bullish":
            if close_price < z_low and prev_close <= z_low:
                out.append(
                    {
                        **z,
                        "type": "IFVG",
                        "direction": "bearish",
                        "source_type": "FVG",
                        "source_direction": "bullish",
                    }
                )
        else:
            if close_price > z_high and prev_close >= z_high:
                out.append(
                    {
                        **z,
                        "type": "IFVG",
                        "direction": "bullish",
                        "source_type": "FVG",
                        "source_direction": "bearish",
                    }
                )
    return out[-8:]


def detect_fvg(df: pd.DataFrame) -> list[dict[str, Any]]:
    zones = detect_imbalance_zones(df)
    return [z for z in zones if z.get("type") == "FVG"][-12:]


def fvg_bounds(
    c1_high: float, c1_low: float, c3_high: float, c3_low: float, direction: str
) -> dict[str, Any] | None:
    if direction == "bullish":
        low = c1_high
        high = c3_low
    else:
        low = c3_high
        high = c1_low
    if high <= low:
        return None
    ce = (low + high) / 2.0
    return {"low": low, "high": high, "ce": ce}


def mitigation_state(
    zone_low: float, zone_high: float, price_low: float, price_high: float
) -> str:
    touched = price_high >= zone_low and price_low <= zone_high
    if not touched:
        return "unmitigated"
    fully = price_low <= zone_low and price_high >= zone_high
    if fully:
        return "fully_mitigated"
    return "partially_mitigated"


def add_volume_features(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    x["vol_ma20"] = x["volume"].rolling(20).mean()
    x["vol_ratio"] = x["volume"] / x["vol_ma20"]
    x["ret"] = x["close"].pct_change()
    return x


def classify_price_volume(change_pct: float, vol_ratio: float) -> str:
    if change_pct > 0 and vol_ratio >= 1.2:
        return "strong_up"
    if change_pct < 0 and vol_ratio <= 0.8:
        return "healthy_pullback"
    if change_pct > 0 and vol_ratio <= 0.8:
        return "weak_rally"
    if change_pct < 0 and vol_ratio >= 1.2:
        return "distribution"
    return "neutral"


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


def calculate_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


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


def main() -> None:
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

    regime = classify_regime(daily)
    levels = derive_levels(daily)
    last = daily.iloc[-1]
    last_close = float(last["close"])
    prev_close = float(daily.iloc[-2]["close"]) if len(daily) > 1 else None
    posture = ma_posture(last)
    adaptive_ma = choose_adaptive_ma(daily)
    ib = latest_ib_state(intraday)
    period_ib = latest_period_ib_state(daily, period="M", first_n_bars=2)
    events = detect_structure_events(daily)
    vp_base = vpvr_core(daily.tail(260))

    state, state_reason = infer_state(
        last_close,
        float(vp_base["val"]) if vp_base["val"] is not None else last_close,
        float(vp_base["vah"]) if vp_base["vah"] is not None else last_close,
        follow_close=prev_close,
    )

    last_labels = [e["label"] for e in events[-4:]]
    choch_triggered = "CHOCH" in last_labels
    bos_confirmed = choch_triggered and ("BOS" in last_labels)
    structure_state = structure_status(
        regime["trend_bias"], choch_triggered, bos_confirmed
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
    setup_id = choose_setup(
        regime=regime["regime"],
        ib_state=str(ib.get("state", "inside_ib_range")),
        breakout_state=bo_snap.get("status", "no_breakout"),
        structure_state=structure_state,
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
        "structure_events": events,
        "setup_selection": {
            "setup_id": setup_id,
            "cup_handle": cup_handle,
        },
        "divergence": divergence,
        "price_volume_summary": pv_summary,
        "distribution_days": dist_days,
        "informed_money": informed_money,
        "red_flags": red_flags,
    }

    imbalance_zones: list[dict[str, Any]] = []
    if "imbalance" in modules:
        imbalance_zones = detect_imbalance_zones(daily)
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
        breakout = breakout_snapshot(daily, levels)
        latest = add_volume_features(daily).iloc[-1]
        breakout["price_volume_class"] = classify_price_volume(
            float(latest.get("ret", 0.0) or 0.0),
            float(latest.get("vol_ratio", 1.0) or 1.0),
        )
        breakout["base_quality"] = base_quality(daily.tail(35))
        if bo_displacement is not None:
            breakout["displacement"] = bo_displacement
        result["breakout"] = breakout

    if "smc" in modules:
        eq = detect_equal_levels(daily)
        ob_breaker = detect_ob_breaker_zones(daily, events)
        range_low = float(daily.tail(120)["low"].min())
        range_high = float(daily.tail(120)["high"].max())
        internal_bias = "neutral"
        if events:
            internal_bias = "bullish" if events[-1]["side"] == "up" else "bearish"
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
