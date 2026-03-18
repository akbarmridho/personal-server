#!/usr/bin/env python3
"""Shared deterministic helpers for technical-analysis scripts."""
# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportAttributeAccessIssue=false

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REQUIRED_ARRAYS = ("daily",)
REQUIRED_PRICE_COLS = ("datetime", "open", "high", "low", "close", "volume")
TA_INTRADAY_MINUTES = 15
OPTIONAL_NUMERIC_COLS = (
    "timestamp",
    "value",
    "frequency",
    "foreign_buy",
    "foreign_sell",
    "foreign_flow",
)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------


def resample_intraday(
    df_intraday: pd.DataFrame, minutes: int = 60
) -> pd.DataFrame:
    x = df_intraday.copy()
    if x.empty:
        return x

    x = x.sort_values("datetime").reset_index(drop=True)
    diffs = x["datetime"].diff().dt.total_seconds().dropna()
    positive_diffs = diffs[diffs > 0]
    typical_gap = (
        float(positive_diffs.min()) if not positive_diffs.empty else float(minutes * 60)
    )
    if typical_gap >= minutes * 60 * 0.8:
        return x.reset_index(drop=True)

    gap_seconds = x["datetime"].diff().dt.total_seconds()
    new_session = (
        gap_seconds.isna()
        | (x["datetime"].dt.date != x["datetime"].shift(1).dt.date)
        | (gap_seconds > 60)
    )
    x["_session_id"] = new_session.cumsum()

    output_frames: list[pd.DataFrame] = []
    resolution_seconds = minutes * 60

    aggregate_spec: dict[str, tuple[str, str]] = {
        "open": ("open", "first"),
        "high": ("high", "max"),
        "low": ("low", "min"),
        "close": ("close", "last"),
        "volume": ("volume", "sum"),
    }
    for col in ("value", "frequency", "foreign_buy", "foreign_sell", "foreign_flow"):
        if col in x.columns:
            aggregate_spec[col] = (col, "sum")
    if "is_partial" in x.columns:
        aggregate_spec["is_partial"] = ("is_partial", "last")

    for _, session_df in x.groupby("_session_id", sort=False):
        session_df = session_df.sort_values("datetime").reset_index(drop=True)
        if session_df.empty:
            continue

        anchor_dt = session_df["datetime"].iloc[0]
        anchor_ts = (
            float(session_df["timestamp"].iloc[0])
            if "timestamp" in session_df.columns and pd.notna(session_df["timestamp"].iloc[0])
            else anchor_dt.timestamp()
        )
        bucket_index = (
            (session_df["datetime"] - anchor_dt).dt.total_seconds() // resolution_seconds
        ).astype(int)
        session_df = session_df.assign(_bucket_index=bucket_index)
        agg = (
            session_df.groupby("_bucket_index", sort=True)
            .agg(**aggregate_spec)
            .reset_index()
        )
        agg["datetime"] = anchor_dt + pd.to_timedelta(
            agg["_bucket_index"] * minutes, unit="m"
        )
        agg["timestamp"] = (anchor_ts + agg["_bucket_index"] * resolution_seconds).astype(int)
        agg["date"] = agg["datetime"].dt.strftime("%Y-%m-%d")
        agg["interval"] = f"{minutes}m"
        output_frames.append(agg.drop(columns=["_bucket_index"]))

    if not output_frames:
        return x.drop(columns=["_session_id"]).reset_index(drop=True)

    out = pd.concat(output_frames, ignore_index=True)
    return out.sort_values("datetime").reset_index(drop=True)


def load_ohlcv(
    path: Path,
    include_intraday: bool = True,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    for key in REQUIRED_ARRAYS:
        if key not in raw or not isinstance(raw[key], list) or len(raw[key]) == 0:
            raise ValueError(f"Missing required dependency: {key}")

    def _prep(df: pd.DataFrame, name: str) -> pd.DataFrame:
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
        for col in ("open", "high", "low", "close", "volume", *OPTIONAL_NUMERIC_COLS):
            if col not in x.columns:
                continue
            x[col] = pd.to_numeric(x[col], errors="coerce")
        x = x.dropna(subset=["open", "high", "low", "close", "volume"])
        if x.empty:
            raise ValueError(f"{name} has no valid rows")
        return x

    daily = _prep(pd.DataFrame(raw["daily"]), "daily")
    intraday_1m = pd.DataFrame(columns=REQUIRED_PRICE_COLS)
    intraday_ta = pd.DataFrame(columns=REQUIRED_PRICE_COLS)

    if include_intraday:
        if "intraday_1m" in raw:
            intraday_key = "intraday_1m"
        elif "intraday" in raw:
            intraday_key = "intraday"
        else:
            raise ValueError("Missing required dependency: intraday_1m")
        intraday_1m = _prep(pd.DataFrame(raw[intraday_key]), intraday_key)
        intraday_ta = resample_intraday(intraday_1m, minutes=TA_INTRADAY_MINUTES)

    raw_corp = raw.get("corp_actions", [])
    if raw_corp is None:
        raw_corp = []
    if not isinstance(raw_corp, list):
        raise ValueError("corp_actions must be an array when provided")

    corp = pd.DataFrame(raw_corp)
    if "datetime" in corp.columns:
        corp["datetime"] = pd.to_datetime(corp["datetime"], errors="coerce")
    elif "timestamp" in corp.columns:
        corp["datetime"] = pd.to_datetime(
            corp["timestamp"], unit="ms", errors="coerce"
        )
    else:
        corp["datetime"] = pd.NaT

    return daily, intraday_1m, intraday_ta, corp


# ---------------------------------------------------------------------------
# Feature enrichment
# ---------------------------------------------------------------------------


def add_ma_stack(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    x["EMA21"] = x["close"].ewm(span=21, adjust=False).mean()
    x["SMA50"] = x["close"].rolling(50).mean()
    x["SMA200"] = x["close"].rolling(200).mean()
    return x


def choose_adaptive_ma(
    df: pd.DataFrame,
    candidates: tuple[int, ...] = (8, 10, 13, 20, 34),
    lookback: int = 120,
) -> dict[str, Any]:
    x = df.tail(lookback).copy()
    prev_close = x["close"].shift(1)
    tr = pd.concat(
        [
            x["high"] - x["low"],
            (x["high"] - prev_close).abs(),
            (x["low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    x["adaptive_atr"] = tr.rolling(14).mean()
    best_n = None
    best_score = -1.0
    best_details: dict[str, Any] = {}
    for n in candidates:
        col = f"SMA{n}"
        x[col] = x["close"].rolling(n).mean()
        y = x.dropna(subset=[col, "adaptive_atr"]).copy()
        if len(y) < 30:
            continue
        ma = y[col]
        atr = y["adaptive_atr"].replace(0, np.nan)
        if atr.isna().all():
            continue
        dist = y["close"] - ma
        prev_dist = dist.shift(1)
        eps = atr.fillna((y["high"] - y["low"]).rolling(5).mean()).fillna(
            (y["high"] - y["low"]).median()
        ) * 0.35
        near_touch = dist.abs() <= eps
        touch_count = int(near_touch.sum())

        support_bounce = (
            near_touch
            & (y["low"] <= (ma + eps))
            & (y["close"] >= ma)
            & (y["close"].shift(-1) > y["close"])
        )
        resistance_reject = (
            near_touch
            & (y["high"] >= (ma - eps))
            & (y["close"] <= ma)
            & (y["close"].shift(-1) < y["close"])
        )
        reclaim_up = (prev_dist < -eps.shift(1)) & (dist > eps)
        reject_down = (prev_dist > eps.shift(1)) & (dist < -eps)
        cross = (
            prev_dist.notna()
            & (((dist > eps) & (prev_dist < -eps.shift(1))) | ((dist < -eps) & (prev_dist > eps.shift(1))))
        )
        cross_count = int(cross.sum())
        whipsaw = cross & (
            cross.shift(1, fill_value=False) | cross.shift(2, fill_value=False)
        )
        whipsaw_count = int(whipsaw.sum())

        normalized_distance = (dist.abs() / atr).replace([np.inf, -np.inf], np.nan)
        distance_penalty = float(normalized_distance.fillna(3.0).clip(upper=3.0).mean())

        support_count = int(support_bounce.sum())
        resistance_count = int(resistance_reject.sum())
        reclaim_count = int(reclaim_up.sum())
        reject_count = int(reject_down.sum())

        score = (
            support_count * 3.0
            + resistance_count * 2.4
            + reclaim_count * 2.8
            + reject_count * 2.2
            + touch_count * 0.45
            - cross_count * 0.9
            - whipsaw_count * 2.2
            - distance_penalty * 6.0
            - (8.0 / float(n))
        )
        if score > best_score:
            best_score = score
            best_n = n
            best_details = {
                "touch_count": touch_count,
                "support_bounce_count": support_count,
                "resistance_reject_count": resistance_count,
                "reclaim_count": reclaim_count,
                "reject_count": reject_count,
                "cross_count": cross_count,
                "whipsaw_count": whipsaw_count,
                "avg_normalized_distance": round(distance_penalty, 4),
                "model": "respect_score_v2",
            }
    return {"adaptive_period": best_n, "score": best_score, "details": best_details}


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


def add_volume_features(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    x["vol_ma20"] = x["volume"].rolling(20).mean()
    x["vol_ratio"] = x["volume"] / x["vol_ma20"]
    x["ret"] = x["close"].pct_change()
    return x


def add_rsi(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    x = df.copy()
    x["RSI14"] = calculate_rsi(x["close"], period=period)
    return x


def calculate_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def add_intraday_context(df_intraday: pd.DataFrame) -> pd.DataFrame:
    x = df_intraday.copy()
    x["EMA9"] = x["close"].ewm(span=9, adjust=False).mean()
    x["EMA20"] = x["close"].ewm(span=20, adjust=False).mean()
    typical = (x["high"] + x["low"] + x["close"]) / 3.0
    x["session"] = x["datetime"].dt.date
    x["pv"] = typical * x["volume"]
    x["cum_pv"] = x.groupby("session")["pv"].cumsum()
    x["cum_vol"] = x.groupby("session")["volume"].cumsum()
    x["VWAP"] = x["cum_pv"] / x["cum_vol"].replace(0, np.nan)
    return x


def summarize_intraday_liquidity(
    df_intraday_1m: pd.DataFrame,
) -> dict[str, Any]:
    x = df_intraday_1m.copy().sort_values("datetime").reset_index(drop=True)
    if x.empty:
        return {
            "liquidity_quality_state": "weak",
            "timing_authority": "wait_only",
            "summary": "no_intraday_rows",
        }

    sessions = []
    for session_date, session_df in x.groupby(x["datetime"].dt.date, sort=True):
        session_df = session_df.sort_values("datetime")
        first_dt = session_df["datetime"].iloc[0]
        last_dt = session_df["datetime"].iloc[-1]
        span_minutes = max(
            int((last_dt - first_dt).total_seconds() // 60) + 1,
            1,
        )
        row_count = int(len(session_df))
        coverage_ratio = float(row_count / span_minutes)
        value_sum = float(session_df["value"].sum()) if "value" in session_df.columns else 0.0
        frequency_sum = (
            float(session_df["frequency"].sum()) if "frequency" in session_df.columns else 0.0
        )
        sessions.append(
            {
                "date": str(session_date),
                "rows": row_count,
                "coverage_ratio": coverage_ratio,
                "value_sum": value_sum,
                "frequency_sum": frequency_sum,
            }
        )

    if not sessions:
        return {
            "liquidity_quality_state": "weak",
            "timing_authority": "wait_only",
            "summary": "no_intraday_sessions",
        }

    median_rows = int(np.median([s["rows"] for s in sessions]))
    median_coverage = float(np.median([s["coverage_ratio"] for s in sessions]))
    median_frequency = float(np.median([s["frequency_sum"] for s in sessions]))

    if median_rows >= 180 and median_coverage >= 0.55 and median_frequency >= 180:
        quality = "strong"
        authority = "full_15m"
    elif median_rows >= 90 and median_coverage >= 0.30:
        quality = "usable"
        authority = "daily_only"
    else:
        quality = "weak"
        authority = "wait_only"

    return {
        "liquidity_quality_state": quality,
        "timing_authority": authority,
        "summary": (
            f"sessions_{len(sessions)}"
            f"_median_rows_{median_rows}"
            f"_coverage_{median_coverage:.2f}"
            f"_frequency_{int(median_frequency)}"
        ),
    }


def summarize_intraday_participation(
    df_intraday_1m: pd.DataFrame,
) -> dict[str, Any]:
    x = df_intraday_1m.copy().sort_values("datetime").reset_index(drop=True)
    if x.empty:
        return {
            "raw_participation_quality": "weak",
            "summary": "no_intraday_rows",
        }

    intraday_tf = resample_intraday(x, minutes=TA_INTRADAY_MINUTES)
    if intraday_tf.empty:
        return {
            "raw_participation_quality": "weak",
            "summary": "no_intraday_windows",
        }

    recent_bar = intraday_tf.iloc[-1]
    recent_ts = pd.Timestamp(recent_bar["datetime"])
    recent_raw = x[
        (x["datetime"] >= (recent_ts - pd.Timedelta(minutes=TA_INTRADAY_MINUTES - 1)))
        & (x["datetime"] <= recent_ts + pd.Timedelta(minutes=TA_INTRADAY_MINUTES - 1))
    ]
    minute_density = float(
        min(len(recent_raw), TA_INTRADAY_MINUTES) / float(TA_INTRADAY_MINUTES)
    )

    # Build baseline from same time-of-day bars across all prior sessions.
    recent_time = recent_ts.time()
    half_window = pd.Timedelta(minutes=TA_INTRADAY_MINUTES)
    prior_bars = intraday_tf.iloc[:-1].copy()
    if not prior_bars.empty:
        bar_times = prior_bars["datetime"].dt.time
        ref_seconds = recent_time.hour * 3600 + recent_time.minute * 60
        bar_seconds = pd.array(
            [t.hour * 3600 + t.minute * 60 for t in bar_times], dtype="int64"
        )
        time_diff = np.abs(bar_seconds - ref_seconds)
        baseline = prior_bars[time_diff <= half_window.total_seconds()]
    else:
        baseline = prior_bars

    if baseline.empty:
        quality = "adequate" if minute_density >= 0.35 else "weak"
        return {
            "raw_participation_quality": quality,
            "summary": f"baseline_insufficient_density_{minute_density:.2f}",
        }

    value_base = float(baseline["value"].replace(0, np.nan).median()) if "value" in baseline.columns else np.nan
    freq_base = (
        float(baseline["frequency"].replace(0, np.nan).median())
        if "frequency" in baseline.columns
        else np.nan
    )
    volume_base = float(baseline["volume"].replace(0, np.nan).median())

    value_ratio = float(recent_bar.get("value", 0.0) / value_base) if np.isfinite(value_base) and value_base > 0 else 1.0
    freq_ratio = float(recent_bar.get("frequency", 0.0) / freq_base) if np.isfinite(freq_base) and freq_base > 0 else 1.0
    vol_ratio = float(recent_bar["volume"] / volume_base) if np.isfinite(volume_base) and volume_base > 0 else 1.0

    score = max(value_ratio, freq_ratio, vol_ratio)
    if minute_density < 0.20 or score < 0.70:
        quality = "weak"
    elif minute_density >= 0.55 and score >= 1.15:
        quality = "strong"
    else:
        quality = "adequate"

    return {
        "raw_participation_quality": quality,
        "summary": (
            f"density_{minute_density:.2f}"
            f"_value_ratio_{value_ratio:.2f}"
            f"_freq_ratio_{freq_ratio:.2f}"
            f"_vol_ratio_{vol_ratio:.2f}"
            f"_baseline_bars_{len(baseline)}"
        ),
    }


# ---------------------------------------------------------------------------
# Level clustering and strength
# ---------------------------------------------------------------------------


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


def derive_levels(df: pd.DataFrame) -> list[dict[str, Any]]:
    highs = df["swing_high"].dropna().tail(20).tolist()
    lows = df["swing_low"].dropna().tail(20).tolist()
    return cluster_levels([float(v) for v in highs + lows], tolerance=0.02)


def select_nearest_levels(
    levels: list[float], ref_price: float, max_n: int
) -> list[float]:
    if max_n <= 0:
        return []
    uniq = sorted(set(float(x) for x in levels))
    picked = sorted(uniq, key=lambda x: abs(x - ref_price))[:max_n]
    return sorted(picked)


# ---------------------------------------------------------------------------
# Structure events (with compaction)
# ---------------------------------------------------------------------------


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
                    "datetime": dt,
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
                    "datetime": dt,
                    "side": "down",
                    "label": "BOS" if last_side == "down" else "CHOCH",
                    "broken_level": last_low,
                    "close": close,
                }
            )
            last_side = "down"

    # Dedup
    uniq: list[dict[str, Any]] = []
    seen: set[tuple[Any, ...]] = set()
    for e in events:
        key = (str(e["datetime"]), e["side"], round(float(e["broken_level"]), 4))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(e)

    # Compact nearby same-side/same-label events
    compact: list[dict[str, Any]] = []
    for e in uniq:
        cur = {
            "datetime": e["datetime"],
            "side": e["side"],
            "label": e["label"],
            "broken_level": float(e["broken_level"]),
            "close": float(e["close"]),
            "count": 1,
        }
        if not compact:
            compact.append(cur)
            continue

        prev = compact[-1]
        prev_dt = pd.Timestamp(prev["datetime"])
        cur_dt = pd.Timestamp(cur["datetime"])
        gap_days = int((cur_dt - prev_dt).days)
        same_side = prev["side"] == cur["side"]
        same_label = prev["label"] == cur["label"]
        prev_lvl = float(prev["broken_level"])
        cur_lvl = float(cur["broken_level"])
        lvl_close = abs(cur_lvl - prev_lvl) / max(abs(prev_lvl), 1e-9) <= 0.0035

        if same_side and same_label and lvl_close and gap_days <= 4:
            prev["datetime"] = cur["datetime"]
            prev["close"] = cur["close"]
            prev["broken_level"] = cur_lvl
            prev["count"] = int(prev.get("count", 1)) + 1
        else:
            compact.append(cur)

    return compact[-16:]


# ---------------------------------------------------------------------------
# Volume profile
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Classify helpers
# ---------------------------------------------------------------------------


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


def mixed_swing_ma_bias(
    row: pd.Series, *, hh: bool, hl: bool, lh: bool, ll: bool
) -> str:
    """Use baseline MA posture to break ties when swings are mixed."""
    close = float(row["close"])
    ema21 = float(row["EMA21"]) if pd.notna(row.get("EMA21")) else None
    sma50 = float(row["SMA50"]) if pd.notna(row.get("SMA50")) else None
    sma200 = float(row["SMA200"]) if pd.notna(row.get("SMA200")) else None

    ma_bullish = (
        ema21 is not None
        and sma50 is not None
        and sma200 is not None
        and close > sma200
        and ema21 > sma50
    )
    ma_bearish = (
        ema21 is not None
        and sma50 is not None
        and sma200 is not None
        and close < sma200
        and ema21 < sma50
    )
    if (hh or hl) and ma_bullish:
        return "bullish"
    if (lh or ll) and ma_bearish:
        return "bearish"
    return "neutral"


def classify_regime(
    df: pd.DataFrame, structure_status_val: str = "no_signal"
) -> dict[str, Any]:
    """Classify regime from swing structure.

    Uses last-4 swings as primary signal, with MA posture as tiebreaker
    when swings are mixed (e.g. HH but not HL, or vice versa).
    Returns potential_reversal when CHOCH is detected but BOS is not confirmed.
    """
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
    elif structure_status_val == "choch_only":
        regime, trend_bias = "potential_reversal", "neutral"
    else:
        mixed_bias = mixed_swing_ma_bias(df.iloc[-1], hh=hh, hl=hl, lh=lh, ll=ll)
        if mixed_bias == "bullish":
            regime, trend_bias = "trend_continuation", "bullish"
        elif mixed_bias == "bearish":
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


# ---------------------------------------------------------------------------
# Fibonacci
# ---------------------------------------------------------------------------


def derive_recent_fib_lines(df: pd.DataFrame) -> list[float]:
    x = add_swings(df) if "swing_high" not in df.columns else df
    highs = x[x["swing_high"].notna()][["datetime", "swing_high"]]
    lows = x[x["swing_low"].notna()][["datetime", "swing_low"]]
    if len(highs) == 0 or len(lows) == 0:
        return []
    anchor_low = lows.iloc[-1]
    cands = highs[highs["datetime"] >= anchor_low["datetime"]]
    anchor_high = cands.iloc[-1] if len(cands) > 0 else highs.iloc[-1]
    lo = float(anchor_low["swing_low"])
    hi = float(anchor_high["swing_high"])
    if hi <= lo:
        return []
    span = hi - lo
    return [float(hi - span * r) for r in (0.236, 0.382, 0.5, 0.618, 0.786)]


# ---------------------------------------------------------------------------
# Anomaly overrides (chart coloring)
# ---------------------------------------------------------------------------


def anomaly_overrides(df: pd.DataFrame) -> list[str | None]:
    x = add_volume_features(df) if "vol_ratio" not in df.columns else df
    out: list[str | None] = []
    for _, row in x.iterrows():
        vr = float(row.get("vol_ratio", 1.0) or 1.0)
        chg = float(row.get("ret", 0.0) or 0.0)
        if vr >= 1.5 and chg < 0:
            out.append("#8B0000")
        elif vr >= 1.5:
            out.append("#0B6E4F")
        else:
            out.append(None)
    return out


# ---------------------------------------------------------------------------
# Liquidity
# ---------------------------------------------------------------------------


def liquidity_draws(
    price: float,
    levels: list[dict[str, Any]],
    internal_levels: list[float] | None = None,
) -> dict[str, Any]:
    mids = sorted([float(z["zone_mid"]) for z in levels])
    above = [x for x in mids if x > price]
    below = [x for x in mids if x < price]
    out: dict[str, Any] = {
        "current_draw": above[0] if above else None,
        "opposing_draw": below[-1] if below else None,
    }
    if internal_levels is not None:
        i_up = sorted([x for x in internal_levels if x > price])
        i_dn = sorted([x for x in internal_levels if x < price], reverse=True)
        out["internal_up"] = i_up[0] if i_up else None
        out["internal_down"] = i_dn[0] if i_dn else None
    return out


def liquidity_path_after_event(event_type: str, outcome: str = "unresolved") -> str:
    if event_type == "external_sweep" and outcome == "rejected":
        return "external_to_internal"
    if event_type == "internal_tag" and outcome in {"accepted", "rejected"}:
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


def detect_sweep_events(
    df_daily: pd.DataFrame,
    *,
    eqh_levels: list[float] | None = None,
    eql_levels: list[float] | None = None,
    internal_levels: list[float] | None = None,
    trendlines: list[dict[str, Any]] | None = None,
    lookback: int = 10,
) -> list[dict[str, Any]]:
    x = df_daily.reset_index(drop=True).copy()
    if x.empty:
        return []

    eqh_levels = [float(level) for level in (eqh_levels or [])]
    eql_levels = [float(level) for level in (eql_levels or [])]
    internal_levels = [float(level) for level in (internal_levels or [])]
    trendlines = list(trendlines or [])
    recent = x.tail(lookback).copy()
    type_rank = {"eqh": 4, "eql": 4, "trendline": 3, "swing": 2}

    swing_high_levels = [
        float(level)
        for level in x["swing_high"].dropna().tail(8).tolist()
        if float(level) > 0
    ] if "swing_high" in x.columns else []
    swing_low_levels = [
        float(level)
        for level in x["swing_low"].dropna().tail(8).tolist()
        if float(level) > 0
    ] if "swing_low" in x.columns else []

    def _matches(level: float, refs: list[float], rel_tol: float = 0.006) -> bool:
        return any(
            abs(level - ref) / max(abs(ref), 1e-9) <= rel_tol
            for ref in refs
        )

    def _projected_trendline_level(
        trendline: dict[str, Any], bar_index: int
    ) -> float:
        anchor_start = int(trendline.get("anchor_start_index", bar_index))
        anchor_level = float(trendline.get("anchor_start", trendline["projected_level"]))
        slope = float(trendline.get("slope_per_bar", 0.0))
        return anchor_level + slope * (bar_index - anchor_start)

    candidates: list[dict[str, Any]] = []

    def _append_candidate(
        *,
        row: pd.Series,
        level: float,
        side: str,
        sweep_type: str,
        event_scope: str,
    ) -> None:
        atr14 = (
            float(row.get("ATR14", 0.0))
            if pd.notna(row.get("ATR14"))
            else 0.0
        )
        breach_buffer = max(atr14 * 0.08, abs(level) * 0.0012)
        acceptance_buffer = max(atr14 * 0.05, abs(level) * 0.0008)
        high = float(row["high"])
        low = float(row["low"])
        close = float(row["close"])

        if side == "up":
            breached = high > level + breach_buffer
            if not breached:
                return
            if close < level - acceptance_buffer:
                outcome = "rejected"
            elif close > level + acceptance_buffer:
                outcome = "accepted"
            else:
                outcome = "unresolved"
        else:
            breached = low < level - breach_buffer
            if not breached:
                return
            if close > level + acceptance_buffer:
                outcome = "rejected"
            elif close < level - acceptance_buffer:
                outcome = "accepted"
            else:
                outcome = "unresolved"

        candidates.append(
            {
                "datetime": str(row["datetime"]),
                "bar_index": int(row.name),
                "level": float(level),
                "side": side,
                "sweep_type": sweep_type,
                "event_scope": event_scope,
                "outcome": outcome,
            }
        )

    for idx, row in recent.iterrows():
        for level in eqh_levels:
            _append_candidate(
                row=row,
                level=level,
                side="up",
                sweep_type="eqh",
                event_scope="external_sweep",
            )
        for level in eql_levels:
            _append_candidate(
                row=row,
                level=level,
                side="down",
                sweep_type="eql",
                event_scope="external_sweep",
            )
        for level in swing_high_levels:
            _append_candidate(
                row=row,
                level=level,
                side="up",
                sweep_type="swing",
                event_scope="internal_tag" if _matches(level, internal_levels) else "external_sweep",
            )
        for level in swing_low_levels:
            _append_candidate(
                row=row,
                level=level,
                side="down",
                sweep_type="swing",
                event_scope="internal_tag" if _matches(level, internal_levels) else "external_sweep",
            )
        for trendline in trendlines:
            trendline_type = str(trendline.get("type", ""))
            if trendline_type == "descending_resistance":
                _append_candidate(
                    row=row,
                    level=_projected_trendline_level(trendline, int(idx)),
                    side="up",
                    sweep_type="trendline",
                    event_scope="external_sweep",
                )
            elif trendline_type == "ascending_support":
                _append_candidate(
                    row=row,
                    level=_projected_trendline_level(trendline, int(idx)),
                    side="down",
                    sweep_type="trendline",
                    event_scope="external_sweep",
                )

    if not candidates:
        return []

    best_by_side: dict[str, dict[str, Any]] = {}
    for candidate in sorted(
        candidates,
        key=lambda item: (
            int(item["bar_index"]),
            1 if str(item["outcome"]) in {"accepted", "rejected"} else 0,
            type_rank.get(str(item["sweep_type"]), 0),
        ),
        reverse=True,
    ):
        side = str(candidate["side"])
        if side not in best_by_side:
            best_by_side[side] = candidate

    return sorted(
        best_by_side.values(),
        key=lambda item: int(item["bar_index"]),
    )


# ---------------------------------------------------------------------------
# Structure status
# ---------------------------------------------------------------------------


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


def detect_wyckoff_spring(
    df: pd.DataFrame,
    events: list[dict[str, Any]],
    wyckoff_ctx: str,
    lookback: int = 10,
) -> dict[str, Any]:
    """Detect Wyckoff spring: price sweeps below support then reclaims above it.

    A spring requires:
    1. Context is accumulation or balance-like (not markup/markdown).
    2. A recent swing low exists as support.
    3. Price dipped below that swing low (wick or close).
    4. Price closed back above the swing low within `lookback` bars.
    """
    if wyckoff_ctx not in ("accumulation", "unclear"):
        return {"detected": False, "reason": "wrong_wyckoff_phase"}

    lows = df[df["swing_low"].notna()][["datetime", "swing_low"]].tail(6)
    if len(lows) < 2:
        return {"detected": False, "reason": "insufficient_swing_lows"}

    # Use the second-to-last swing low as the support to test against
    support_level = float(lows["swing_low"].iloc[-2])
    support_dt = lows["datetime"].iloc[-2]

    tail = df[df["datetime"] > support_dt].tail(lookback).reset_index(drop=True)
    if tail.empty:
        return {"detected": False, "reason": "no_bars_after_support"}

    swept_below = tail["low"].min() < support_level
    if not swept_below:
        return {"detected": False, "reason": "no_sweep_below_support"}

    last_close = float(tail["close"].iloc[-1])
    reclaimed = last_close > support_level
    if not reclaimed:
        return {"detected": False, "reason": "not_reclaimed"}

    return {
        "detected": True,
        "reason": "ok",
        "support_level": support_level,
        "support_datetime": str(support_dt),
        "sweep_low": float(tail["low"].min()),
        "reclaim_close": last_close,
    }


def detect_trendline_levels(
    df: pd.DataFrame, min_points: int = 3, atr_tolerance: float = 0.5,
) -> list[dict[str, Any]]:
    """Derive ascending/descending trendlines from consecutive swing points.

    Returns trendline descriptors with projected current-bar level.
    """
    atr = float(df["ATR14"].iloc[-1]) if "ATR14" in df.columns and pd.notna(df["ATR14"].iloc[-1]) else 0.0
    tol = atr * atr_tolerance
    last_idx = len(df) - 1
    trendlines: list[dict[str, Any]] = []

    # Ascending trendline from swing lows
    sl = df[df["swing_low"].notna()][["swing_low"]].tail(8)
    if len(sl) >= min_points:
        indices = sl.index.tolist()
        values = [float(sl.loc[i, "swing_low"]) for i in indices]
        # Use first and last to define line, check intermediate fit
        if len(indices) >= 2 and indices[-1] != indices[0]:
            slope = (values[-1] - values[0]) / (indices[-1] - indices[0])
            if slope > 0:
                on_line = 0
                for j, idx in enumerate(indices):
                    projected = values[0] + slope * (idx - indices[0])
                    if abs(values[j] - projected) <= max(tol, abs(projected) * 0.01):
                        on_line += 1
                if on_line >= min_points:
                    current_proj = values[0] + slope * (last_idx - indices[0])
                    trendlines.append({
                        "type": "ascending_support",
                        "anchor_start_index": int(indices[0]),
                        "anchor_start": float(values[0]),
                        "anchor_end_index": int(indices[-1]),
                        "anchor_end": float(values[-1]),
                        "slope_per_bar": float(slope),
                        "projected_level": float(current_proj),
                        "points_on_line": on_line,
                    })

    # Descending trendline from swing highs
    sh = df[df["swing_high"].notna()][["swing_high"]].tail(8)
    if len(sh) >= min_points:
        indices = sh.index.tolist()
        values = [float(sh.loc[i, "swing_high"]) for i in indices]
        if len(indices) >= 2 and indices[-1] != indices[0]:
            slope = (values[-1] - values[0]) / (indices[-1] - indices[0])
            if slope < 0:
                on_line = 0
                for j, idx in enumerate(indices):
                    projected = values[0] + slope * (idx - indices[0])
                    if abs(values[j] - projected) <= max(tol, abs(projected) * 0.01):
                        on_line += 1
                if on_line >= min_points:
                    current_proj = values[0] + slope * (last_idx - indices[0])
                    trendlines.append({
                        "type": "descending_resistance",
                        "anchor_start_index": int(indices[0]),
                        "anchor_start": float(values[0]),
                        "anchor_end_index": int(indices[-1]),
                        "anchor_end": float(values[-1]),
                        "slope_per_bar": float(slope),
                        "projected_level": float(current_proj),
                        "points_on_line": on_line,
                    })

    return trendlines
