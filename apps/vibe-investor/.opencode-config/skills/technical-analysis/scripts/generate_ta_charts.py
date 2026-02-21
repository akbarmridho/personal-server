#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import mplfinance as mpf
import numpy as np
import pandas as pd


REQUIRED_ARRAYS = ("daily", "intraday", "corp_actions")
OHLCV_COLS = ("datetime", "open", "high", "low", "close", "volume")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate technical-analysis chart artifacts from OHLCV JSON."
    )
    parser.add_argument("--input", required=True, help="Path to OHLCV JSON file.")
    parser.add_argument("--symbol", required=True, help="Ticker symbol, e.g. BBCA.")
    parser.add_argument(
        "--outdir", default="work", help="Output directory for generated charts."
    )
    parser.add_argument(
        "--modules",
        default="core",
        help="Comma-separated modules: core,vpvr,imbalance,detail or all.",
    )
    parser.add_argument("--period", default="M", help="IB overlay period, default M.")
    parser.add_argument(
        "--first-n-bars", type=int, default=2, help="IB overlay seed bars, default 2."
    )
    parser.add_argument(
        "--daily-lookback", type=int, default=240, help="Daily candles to render."
    )
    parser.add_argument(
        "--intraday-lookback", type=int, default=160, help="Intraday candles to render."
    )
    return parser.parse_args()


def parse_modules(raw: str) -> set[str]:
    items = {x.strip().lower() for x in raw.split(",") if x.strip()}
    if not items:
        items = {"core"}
    if "all" in items:
        return {"core", "vpvr", "imbalance", "detail"}
    items.add("core")
    return items


def load_ohlcv(path: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    for key in REQUIRED_ARRAYS:
        if key not in raw or not isinstance(raw[key], list) or len(raw[key]) == 0:
            raise ValueError(f"Missing required dependency: {key}")

    def _prep(df: pd.DataFrame, name: str) -> pd.DataFrame:
        for col in OHLCV_COLS:
            if col not in df.columns:
                raise ValueError(f"{name} missing required field: {col}")
        out = df.copy()
        out["datetime"] = pd.to_datetime(out["datetime"])
        out = (
            out.sort_values("datetime")
            .drop_duplicates(subset=["datetime"])
            .reset_index(drop=True)
        )
        for col in ("open", "high", "low", "close", "volume"):
            out[col] = pd.to_numeric(out[col], errors="coerce")
        out = out.dropna(subset=["open", "high", "low", "close", "volume"])
        if out.empty:
            raise ValueError(f"{name} has no valid OHLCV rows after parsing")
        return out

    daily = _prep(pd.DataFrame(raw["daily"]), "daily")
    intraday = _prep(pd.DataFrame(raw["intraday"]), "intraday")
    corp = pd.DataFrame(raw["corp_actions"]).copy()
    if "datetime" in corp.columns:
        corp["datetime"] = pd.to_datetime(corp["datetime"], errors="coerce")
    elif "timestamp" in corp.columns:
        corp["datetime"] = pd.to_datetime(corp["timestamp"], unit="ms", errors="coerce")
    return daily, intraday, corp


def to_mpf(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    x = x.set_index("datetime")[["open", "high", "low", "close", "volume"]]
    return x


def add_ma(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    x["EMA21"] = x["close"].ewm(span=21, adjust=False).mean()
    x["SMA50"] = x["close"].rolling(50).mean()
    x["SMA100"] = x["close"].rolling(100).mean()
    x["SMA200"] = x["close"].rolling(200).mean()
    return x


def add_swings(df: pd.DataFrame, n: int = 2) -> pd.DataFrame:
    out = df.copy()
    sh = pd.Series(True, index=out.index)
    sl = pd.Series(True, index=out.index)
    for i in range(1, n + 1):
        sh &= out["high"] > out["high"].shift(i)
        sh &= out["high"] > out["high"].shift(-i)
        sl &= out["low"] < out["low"].shift(i)
        sl &= out["low"] < out["low"].shift(-i)
    out["swing_high"] = np.where(sh, out["high"], np.nan)
    out["swing_low"] = np.where(sl, out["low"], np.nan)
    return out


def cluster_levels(
    levels: list[float], tolerance: float = 0.02
) -> list[dict[str, float]]:
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
    out: list[dict[str, float]] = []
    for c in clusters:
        out.append(
            {
                "zone_mid": float(np.mean(c)),
                "zone_low": float(min(c)),
                "zone_high": float(max(c)),
                "touches": float(len(c)),
            }
        )
    return out


def derive_zones(df_daily: pd.DataFrame) -> list[dict[str, float]]:
    x = add_swings(df_daily).tail(280)
    highs = x["swing_high"].dropna().tail(20).tolist()
    lows = x["swing_low"].dropna().tail(20).tolist()
    raw = [float(v) for v in highs + lows]
    return cluster_levels(raw, tolerance=0.02)


def latest_intraday_ib(df_intraday: pd.DataFrame) -> dict[str, Any]:
    x = df_intraday.copy()
    x["session"] = x["datetime"].dt.date
    latest_session = sorted(x["session"].unique())[-1]
    d = x[x["session"] == latest_session].sort_values("datetime").reset_index(drop=True)
    if len(d) < 3:
        raise ValueError("Intraday latest session has fewer than 3 bars")

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
    return {"session": str(latest_session), "ibh": ibh, "ibl": ibl, "state": state}


def compute_period_ib(
    df_daily: pd.DataFrame, period: str = "M", first_n_bars: int = 2
) -> tuple[pd.Series, pd.Series]:
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


def detect_structure_events(df_daily: pd.DataFrame) -> list[dict[str, Any]]:
    x = add_swings(df_daily).reset_index(drop=True)
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
            label = "BOS" if last_side == "up" else "CHOCH"
            events.append(
                {
                    "datetime": dt,
                    "side": "up",
                    "label": label,
                    "broken_level": last_high,
                    "close": close,
                }
            )
            last_side = "up"
        elif last_low is not None and close < last_low:
            label = "BOS" if last_side == "down" else "CHOCH"
            events.append(
                {
                    "datetime": dt,
                    "side": "down",
                    "label": label,
                    "broken_level": last_low,
                    "close": close,
                }
            )
            last_side = "down"

    uniq = []
    seen = set()
    for e in events:
        key = (e["datetime"], e["side"], round(e["broken_level"], 4))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(e)
    return uniq[-12:]


def nearest_draws(price: float, zones: list[dict[str, float]]) -> dict[str, Any]:
    mids = [z["zone_mid"] for z in zones]
    above = sorted([z for z in mids if z > price])
    below = sorted([z for z in mids if z < price], reverse=True)
    current_draw = above[0] if above else None
    opposing_draw = below[0] if below else None
    return {"current_draw": current_draw, "opposing_draw": opposing_draw}


def trade_plan_from_zones(
    price: float, zones: list[dict[str, float]]
) -> dict[str, Any]:
    mids = sorted([z["zone_mid"] for z in zones])
    above = [z for z in mids if z > price]
    below = [z for z in mids if z < price]
    if not above or not below:
        return {"entry": price, "stop": None, "target": None, "rr": None}

    entry = below[-1]
    stop = min(below)
    target = above[0]
    risk = abs(entry - stop)
    reward = abs(target - entry)
    rr = None if risk <= 0 else reward / risk
    return {"entry": entry, "stop": stop, "target": target, "rr": rr}


def vpvr_stats(df_daily: pd.DataFrame, bins: int = 40) -> dict[str, Any]:
    x = df_daily.tail(260)
    lo = float(x["low"].min())
    hi = float(x["high"].max())
    edges = np.linspace(lo, hi, bins + 1)
    hist = np.zeros(bins)
    mids = (edges[:-1] + edges[1:]) / 2.0

    for _, row in x.iterrows():
        li = max(np.searchsorted(edges, row["low"], side="right") - 1, 0)
        hi_i = min(np.searchsorted(edges, row["high"], side="right") - 1, bins - 1)
        if hi_i >= li:
            hist[li : hi_i + 1] += float(row["volume"])

    poc_idx = int(hist.argmax())
    order = np.argsort(hist)[::-1]
    total = float(hist.sum())
    threshold = total * 0.70
    chosen = []
    cumulative = 0.0
    for i in order:
        chosen.append(i)
        cumulative += float(hist[i])
        if cumulative >= threshold:
            break
    vals = mids[np.array(chosen)]

    return {
        "mids": mids.tolist(),
        "hist": hist.tolist(),
        "poc": float(mids[poc_idx]),
        "vah": float(vals.max()),
        "val": float(vals.min()),
        "hvn_top3": [float(x) for x in mids[np.argsort(hist)[-3:]] if np.isfinite(x)],
        "lvn_top3": [float(x) for x in mids[np.argsort(hist)[:3]] if np.isfinite(x)],
    }


def detect_fvg(df_daily: pd.DataFrame) -> list[dict[str, Any]]:
    x = df_daily.reset_index(drop=True)
    out: list[dict[str, Any]] = []
    for i in range(2, len(x)):
        c1 = x.iloc[i - 2]
        c3 = x.iloc[i]
        if c1["high"] < c3["low"]:
            low = float(c1["high"])
            high = float(c3["low"])
            out.append(
                {
                    "direction": "bullish",
                    "low": low,
                    "high": high,
                    "ce": (low + high) / 2.0,
                    "start_dt": c1["datetime"],
                    "end_dt": c3["datetime"],
                }
            )
        elif c3["high"] < c1["low"]:
            low = float(c3["high"])
            high = float(c1["low"])
            out.append(
                {
                    "direction": "bearish",
                    "low": low,
                    "high": high,
                    "ce": (low + high) / 2.0,
                    "start_dt": c1["datetime"],
                    "end_dt": c3["datetime"],
                }
            )
    return out[-8:]


def _base_style() -> Any:
    return mpf.make_mpf_style(base_mpf_style="yahoo", gridstyle=":")


def plot_daily_structure(
    df_daily: pd.DataFrame,
    zones: list[dict[str, float]],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = add_ma(df_daily.tail(lookback))
    hlines = [z["zone_mid"] for z in zones[:8]]
    apds = [
        mpf.make_addplot(x["EMA21"], color="#f39c12", width=1.0),
        mpf.make_addplot(x["SMA50"], color="#3498db", width=1.0),
        mpf.make_addplot(x["SMA100"], color="#2ecc71", width=1.0),
        mpf.make_addplot(x["SMA200"], color="#9b59b6", width=1.0),
    ]
    mpf.plot(
        to_mpf(x),
        type="candle",
        volume=True,
        style=_base_style(),
        addplot=apds,
        hlines=dict(
            hlines=hlines,
            colors=["#1f77b4"] * len(hlines),
            linewidths=[0.8] * len(hlines),
        )
        if hlines
        else None,
        title=f"{symbol} Daily Structure",
        savefig=dict(fname=str(path), dpi=160, bbox_inches="tight"),
    )


def plot_intraday_ibh_ibl(
    df_intraday: pd.DataFrame,
    ib: dict[str, Any],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = df_intraday.tail(lookback)
    mpf.plot(
        to_mpf(x),
        type="candle",
        volume=True,
        style=_base_style(),
        hlines=dict(
            hlines=[ib["ibh"], ib["ibl"]],
            colors=["#2ca02c", "#d62728"],
            linewidths=[1.0, 1.0],
        ),
        title=f"{symbol} Intraday IBH/IBL ({ib['state']})",
        savefig=dict(fname=str(path), dpi=160, bbox_inches="tight"),
    )


def plot_ib_overlay(
    df_daily: pd.DataFrame,
    ibh_line: pd.Series,
    ibl_line: pd.Series,
    path: Path,
    symbol: str,
    period: str,
    first_n: int,
    lookback: int,
) -> None:
    x = df_daily.tail(lookback)
    start = len(df_daily) - len(x)
    apds = [
        mpf.make_addplot(ibh_line.iloc[start:].values, color="#2f6bff", width=1.1),
        mpf.make_addplot(ibl_line.iloc[start:].values, color="#2f6bff", width=1.1),
    ]
    mpf.plot(
        to_mpf(x),
        type="candle",
        volume=True,
        style=_base_style(),
        addplot=apds,
        title=f"{symbol} Initial Balance Overlay ({period}, {first_n})",
        savefig=dict(fname=str(path), dpi=160, bbox_inches="tight"),
    )


def plot_structure_events(
    df_daily: pd.DataFrame,
    events: list[dict[str, Any]],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = df_daily.tail(lookback).copy().reset_index(drop=True)
    up = np.full(len(x), np.nan)
    down = np.full(len(x), np.nan)

    event_map = {pd.Timestamp(e["datetime"]): e for e in events}
    for i, row in x.iterrows():
        event = event_map.get(pd.Timestamp(row["datetime"]))
        if event is None:
            continue
        if event["side"] == "up":
            up[i] = row["close"]
        else:
            down[i] = row["close"]

    apds = [
        mpf.make_addplot(
            up, type="scatter", marker="^", markersize=70, color="#2ca02c"
        ),
        mpf.make_addplot(
            down, type="scatter", marker="v", markersize=70, color="#d62728"
        ),
    ]
    fig, axes = mpf.plot(
        to_mpf(x),
        type="candle",
        volume=True,
        style=_base_style(),
        addplot=apds,
        title=f"{symbol} Structure Events (CHOCH/BOS)",
        returnfig=True,
    )
    ax = axes[0]
    for e in events[-6:]:
        dt = pd.Timestamp(e["datetime"])
        if dt < x["datetime"].iloc[0]:
            continue
        xnum = mdates.date2num(dt)
        ax.text(xnum, e["close"], e["label"], fontsize=8)
    fig.savefig(str(path), dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_liquidity_map(
    df_daily: pd.DataFrame,
    draws: dict[str, Any],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = df_daily.tail(lookback)
    hlines = [
        v
        for v in [draws.get("current_draw"), draws.get("opposing_draw")]
        if v is not None
    ]
    colors = ["#1f77b4", "#ff7f0e"][: len(hlines)]
    fig, axes = mpf.plot(
        to_mpf(x),
        type="candle",
        volume=True,
        style=_base_style(),
        hlines=dict(hlines=hlines, colors=colors, linewidths=[1.1] * len(hlines))
        if hlines
        else None,
        title=f"{symbol} Liquidity Map",
        returnfig=True,
    )
    ax = axes[0]
    txt = f"current_draw={draws.get('current_draw')}\nopposing_draw={draws.get('opposing_draw')}"
    ax.text(0.01, 0.98, txt, transform=ax.transAxes, va="top", fontsize=8)
    fig.savefig(str(path), dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_trade_plan(
    df_daily: pd.DataFrame, plan: dict[str, Any], path: Path, symbol: str, lookback: int
) -> None:
    x = df_daily.tail(lookback)
    levels = [plan.get("entry"), plan.get("stop"), plan.get("target")]
    hlines = [v for v in levels if v is not None]
    colors = []
    if plan.get("entry") is not None:
        colors.append("#1f77b4")
    if plan.get("stop") is not None:
        colors.append("#d62728")
    if plan.get("target") is not None:
        colors.append("#2ca02c")

    fig, axes = mpf.plot(
        to_mpf(x),
        type="candle",
        volume=True,
        style=_base_style(),
        hlines=dict(hlines=hlines, colors=colors, linewidths=[1.1] * len(hlines))
        if hlines
        else None,
        title=f"{symbol} Trade Plan",
        returnfig=True,
    )
    rr = plan.get("rr")
    rr_str = "n/a" if rr is None else f"{rr:.2f}"
    txt = f"entry={plan.get('entry')}\nstop={plan.get('stop')}\ntarget={plan.get('target')}\nrr={rr_str}"
    axes[0].text(0.01, 0.98, txt, transform=axes[0].transAxes, va="top", fontsize=8)
    fig.savefig(str(path), dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_vpvr_profile(
    df_daily: pd.DataFrame, stats: dict[str, Any], path: Path, symbol: str
) -> None:
    x = df_daily.tail(220).copy()
    fig, (ax_price, ax_prof) = plt.subplots(
        1, 2, figsize=(12, 6), gridspec_kw={"width_ratios": [4, 1]}
    )
    ax_price.plot(x["datetime"], x["close"], color="#1f77b4", linewidth=1.0)
    for lvl, color, name in [
        (stats["poc"], "#d62728", "POC"),
        (stats["vah"], "#2ca02c", "VAH"),
        (stats["val"], "#ff7f0e", "VAL"),
    ]:
        ax_price.axhline(lvl, color=color, linewidth=1.0, linestyle="--")
        ax_price.text(x["datetime"].iloc[-1], lvl, f" {name}", fontsize=8)
    ax_price.set_title(f"{symbol} Price + VPVR Levels")
    ax_price.grid(alpha=0.2)

    mids = np.array(stats["mids"])
    hist = np.array(stats["hist"])
    width = hist / max(hist.max(), 1e-9)
    ax_prof.barh(mids, width, color="#7f8c8d", alpha=0.8)
    ax_prof.invert_xaxis()
    ax_prof.set_title("Volume by Price")
    ax_prof.grid(alpha=0.2)

    fig.tight_layout()
    fig.savefig(str(path), dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_imbalance_fvg(
    df_daily: pd.DataFrame,
    fvgs: list[dict[str, Any]],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = df_daily.tail(lookback)
    fig, axes = mpf.plot(
        to_mpf(x),
        type="candle",
        volume=True,
        style=_base_style(),
        title=f"{symbol} FVG/Imbalance Context",
        returnfig=True,
    )
    ax = axes[0]
    min_dt = x["datetime"].iloc[0]
    max_dt = x["datetime"].iloc[-1]

    for zone in fvgs[-5:]:
        x0 = max(pd.Timestamp(zone["start_dt"]), min_dt)
        x1 = min(pd.Timestamp(zone["end_dt"]), max_dt)
        if x1 <= min_dt or x0 >= max_dt:
            continue
        color = "#2ca02c" if zone["direction"] == "bullish" else "#d62728"
        rect = Rectangle(
            (mdates.date2num(x0), zone["low"]),
            max(mdates.date2num(x1) - mdates.date2num(x0), 0.5),
            zone["high"] - zone["low"],
            facecolor=color,
            edgecolor=color,
            alpha=0.18,
        )
        ax.add_patch(rect)
        ax.hlines(
            zone["ce"],
            mdates.date2num(x0),
            mdates.date2num(x1),
            colors=color,
            linewidth=1.0,
            linestyles="--",
        )
    fig.savefig(str(path), dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_detail(df_daily: pd.DataFrame, path: Path, symbol: str) -> None:
    x = add_ma(df_daily.tail(120))
    apds = [
        mpf.make_addplot(x["EMA21"], color="#f39c12", width=1.0),
        mpf.make_addplot(x["SMA50"], color="#3498db", width=1.0),
    ]
    mpf.plot(
        to_mpf(x),
        type="candle",
        volume=True,
        style=_base_style(),
        addplot=apds,
        title=f"{symbol} Detail",
        savefig=dict(fname=str(path), dpi=170, bbox_inches="tight"),
    )


def main() -> None:
    args = parse_args()
    symbol = args.symbol.strip().upper()
    modules = parse_modules(args.modules)

    input_path = Path(args.input).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    daily, intraday, corp = load_ohlcv(input_path)
    zones = derive_zones(daily)
    ib = latest_intraday_ib(intraday)
    ibh_line, ibl_line = compute_period_ib(
        daily, period=args.period, first_n_bars=args.first_n_bars
    )
    events = detect_structure_events(daily)
    last_close = float(daily["close"].iloc[-1])
    draws = nearest_draws(last_close, zones)
    plan = trade_plan_from_zones(last_close, zones)

    generated: dict[str, str] = {}

    p_daily = outdir / f"{symbol}_daily_structure.png"
    plot_daily_structure(daily, zones, p_daily, symbol, args.daily_lookback)
    generated["daily_structure"] = str(p_daily)

    p_intraday = outdir / f"{symbol}_intraday_ibh_ibl.png"
    plot_intraday_ibh_ibl(intraday, ib, p_intraday, symbol, args.intraday_lookback)
    generated["intraday_ibh_ibl"] = str(p_intraday)

    p_ib = outdir / f"{symbol}_ib_overlay.png"
    plot_ib_overlay(
        daily,
        ibh_line,
        ibl_line,
        p_ib,
        symbol,
        args.period,
        args.first_n_bars,
        args.daily_lookback,
    )
    generated["ib_overlay"] = str(p_ib)

    p_events = outdir / f"{symbol}_structure_events.png"
    plot_structure_events(daily, events, p_events, symbol, args.daily_lookback)
    generated["structure_events"] = str(p_events)

    p_liq = outdir / f"{symbol}_liquidity_map.png"
    plot_liquidity_map(daily, draws, p_liq, symbol, args.daily_lookback)
    generated["liquidity_map"] = str(p_liq)

    p_plan = outdir / f"{symbol}_trade_plan.png"
    plot_trade_plan(daily, plan, p_plan, symbol, args.daily_lookback)
    generated["trade_plan"] = str(p_plan)

    vpvr = None
    if "vpvr" in modules:
        vpvr = vpvr_stats(daily)
        p_vpvr = outdir / f"{symbol}_vpvr_profile.png"
        plot_vpvr_profile(daily, vpvr, p_vpvr, symbol)
        generated["vpvr_profile"] = str(p_vpvr)

    fvgs = None
    if "imbalance" in modules:
        fvgs = detect_fvg(daily)
        p_fvg = outdir / f"{symbol}_imbalance_fvg.png"
        plot_imbalance_fvg(daily, fvgs, p_fvg, symbol, args.daily_lookback)
        generated["imbalance_fvg"] = str(p_fvg)

    if "detail" in modules:
        p_detail = outdir / f"{symbol}_detail.png"
        plot_detail(daily, p_detail, symbol)
        generated["detail"] = str(p_detail)

    evidence = {
        "symbol": symbol,
        "input": str(input_path),
        "modules": sorted(modules),
        "generated_charts": generated,
        "data_range": {
            "daily": {
                "start": str(daily["datetime"].iloc[0]),
                "end": str(daily["datetime"].iloc[-1]),
                "rows": int(len(daily)),
            },
            "intraday": {
                "start": str(intraday["datetime"].iloc[0]),
                "end": str(intraday["datetime"].iloc[-1]),
                "rows": int(len(intraday)),
            },
            "corp_actions_rows": int(len(corp)),
        },
        "ib_state": ib,
        "zones": zones[:12],
        "structure_events": [
            {
                "datetime": str(e["datetime"]),
                "side": e["side"],
                "label": e["label"],
                "broken_level": e["broken_level"],
                "close": e["close"],
            }
            for e in events
        ],
        "liquidity_draws": draws,
        "trade_plan": plan,
    }
    if vpvr is not None:
        evidence["vpvr"] = {
            "poc": vpvr["poc"],
            "vah": vpvr["vah"],
            "val": vpvr["val"],
            "hvn_top3": vpvr["hvn_top3"],
            "lvn_top3": vpvr["lvn_top3"],
        }
    if fvgs is not None:
        evidence["fvg_zones"] = [
            {
                "direction": z["direction"],
                "low": z["low"],
                "high": z["high"],
                "ce": z["ce"],
                "start_dt": str(z["start_dt"]),
                "end_dt": str(z["end_dt"]),
            }
            for z in fvgs
        ]

    evidence_path = outdir / f"{symbol}_chart_evidence.json"
    with evidence_path.open("w", encoding="utf-8") as f:
        json.dump(evidence, f, indent=2)

    print(
        json.dumps(
            {"ok": True, "charts": generated, "evidence": str(evidence_path)}, indent=2
        )
    )


if __name__ == "__main__":
    main()
