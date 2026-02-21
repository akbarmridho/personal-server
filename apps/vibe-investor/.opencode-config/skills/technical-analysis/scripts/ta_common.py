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

REQUIRED_ARRAYS = ("daily", "intraday", "corp_actions")
REQUIRED_PRICE_COLS = ("datetime", "open", "high", "low", "close", "volume")


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------


def load_ohlcv(path: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
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
        for col in ("open", "high", "low", "close", "volume"):
            x[col] = pd.to_numeric(x[col], errors="coerce")
        x = x.dropna(subset=["open", "high", "low", "close", "volume"])
        if x.empty:
            raise ValueError(f"{name} has no valid rows")
        return x

    daily = _prep(pd.DataFrame(raw["daily"]), "daily")
    intraday = _prep(pd.DataFrame(raw["intraday"]), "intraday")

    corp = pd.DataFrame(raw["corp_actions"])
    if "datetime" in corp.columns:
        corp["datetime"] = pd.to_datetime(corp["datetime"], errors="coerce")
    elif "timestamp" in corp.columns:
        corp["datetime"] = pd.to_datetime(
            corp["timestamp"], unit="ms", errors="coerce"
        )
    else:
        corp["datetime"] = pd.NaT

    return daily, intraday, corp


# ---------------------------------------------------------------------------
# Feature enrichment
# ---------------------------------------------------------------------------


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
# Initial Balance
# ---------------------------------------------------------------------------


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


def compute_period_ib(
    df_daily: pd.DataFrame, period: str = "M", first_n_bars: int = 2
) -> tuple[pd.Series, pd.Series]:
    """Return (ibh_line, ibl_line) series aligned to df_daily index."""
    x = df_daily.copy()
    x["period"] = x["datetime"].dt.to_period(period)
    ibh_line = pd.Series(np.nan, index=x.index, dtype="float64")
    ibl_line = pd.Series(np.nan, index=x.index, dtype="float64")
    for _, group in x.groupby("period", sort=True):
        seed = group.head(first_n_bars)
        if len(seed) < first_n_bars:
            continue
        ibh = float(seed["high"].max())
        ibl = float(seed["low"].min())
        ibh_line.loc[group.index] = ibh
        ibl_line.loc[group.index] = ibl
    return ibh_line, ibl_line


def compute_period_ib_levels(
    df_daily: pd.DataFrame, period: str = "M", first_n_bars: int = 2
) -> tuple[pd.DataFrame, pd.Series, pd.Series, list[dict[str, Any]]]:
    """Extended version returning (enriched_df, ibh_line, ibl_line, period_info)."""
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
# Imbalance / FVG detection
# ---------------------------------------------------------------------------


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


def detect_imbalance_zones(
    df: pd.DataFrame, *, dt_key: str = "start"
) -> list[dict[str, Any]]:
    """Detect FVG, OPENING_GAP, and VOLUME_IMBALANCE zones.

    Args:
        dt_key: key name for start/end datetime in output dicts.
                build_ta_context uses "start"/"end",
                generate_ta_charts uses "start_dt"/"end_dt".
    """
    end_key = dt_key.replace("start", "end") if "start" in dt_key else "end"
    out: list[dict[str, Any]] = []
    x = df.reset_index(drop=True)
    for i in range(1, len(x)):
        c2 = x.iloc[i - 1]
        c3 = x.iloc[i]

        # Opening gap
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
                    dt_key: str(c2["datetime"]),
                    end_key: str(c3["datetime"]),
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
                    dt_key: str(c2["datetime"]),
                    end_key: str(c3["datetime"]),
                }
            )

        # Volume imbalance
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
                        dt_key: str(c2["datetime"]),
                        end_key: str(c3["datetime"]),
                    }
                )
        elif float(c3["close"]) < float(c2["low"]) and float(c3["open"]) > float(
            c2["low"]
        ):
            low = float(c2["low"])
            high = float(
                min(max(c3["open"], c2["low"]), max(c3["high"], c2["high"]))
            )
            if high > low:
                out.append(
                    {
                        "type": "VOLUME_IMBALANCE",
                        "direction": "bearish",
                        "low": low,
                        "high": high,
                        "ce": float((low + high) / 2.0),
                        dt_key: str(c2["datetime"]),
                        end_key: str(c3["datetime"]),
                    }
                )

        # FVG (3-candle)
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
                        dt_key: str(c1["datetime"]),
                        end_key: str(c3["datetime"]),
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
                        dt_key: str(c1["datetime"]),
                        end_key: str(c3["datetime"]),
                    }
                )
    return out[-20:]


def infer_ifvg_zones(
    zones: list[dict[str, Any]],
    close_price: float,
    prev_close: float | None,
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


def classify_regime(
    df: pd.DataFrame, structure_status_val: str = "no_signal"
) -> dict[str, Any]:
    """Classify regime from swing structure.

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
                        "anchor_start": float(values[0]),
                        "anchor_end": float(values[-1]),
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
                        "anchor_start": float(values[0]),
                        "anchor_end": float(values[-1]),
                        "projected_level": float(current_proj),
                        "points_on_line": on_line,
                    })

    return trendlines
