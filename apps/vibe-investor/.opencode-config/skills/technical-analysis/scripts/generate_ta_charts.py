#!/usr/bin/env python3
# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportAttributeAccessIssue=false

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Rectangle
import mplfinance as mpf
import numpy as np
import pandas as pd

from ta_common import (
    add_intraday_context,
    add_ma_stack,
    add_rsi,
    add_swings,
    add_volume_features,
    anomaly_overrides,
    compute_period_ib,
    derive_levels,
    derive_recent_fib_lines,
    detect_imbalance_zones,
    detect_structure_events,
    infer_ifvg_zones,
    latest_intraday_ib,
    load_ohlcv,
    select_nearest_levels,
)


DEFAULT_FIGRATIO = (20, 9)
DEFAULT_FIGSCALE = 1.25
DEFAULT_DPI = 180
MAX_DISPLAY_SR_LINES = 5
MAX_DISPLAY_FIB_LINES = 3
MAX_TRADE_TARGETS = 3
MIN_ACCEPTABLE_RR = 1.2


def _width_config() -> dict[str, float]:
    return {
        "candle_width": 0.72,
        "candle_linewidth": 0.9,
        "volume_width": 0.72,
        "volume_linewidth": 0.9,
        "ohlc_linewidth": 1.0,
        "line_width": 1.5,
    }


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
    parser.add_argument(
        "--range-mode",
        choices=["auto", "fixed"],
        default="auto",
        help="auto: dynamic daily window + full intraday, fixed: explicit lookbacks.",
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


# ---------------------------------------------------------------------------
# Chart-specific helpers
# ---------------------------------------------------------------------------


def to_mpf(df: pd.DataFrame) -> pd.DataFrame:
    x = df.copy()
    x = x.set_index("datetime")[["open", "high", "low", "close", "volume"]]
    return x


def _base_style() -> Any:
    return mpf.make_mpf_style(base_mpf_style="yahoo", gridstyle=":")


def prepare_daily_window(df_daily: pd.DataFrame, lookback: int) -> pd.DataFrame:
    enriched = pd.DataFrame(add_rsi(add_ma_stack(add_swings(df_daily))))
    if enriched.empty:
        return enriched
    used = min(max(int(lookback), 1), len(enriched))
    return enriched.tail(used).copy()


def nearest_draws(price: float, zones: list[dict[str, Any]]) -> dict[str, Any]:
    mids = [float(z["zone_mid"]) for z in zones]
    above = sorted([z for z in mids if z > price])
    below = sorted([z for z in mids if z < price], reverse=True)
    return {
        "current_draw": above[0] if above else None,
        "opposing_draw": below[0] if below else None,
    }


def infer_trade_side(df_daily: pd.DataFrame, events: list[dict[str, Any]]) -> str:
    if events:
        last_side = str(events[-1].get("side", "")).lower()
        if last_side == "up":
            return "long"
        if last_side == "down":
            return "short"
    x = add_ma_stack(df_daily.tail(120))
    if x.empty:
        return "neutral"
    latest = x.iloc[-1]
    close = float(latest["close"])
    ema = float(latest["EMA21"]) if pd.notna(latest["EMA21"]) else close
    sma50 = float(latest["SMA50"]) if pd.notna(latest["SMA50"]) else ema
    if close >= ema and ema >= sma50:
        return "long"
    if close <= ema and ema <= sma50:
        return "short"
    return "neutral"


def trade_plan_from_zones(
    price: float,
    zones: list[dict[str, Any]],
    side: str,
    rr_min: float = MIN_ACCEPTABLE_RR,
    max_targets: int = MAX_TRADE_TARGETS,
) -> dict[str, Any]:
    mids = sorted([float(z["zone_mid"]) for z in zones])
    above = [z for z in mids if z > price]
    below = [z for z in mids if z < price]
    plan: dict[str, Any] = {
        "setup_side": side,
        "action": "WAIT",
        "reason": "insufficient directional context",
        "entry": None,
        "stop": None,
        "target": None,
        "targets": [],
        "rr": None,
        "rr_by_target": [],
        "best_rr": None,
        "min_rr_required": rr_min,
    }
    if side not in {"long", "short"}:
        return plan
    if side == "long":
        if len(below) < 2 or len(above) == 0:
            plan["reason"] = "zone map lacks long entry/stop/target path"
            return plan
        entry = float(below[-1])
        stop = float(below[-2])
        targets = [float(t) for t in above[:max_targets]]
        risk = entry - stop
        rr_by_target = [((t - entry) / risk) for t in targets if risk > 0 and t > entry]
        action = "LONG_SETUP"
    else:
        if len(above) < 2 or len(below) == 0:
            plan["reason"] = "zone map lacks short entry/stop/target path"
            return plan
        entry = float(above[0])
        stop = float(above[1])
        targets = [float(t) for t in list(reversed(below))[:max_targets]]
        risk = stop - entry
        rr_by_target = [((entry - t) / risk) for t in targets if risk > 0 and t < entry]
        action = "SHORT_SETUP"
    best_rr = max(rr_by_target) if rr_by_target else None
    if best_rr is None:
        plan["reason"] = "no valid target produced positive reward"
        return plan
    if best_rr < rr_min:
        plan.update({
            "entry": entry, "stop": stop,
            "target": targets[0] if targets else None, "targets": targets,
            "rr": rr_by_target[0] if rr_by_target else None,
            "rr_by_target": rr_by_target, "best_rr": best_rr,
            "reason": f"best RR {best_rr:.2f} below minimum {rr_min:.2f}",
        })
        return plan
    plan.update({
        "action": action,
        "reason": "zone-to-zone path meets minimum RR",
        "entry": entry, "stop": stop,
        "target": targets[0] if targets else None, "targets": targets,
        "rr": rr_by_target[0] if rr_by_target else None,
        "rr_by_target": rr_by_target, "best_rr": best_rr,
    })
    return plan


def _focus_lookback_from_anchors(
    df: pd.DataFrame,
    anchors: list[pd.Timestamp],
    max_bars: int,
    min_bars: int,
    pre_buffer: int,
) -> int:
    if df.empty:
        return 0
    upper = min(max_bars, len(df))
    lower = min(min_bars, upper)
    if not anchors:
        return upper
    anchor = min(anchors)
    mask = df["datetime"] >= anchor
    idx = np.flatnonzero(mask.to_numpy())
    if len(idx) == 0:
        return upper
    start = max(int(idx[0]) - pre_buffer, 0)
    lookback = len(df) - start
    return min(upper, max(lower, lookback))


def compute_dynamic_daily_lookback(
    df_daily: pd.DataFrame,
    events: list[dict[str, Any]],
    imbalance_zones: list[dict[str, Any]],
    max_bars: int,
) -> int:
    anchors: list[pd.Timestamp] = []
    for e in events[-8:]:
        raw_dt = e.get("datetime")
        if raw_dt is None:
            continue
        dt = pd.to_datetime(str(raw_dt), errors="coerce")
        if pd.notna(dt):
            anchors.append(pd.Timestamp(dt))
    for z in imbalance_zones[-10:]:
        raw_z0 = z.get("start_dt")
        raw_z1 = z.get("end_dt")
        z0 = pd.to_datetime(str(raw_z0), errors="coerce") if raw_z0 is not None else pd.NaT
        z1 = pd.to_datetime(str(raw_z1), errors="coerce") if raw_z1 is not None else pd.NaT
        if pd.notna(z0):
            anchors.append(pd.Timestamp(z0))
        if pd.notna(z1):
            anchors.append(pd.Timestamp(z1))
    return _focus_lookback_from_anchors(
        df_daily, anchors, max_bars=max_bars, min_bars=110, pre_buffer=26,
    )


def vpvr_stats(df_daily: pd.DataFrame, bins: int = 40) -> dict[str, Any]:
    x = df_daily.tail(260)
    lo = float(x["low"].min())
    hi = float(x["high"].max())
    edges = np.linspace(lo, hi, bins + 1)
    up_hist = np.zeros(bins)
    down_hist = np.zeros(bins)
    mids = (edges[:-1] + edges[1:]) / 2.0
    for _, row in x.iterrows():
        li = max(np.searchsorted(edges, row["low"], side="right") - 1, 0)
        hi_i = min(np.searchsorted(edges, row["high"], side="right") - 1, bins - 1)
        if hi_i >= li:
            span = int(hi_i - li + 1)
            alloc = float(row["volume"]) / max(span, 1)
            if float(row["close"]) >= float(row["open"]):
                up_hist[li : hi_i + 1] += alloc
            else:
                down_hist[li : hi_i + 1] += alloc
    hist = up_hist + down_hist
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
        "up_hist": up_hist.tolist(),
        "down_hist": down_hist.tolist(),
        "poc": float(mids[poc_idx]),
        "vah": float(vals.max()),
        "val": float(vals.min()),
        "hvn_top3": [float(x) for x in mids[np.argsort(hist)[-3:]] if np.isfinite(x)],
        "lvn_top3": [float(x) for x in mids[np.argsort(hist)[:3]] if np.isfinite(x)],
    }


# ---------------------------------------------------------------------------
# Plot functions
# ---------------------------------------------------------------------------


def plot_daily_structure(
    df_daily: pd.DataFrame,
    zones: list[dict[str, Any]],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = prepare_daily_window(df_daily, lookback)
    last_close = float(x["close"].iloc[-1])
    hlines = select_nearest_levels(
        [z["zone_mid"] for z in zones], ref_price=last_close, max_n=MAX_DISPLAY_SR_LINES,
    )
    fib_lines = select_nearest_levels(
        derive_recent_fib_lines(x), ref_price=last_close, max_n=MAX_DISPLAY_FIB_LINES,
    )
    merged_hlines = hlines + fib_lines
    sh = x["swing_high"].copy()
    sl = x["swing_low"].copy()
    apds = []
    for col, color in [
        ("EMA21", "#f39c12"), ("SMA50", "#3498db"),
        ("SMA100", "#2ecc71"), ("SMA200", "#9b59b6"),
    ]:
        if x[col].notna().any():
            apds.append(mpf.make_addplot(x[col], color=color, width=1.8))
    if sh.notna().any():
        apds.append(mpf.make_addplot(sh, type="scatter", marker="v", markersize=60, color="#d62728"))
    if sl.notna().any():
        apds.append(mpf.make_addplot(sl, type="scatter", marker="^", markersize=60, color="#2ca02c"))
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(), addplot=apds,
        hlines=dict(
            hlines=merged_hlines,
            colors=(["#1f77b4"] * len(hlines)) + (["#8e44ad"] * len(fib_lines)),
            linewidths=([1.6] * len(hlines)) + ([1.5] * len(fib_lines)),
        ) if merged_hlines else None,
        marketcolor_overrides=anomaly_overrides(x),
        title=f"{symbol} Daily Structure",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]
    zone_preview = ", ".join(f"{v:.0f}" for v in hlines) if hlines else "-"
    fib_preview = ", ".join(f"{v:.0f}" for v in fib_lines) if fib_lines else "-"
    ax.legend(
        handles=[
            Line2D([], [], color="#f39c12", linewidth=2.0, label="EMA21"),
            Line2D([], [], color="#3498db", linewidth=2.0, label="SMA50"),
            Line2D([], [], color="#2ecc71", linewidth=2.0, label="SMA100"),
            Line2D([], [], color="#9b59b6", linewidth=2.0, label="SMA200"),
            Line2D([], [], color="#1f77b4", linewidth=2.0, label="S/R zones"),
            Line2D([], [], color="#8e44ad", linewidth=2.0, label="Fib levels"),
            Line2D([], [], marker="^", linestyle="None", markerfacecolor="#2ca02c",
                   markeredgecolor="#2ca02c", markersize=7, label="Swing low"),
            Line2D([], [], marker="v", linestyle="None", markerfacecolor="#d62728",
                   markeredgecolor="#d62728", markersize=7, label="Swing high"),
        ],
        loc="upper left", fontsize=8, ncol=2, framealpha=0.9,
    )
    ax.text(
        1.02, 1.15,
        f"S/R zones shown ({len(hlines)}): {zone_preview}\nFib levels shown ({len(fib_lines)}): {fib_preview}",
        transform=ax.transAxes, ha="right", va="top", fontsize=8,
        bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
    )
    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


def plot_intraday_structure(
    df_intraday: pd.DataFrame, ib: dict[str, Any],
    zones: list[dict[str, Any]], path: Path, symbol: str, lookback: int,
) -> None:
    x = add_intraday_context(df_intraday.tail(lookback))
    last_close = float(x["close"].iloc[-1])
    hlines = select_nearest_levels([z["zone_mid"] for z in zones], ref_price=last_close, max_n=2)
    apds = [
        mpf.make_addplot(x["EMA9"], color="#00bcd4", width=1.7),
        mpf.make_addplot(x["EMA20"], color="#5e35b1", width=1.7),
        mpf.make_addplot(x["VWAP"], color="#ff9800", width=1.9),
    ]
    merged_hlines = [ib["ibh"], ib["ibl"]] + hlines
    colors = ["#2ca02c", "#d62728"] + ["#1f77b4"] * len(hlines)
    linewidths = [1.8, 1.8] + [1.5] * len(hlines)
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(), addplot=apds,
        hlines=dict(hlines=merged_hlines, colors=colors, linewidths=linewidths),
        title=f"{symbol} Intraday Structure",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]
    latest = x.iloc[-1]
    latest_vwap = float(latest["VWAP"]) if pd.notna(latest["VWAP"]) else float(latest["close"])
    latest_ema9 = float(latest["EMA9"]) if pd.notna(latest["EMA9"]) else float(latest["close"])
    latest_ema20 = float(latest["EMA20"]) if pd.notna(latest["EMA20"]) else float(latest["close"])
    ax.legend(
        handles=[
            Line2D([], [], color="#00bcd4", linewidth=2.0, label="EMA9"),
            Line2D([], [], color="#5e35b1", linewidth=2.0, label="EMA20"),
            Line2D([], [], color="#ff9800", linewidth=2.0, label="VWAP"),
            Line2D([], [], color="#2ca02c", linewidth=2.0, label="IBH"),
            Line2D([], [], color="#d62728", linewidth=2.0, label="IBL"),
        ] + ([Line2D([], [], color="#1f77b4", linewidth=1.5, label="Daily S/R")] if hlines else []),
        loc="upper left", fontsize=8, ncol=2, framealpha=0.9,
    )
    ax.text(
        1.02, 1.15,
        f"IBH={ib['ibh']:.2f} | IBL={ib['ibl']:.2f} | State={ib['state']}\n"
        f"VWAP={latest_vwap:.2f} | EMA9={latest_ema9:.2f} | EMA20={latest_ema20:.2f}",
        transform=ax.transAxes, ha="right", va="top", fontsize=8,
        bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
    )
    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


def plot_intraday_vwap_momentum(
    df_intraday: pd.DataFrame,
    ib: dict[str, Any],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = add_intraday_context(df_intraday.tail(lookback))
    apds = [
        mpf.make_addplot(x["EMA9"], color="#00bcd4", width=1.7),
        mpf.make_addplot(x["EMA20"], color="#5e35b1", width=1.7),
        mpf.make_addplot(x["VWAP"], color="#ff9800", width=1.9),
    ]
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(), addplot=apds,
        hlines=dict(
            hlines=[ib["ibh"], ib["ibl"]],
            colors=["#2ca02c", "#d62728"],
            linewidths=[1.4, 1.4],
            alpha=0.6,
        ),
        title=f"{symbol} Intraday VWAP Momentum",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]
    latest = x.iloc[-1]
    latest_vwap = float(latest["VWAP"]) if pd.notna(latest["VWAP"]) else float(latest["close"])
    latest_ema9 = float(latest["EMA9"]) if pd.notna(latest["EMA9"]) else float(latest["close"])
    latest_ema20 = float(latest["EMA20"]) if pd.notna(latest["EMA20"]) else float(latest["close"])
    ax.legend(
        handles=[
            Line2D([], [], color="#00bcd4", linewidth=2.0, label="EMA9"),
            Line2D([], [], color="#5e35b1", linewidth=2.0, label="EMA20"),
            Line2D([], [], color="#ff9800", linewidth=2.0, label="Session VWAP"),
            Line2D([], [], color="#2ca02c", linewidth=1.6, label="IBH"),
            Line2D([], [], color="#d62728", linewidth=1.6, label="IBL"),
        ],
        loc="upper left", fontsize=8, ncol=2, framealpha=0.9,
    )
    ax.text(
        1.02, 1.15,
        f"VWAP={latest_vwap:.2f} | EMA9={latest_ema9:.2f} | EMA20={latest_ema20:.2f}\n"
        "Use EMA9/20 and VWAP alignment for intraday continuation vs fade bias",
        transform=ax.transAxes, ha="right", va="top", fontsize=8,
        bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
    )
    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


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
    ibh_slice = pd.Series(ibh_line.iloc[start:].values, index=x.index)
    ibl_slice = pd.Series(ibl_line.iloc[start:].values, index=x.index)
    apds = [
        mpf.make_addplot(ibh_slice, color="#2f6bff", width=2.0),
        mpf.make_addplot(ibl_slice, color="#ff7f0e", width=2.0),
    ]
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(), addplot=apds,
        title=f"{symbol} Initial Balance Overlay ({period}, {first_n})",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]
    latest_ibh = float(ibh_slice.dropna().iloc[-1]) if ibh_slice.notna().any() else None
    latest_ibl = float(ibl_slice.dropna().iloc[-1]) if ibl_slice.notna().any() else None
    ax.legend(
        handles=[
            Line2D([], [], color="#2f6bff", linewidth=2.0, label="Period IBH"),
            Line2D([], [], color="#ff7f0e", linewidth=2.0, label="Period IBL"),
        ],
        loc="upper left", fontsize=8, framealpha=0.9,
    )
    ax.text(
        1.02, 1.15,
        (
            f"IB period={period}, seed bars={first_n}\n"
            f"Latest IBH={latest_ibh:.2f} | Latest IBL={latest_ibl:.2f}\n"
            "Close above IBH / below IBL with follow-through = acceptance"
        )
        if latest_ibh is not None and latest_ibl is not None
        else f"IB period={period}, seed bars={first_n}",
        transform=ax.transAxes, ha="right", va="top", fontsize=8,
        bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
    )
    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


def plot_structure_events(
    df_daily: pd.DataFrame,
    events: list[dict[str, Any]],
    draws: dict[str, Any],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = df_daily.tail(lookback).copy().reset_index(drop=True)
    n = len(x)
    up_bos = np.full(n, np.nan)
    up_choch = np.full(n, np.nan)
    down_bos = np.full(n, np.nan)
    down_choch = np.full(n, np.nan)

    dt_to_idx = {pd.Timestamp(dt): int(i) for i, dt in enumerate(x["datetime"])}
    draws_list = [
        v for v in [draws.get("current_draw"), draws.get("opposing_draw")]
        if v is not None
    ]
    visible_events: list[dict[str, Any]] = []
    for e in events:
        dt = pd.Timestamp(e["datetime"])
        idx = dt_to_idx.get(dt)
        if idx is None:
            continue
        close = float(e.get("close", x.loc[idx, "close"]))
        side = str(e.get("side", "")).lower()
        label = str(e.get("label", "BOS")).upper()
        count = int(e.get("count", 1) or 1)
        if side == "up" and label == "CHOCH":
            up_choch[idx] = close
        elif side == "up":
            up_bos[idx] = close
        elif label == "CHOCH":
            down_choch[idx] = close
        else:
            down_bos[idx] = close
        visible_events.append(
            {**e, "_idx": idx, "_close": close, "label": label, "count": count}
        )

    apds = [
        mpf.make_addplot(up_bos, type="scatter", marker="^", markersize=120, color="#00c853"),
        mpf.make_addplot(up_choch, type="scatter", marker="^", markersize=115, color="#00acc1"),
        mpf.make_addplot(down_bos, type="scatter", marker="v", markersize=120, color="#e53935"),
        mpf.make_addplot(down_choch, type="scatter", marker="v", markersize=115, color="#fb8c00"),
    ]
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(), addplot=apds,
        hlines=dict(
            hlines=draws_list,
            colors=["#e91e63"] * len(draws_list),
            linewidths=[1.8] * len(draws_list),
        ) if draws_list else None,
        title=f"{symbol} Structure Events & Liquidity",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]
    atr_unit = float((x["high"] - x["low"]).tail(min(50, n)).median())
    if not np.isfinite(atr_unit) or atr_unit <= 0:
        atr_unit = max(float(x["close"].median()) * 0.01, 8.0)
    placed: list[tuple[int, float]] = []
    for e in sorted(visible_events, key=lambda d: int(d["_idx"]))[-10:]:
        xpos = int(e["_idx"])
        y = float(e["_close"])
        side = str(e.get("side", "")).lower()
        count = int(e.get("count", 1) or 1)
        text = str(e["label"]) if count <= 1 else f"{e['label']} x{count}"
        sign = 1.0 if side == "up" else -1.0
        ty = y + sign * atr_unit * 0.95
        for _ in range(7):
            overlap = any(
                abs(xpos - px) <= 5 and abs(ty - py) <= atr_unit * 0.65
                for px, py in placed
            )
            if not overlap:
                break
            ty += sign * atr_unit * 0.55
        ax.annotate(
            text, xy=(xpos, y), xytext=(xpos, ty), textcoords="data",
            ha="center", va="bottom" if side == "up" else "top",
            fontsize=8, color="#111111",
            bbox={"facecolor": "white", "alpha": 0.82, "edgecolor": "#d0d0d0"},
            arrowprops={"arrowstyle": "-", "linewidth": 0.7, "color": "#666666", "alpha": 0.8},
        )
        placed.append((xpos, ty))

    ax.legend(
        handles=[
            Line2D([], [], marker="^", linestyle="None", markerfacecolor="#00c853",
                   markeredgecolor="#00c853", markersize=8, label="Up BOS"),
            Line2D([], [], marker="^", linestyle="None", markerfacecolor="#00acc1",
                   markeredgecolor="#00acc1", markersize=8, label="Up CHOCH"),
            Line2D([], [], marker="v", linestyle="None", markerfacecolor="#e53935",
                   markeredgecolor="#e53935", markersize=8, label="Down BOS"),
            Line2D([], [], marker="v", linestyle="None", markerfacecolor="#fb8c00",
                   markeredgecolor="#fb8c00", markersize=8, label="Down CHOCH"),
        ] + ([Line2D([], [], color="#e91e63", linewidth=2.0, label="Liquidity Draw")] if draws_list else []),
        loc="upper left", fontsize=8, ncol=2, framealpha=0.9,
    )
    if draws_list:
        txt = f"curr_draw={draws.get('current_draw')} | opp_draw={draws.get('opposing_draw')}"
        ax.text(
            1.02, 1.15, txt, transform=ax.transAxes, ha="right", va="top", fontsize=9,
            bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
        )
    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
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
        v for v in [draws.get("current_draw"), draws.get("opposing_draw")]
        if v is not None
    ]
    colors = ["#1f77b4", "#ff7f0e"][: len(hlines)]
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(),
        hlines=dict(hlines=hlines, colors=colors, linewidths=[1.8] * len(hlines))
        if hlines else None,
        title=f"{symbol} Liquidity Map",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]
    txt = f"current_draw={draws.get('current_draw')}\nopposing_draw={draws.get('opposing_draw')}"
    ax.text(
        0.01, 0.98, txt, transform=ax.transAxes, va="top", fontsize=9,
        bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
    )
    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


def plot_trade_plan(
    df_daily: pd.DataFrame, plan: dict[str, Any], path: Path, symbol: str, lookback: int,
) -> None:
    x = df_daily.tail(lookback)
    entry = plan.get("entry")
    stop = plan.get("stop")
    targets = [float(v) for v in (plan.get("targets") or []) if v is not None]
    rr_by_target = [float(v) for v in (plan.get("rr_by_target") or []) if v is not None]
    action = str(plan.get("action", "WAIT"))
    side = str(plan.get("setup_side", "neutral")).lower()
    reason = str(plan.get("reason", ""))
    target_palette = ["#2ca02c", "#009688", "#1b5e20"]
    if side == "short":
        target_palette = ["#ff9800", "#ef6c00", "#e65100"]

    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(),
        title=f"{symbol} Trade Plan ({action})",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]
    line_style = "--" if action == "WAIT" else "-"
    handles: list[Line2D] = []
    if entry is not None:
        y = float(entry)
        ax.axhline(y, color="#1f77b4", linewidth=2.1, linestyle=line_style)
        ax.text(len(x) - 1, y, " ENTRY", fontsize=8, color="#1f77b4", fontweight="bold")
        handles.append(Line2D([], [], color="#1f77b4", linewidth=2.1, label="Entry"))
    if stop is not None:
        y = float(stop)
        ax.axhline(y, color="#d62728", linewidth=2.1, linestyle=line_style)
        ax.text(len(x) - 1, y, " STOP", fontsize=8, color="#d62728", fontweight="bold")
        handles.append(Line2D([], [], color="#d62728", linewidth=2.1, label="Invalidation"))
    for i, target in enumerate(targets[:MAX_TRADE_TARGETS]):
        c = target_palette[min(i, len(target_palette) - 1)]
        ax.axhline(float(target), color=c, linewidth=2.0, linestyle=line_style)
        ax.text(len(x) - 1, float(target), f" T{i + 1}", fontsize=8, color=c, fontweight="bold")
        rr_text = f" (RR {rr_by_target[i]:.2f})" if i < len(rr_by_target) else ""
        handles.append(Line2D([], [], color=c, linewidth=2.0, label=f"Target {i + 1}{rr_text}"))

    if handles:
        ax.legend(handles=handles, loc="upper left", fontsize=8, ncol=2, framealpha=0.9)

    rr1 = plan.get("rr")
    rr1_str = "n/a" if rr1 is None else f"{float(rr1):.2f}"
    best_rr = plan.get("best_rr")
    best_rr_str = "n/a" if best_rr is None else f"{float(best_rr):.2f}"
    txt = (
        f"side={side} | action={action}\n"
        f"entry={entry} | stop={stop}\n"
        f"targets={targets[:MAX_TRADE_TARGETS]}\n"
        f"rr_t1={rr1_str} | rr_best={best_rr_str} | rr_min={plan.get('min_rr_required')}\n"
        f"note={reason}"
    )
    ax.text(
        1.02, 1.15, txt, transform=ax.transAxes, ha="right", va="top", fontsize=9,
        bbox={
            "facecolor": "#fff4e5" if action == "WAIT" else "white",
            "alpha": 0.86, "edgecolor": "#d0d0d0",
        },
    )
    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


def plot_vpvr_profile(
    df_daily: pd.DataFrame, stats: dict[str, Any], path: Path, symbol: str,
) -> None:
    x = df_daily.tail(220).copy()
    fig, (ax_price, ax_prof) = plt.subplots(
        1, 2, figsize=(18, 8), gridspec_kw={"width_ratios": [5, 2]},
    )
    mpf.plot(
        to_mpf(x), type="candle", style=_base_style(), ax=ax_price,
        volume=False, update_width_config=_width_config(),
    )
    for lvl, color, name in [
        (stats["poc"], "#d62728", "POC"),
        (stats["vah"], "#2ca02c", "VAH"),
        (stats["val"], "#ff7f0e", "VAL"),
    ]:
        ax_price.axhline(lvl, color=color, linewidth=1.8, linestyle="--")
        ax_price.text(len(x) - 1, lvl, f" {name}", fontsize=10, fontweight="bold")
    ax_price.set_title(f"{symbol} Price + VPVR Levels")
    ax_price.grid(alpha=0.2)
    ax_price.legend(
        handles=[
            Line2D([], [], color="#d62728", linewidth=2.0, linestyle="--", label="POC"),
            Line2D([], [], color="#2ca02c", linewidth=2.0, linestyle="--", label="VAH"),
            Line2D([], [], color="#ff7f0e", linewidth=2.0, linestyle="--", label="VAL"),
        ],
        loc="upper left", fontsize=9, framealpha=0.9,
    )

    mids = np.array(stats["mids"])
    up_hist = np.array(stats.get("up_hist", stats["hist"]))
    down_hist = np.array(stats.get("down_hist", np.zeros_like(up_hist)))
    total_hist = up_hist + down_hist
    denom = max(float(total_hist.max()), 1e-9)
    up_width = up_hist / denom
    down_width = down_hist / denom
    bar_height = (
        float(np.diff(mids).mean()) * 0.9 if len(mids) > 1 else float(max(mids[0], 1.0))
    )
    ax_prof.barh(mids, up_width, height=bar_height, color="#2ca02c", alpha=0.85, label="Up-volume")
    ax_prof.barh(mids, down_width, left=up_width, height=bar_height, color="#d62728", alpha=0.75, label="Down-volume")
    for lvl, color in [
        (stats["poc"], "#d62728"), (stats["vah"], "#2ca02c"), (stats["val"], "#ff7f0e"),
    ]:
        ax_prof.axhline(lvl, color=color, linewidth=1.15, linestyle=":")
    ax_prof.set_title("Volume by Price")
    ax_prof.set_xlabel("Normalized volume")
    ax_prof.set_xlim(0, max(float((up_width + down_width).max()) * 1.08, 0.15))
    ax_prof.grid(alpha=0.2)
    ax_prof.legend(loc="lower right", fontsize=9, framealpha=0.9)

    fig.tight_layout()
    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


def plot_imbalance_fvg(
    df_daily: pd.DataFrame,
    zones: list[dict[str, Any]],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = df_daily.tail(lookback).copy().reset_index(drop=True)
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(),
        title=f"{symbol} FVG/Imbalance Context",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]
    min_dt = x["datetime"].iloc[0]
    max_dt = x["datetime"].iloc[-1]
    plotted_count = 0

    candidates: list[dict[str, Any]] = []
    for zone in zones[-24:]:
        x0 = max(pd.Timestamp(zone["start_dt"]), min_dt)
        x1 = min(pd.Timestamp(zone["end_dt"]), max_dt)
        if x1 <= min_dt or x0 >= max_dt:
            continue
        zone_type = str(zone.get("type", "FVG"))
        if zone_type == "IFVG":
            color = "#8e44ad"
        elif zone_type == "OPENING_GAP":
            color = "#1f77b4"
        elif zone_type == "VOLUME_IMBALANCE":
            color = "#e67e22"
        else:
            color = "#2ca02c" if zone["direction"] == "bullish" else "#d62728"
        s_idx = x[x["datetime"] >= x0].index
        e_idx = x[x["datetime"] <= x1].index
        if len(s_idx) == 0 or len(e_idx) == 0:
            continue
        start_idx = int(s_idx[0])
        end_idx = int(e_idx[-1])
        if end_idx < start_idx:
            continue
        end_idx = min(max(end_idx, start_idx + 7), len(x) - 1)
        zone_low = float(zone["low"])
        zone_high = float(zone["high"])
        if zone_high <= zone_low:
            continue
        type_weight = {
            "IFVG": 1.25, "FVG": 1.15, "VOLUME_IMBALANCE": 1.15, "OPENING_GAP": 0.95,
        }.get(zone_type, 1.0)
        recency = (end_idx + 1) / max(len(x), 1)
        score = (zone_high - zone_low) * type_weight * (0.65 + recency)
        candidates.append({
            "start_idx": start_idx, "end_idx": end_idx,
            "zone_low": zone_low, "zone_high": zone_high,
            "ce": float(zone["ce"]), "type": zone_type,
            "direction": str(zone.get("direction", "bullish")),
            "color": color, "score": score,
        })

    if candidates:
        selected = sorted(candidates, key=lambda z: float(z["score"]), reverse=True)[:9]
        selected = sorted(selected, key=lambda z: int(z["start_idx"]))
        for rank, z in enumerate(selected):
            alpha = 0.56 if rank < 3 else (0.46 if rank < 6 else 0.36)
            rect = Rectangle(
                (float(z["start_idx"]), float(z["zone_low"])),
                max(float(z["end_idx"] - z["start_idx"]), 1.0),
                float(z["zone_high"] - z["zone_low"]),
                facecolor=str(z["color"]), edgecolor=str(z["color"]),
                linewidth=2.0, alpha=alpha, zorder=0,
            )
            ax.add_patch(rect)
            ax.hlines(
                float(z["ce"]), int(z["start_idx"]), int(z["end_idx"]),
                colors=str(z["color"]), linewidth=2.0, linestyles="--", zorder=1,
            )
            if rank < 6:
                short = {"VOLUME_IMBALANCE": "VI", "OPENING_GAP": "GAP"}.get(str(z["type"]), str(z["type"]))
                arrow = "↑" if str(z["direction"]).lower() == "bullish" else "↓"
                ax.text(
                    float(z["end_idx"]) + 0.6, float(z["ce"]), f"{short}{arrow}",
                    fontsize=8, color="#111111", va="center",
                    bbox={"facecolor": "white", "alpha": 0.72, "edgecolor": "#d0d0d0"},
                )
        plotted_count = len(selected)
        ax.set_xlim(-0.5, len(x) + 3)

    ax.legend(
        handles=[
            Rectangle((0, 0), 1, 1, facecolor="#2ca02c", edgecolor="#2ca02c", alpha=0.35, label="Bullish FVG"),
            Rectangle((0, 0), 1, 1, facecolor="#d62728", edgecolor="#d62728", alpha=0.35, label="Bearish FVG"),
            Rectangle((0, 0), 1, 1, facecolor="#8e44ad", edgecolor="#8e44ad", alpha=0.35, label="IFVG"),
            Rectangle((0, 0), 1, 1, facecolor="#e67e22", edgecolor="#e67e22", alpha=0.35, label="Volume Imbalance"),
            Rectangle((0, 0), 1, 1, facecolor="#1f77b4", edgecolor="#1f77b4", alpha=0.35, label="Opening Gap"),
        ],
        loc="upper left", fontsize=8, ncol=2, framealpha=0.9,
    )
    if plotted_count == 0:
        ax.text(
            1.02, 1.15, "No imbalance zones inside the current plotted window.",
            transform=ax.transAxes, ha="right", va="top", fontsize=9,
            bbox={"facecolor": "white", "alpha": 0.82, "edgecolor": "#d0d0d0"},
        )
    else:
        ax.text(
            1.02, 1.15, f"Plotted zones: {plotted_count}",
            transform=ax.transAxes, ha="right", va="top", fontsize=9,
            bbox={"facecolor": "white", "alpha": 0.82, "edgecolor": "#d0d0d0"},
        )

    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


def plot_detail(df_daily: pd.DataFrame, path: Path, symbol: str, lookback: int) -> None:
    x = prepare_daily_window(df_daily, lookback)
    sh = x["swing_high"].copy()
    sl = x["swing_low"].copy()
    last_close = float(x["close"].iloc[-1])
    fib_lines = select_nearest_levels(
        derive_recent_fib_lines(x), ref_price=last_close, max_n=MAX_DISPLAY_FIB_LINES,
    )
    rsi70 = pd.Series(70.0, index=x.index)
    rsi30 = pd.Series(30.0, index=x.index)
    apds = []
    if x["EMA21"].notna().any():
        apds.append(mpf.make_addplot(x["EMA21"], color="#f39c12", width=1.8))
    if x["SMA50"].notna().any():
        apds.append(mpf.make_addplot(x["SMA50"], color="#3498db", width=1.8))
    if sh.notna().any():
        apds.append(mpf.make_addplot(sh, type="scatter", marker="v", markersize=60, color="#d62728"))
    if sl.notna().any():
        apds.append(mpf.make_addplot(sl, type="scatter", marker="^", markersize=60, color="#2ca02c"))
    apds.extend([
        mpf.make_addplot(x["RSI14"], panel=2, color="#9b59b6", width=1.6, ylabel="RSI14"),
        mpf.make_addplot(rsi70, panel=2, color="#95a5a6", width=1.2),
        mpf.make_addplot(rsi30, panel=2, color="#95a5a6", width=1.2),
    ])
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(), addplot=apds,
        hlines=dict(
            hlines=fib_lines,
            colors=["#8e44ad"] * len(fib_lines),
            linewidths=[1.5] * len(fib_lines),
        ) if fib_lines else None,
        marketcolor_overrides=anomaly_overrides(x),
        title=f"{symbol} Detail",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax_price = axes[0]
    ax_rsi = axes[4] if len(axes) > 4 else axes[-1]
    ax_rsi.set_ylim(0, 100)
    if len(axes) > 5:
        ax_rsi.tick_params(left=False, labelleft=False)
        axes[5].set_ylim(0, 100)
        axes[5].set_ylabel("RSI14")
    else:
        ax_rsi.set_ylabel("RSI14")
    ax_rsi.text(
        0.01, 0.92, "Bottom panel: RSI14 (purple) with 70/30 guides",
        transform=ax_rsi.transAxes, va="top", fontsize=8,
        bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
    )

    fib_preview = ", ".join(f"{v:.0f}" for v in fib_lines) if fib_lines else "-"
    ax_price.legend(
        handles=[
            Line2D([], [], color="#f39c12", linewidth=2.0, label="EMA21"),
            Line2D([], [], color="#3498db", linewidth=2.0, label="SMA50"),
            Line2D([], [], color="#8e44ad", linewidth=2.0, label="Fib levels"),
            Line2D([], [], marker="^", linestyle="None", markerfacecolor="#2ca02c",
                   markeredgecolor="#2ca02c", markersize=7, label="Swing low"),
            Line2D([], [], marker="v", linestyle="None", markerfacecolor="#d62728",
                   markeredgecolor="#d62728", markersize=7, label="Swing high"),
        ],
        loc="upper left", fontsize=8, ncol=2, framealpha=0.9,
    )
    ax_price.text(
        1.02, 1.15, f"Fib levels shown ({len(fib_lines)}): {fib_preview}",
        transform=ax_price.transAxes, ha="right", va="top", fontsize=8,
        bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
    )

    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    args = parse_args()
    symbol = args.symbol.strip().upper()
    modules = parse_modules(args.modules)

    input_path = Path(args.input).expanduser().resolve()
    outdir = Path(args.outdir).expanduser().resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    daily, intraday, corp = load_ohlcv(input_path)
    daily = add_ma_stack(daily)
    daily = add_swings(daily)
    daily = add_volume_features(daily)
    zones = derive_levels(daily)
    events = detect_structure_events(daily)
    imbalance_zones_all = detect_imbalance_zones(daily, dt_key="start_dt")

    if args.range_mode == "auto":
        daily_lookback = compute_dynamic_daily_lookback(
            daily, events, imbalance_zones_all, max_bars=args.daily_lookback,
        )
        intraday_lookback = len(intraday)
    else:
        daily_lookback = min(args.daily_lookback, len(daily))
        intraday_lookback = min(args.intraday_lookback, len(intraday))

    daily_lookback = min(len(daily), max(60, daily_lookback))
    if args.range_mode == "auto":
        intraday_lookback = len(intraday)
    else:
        intraday_lookback = min(len(intraday), max(30, intraday_lookback))
    detail_lookback = min(len(daily), max(90, min(daily_lookback, 150)))
    imbalance_lookback = min(len(daily), max(80, min(daily_lookback, 130)))

    ib = latest_intraday_ib(intraday)
    ibh_line, ibl_line = compute_period_ib(
        daily, period=args.period, first_n_bars=args.first_n_bars,
    )
    last_close = float(daily["close"].iloc[-1])
    draws = nearest_draws(last_close, zones)
    trade_side = infer_trade_side(daily, events)
    plan = trade_plan_from_zones(last_close, zones, side=trade_side)

    generated: dict[str, str] = {}

    p_daily = outdir / f"{symbol}_daily_structure.png"
    plot_daily_structure(daily, zones, p_daily, symbol, daily_lookback)
    generated["daily_structure"] = str(p_daily)

    p_intraday = outdir / f"{symbol}_intraday_structure.png"
    plot_intraday_structure(intraday, ib, zones, p_intraday, symbol, intraday_lookback)
    generated["intraday_structure"] = str(p_intraday)

    p_ib = outdir / f"{symbol}_ib_overlay.png"
    plot_ib_overlay(
        daily, ibh_line, ibl_line, p_ib, symbol,
        args.period, args.first_n_bars, daily_lookback,
    )
    generated["ib_overlay"] = str(p_ib)

    p_events = outdir / f"{symbol}_structure_events.png"
    plot_structure_events(daily, events, draws, p_events, symbol, daily_lookback)
    generated["structure_events"] = str(p_events)

    p_plan = outdir / f"{symbol}_trade_plan.png"
    plot_trade_plan(daily, plan, p_plan, symbol, daily_lookback)
    generated["trade_plan"] = str(p_plan)

    vpvr = None
    if "vpvr" in modules:
        vpvr = vpvr_stats(daily)
        p_vpvr = outdir / f"{symbol}_vpvr_profile.png"
        plot_vpvr_profile(daily, vpvr, p_vpvr, symbol)
        generated["vpvr_profile"] = str(p_vpvr)

    imbalance_zones = None
    if "imbalance" in modules:
        imbalance_zones = imbalance_zones_all
        p_fvg = outdir / f"{symbol}_imbalance_fvg.png"
        plot_imbalance_fvg(daily, imbalance_zones, p_fvg, symbol, imbalance_lookback)
        generated["imbalance_fvg"] = str(p_fvg)

    if "detail" in modules:
        p_detail = outdir / f"{symbol}_detail.png"
        plot_detail(daily, p_detail, symbol, detail_lookback)
        generated["detail"] = str(p_detail)

    range_selection = {
        "mode": args.range_mode,
        "daily_lookback_used": int(daily_lookback),
        "detail_lookback_used": int(detail_lookback),
        "intraday_lookback_used": int(intraday_lookback),
    }
    if "imbalance" in modules:
        range_selection["imbalance_lookback_used"] = int(imbalance_lookback)

    evidence = {
        "symbol": symbol,
        "input": str(input_path),
        "modules": sorted(modules),
        "generated_charts": generated,
        "range_selection": range_selection,
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
                "count": int(e.get("count", 1)),
            }
            for e in events
        ],
        "liquidity_draws": draws,
        "trade_plan": plan,
    }
    if vpvr is not None:
        evidence["vpvr"] = {
            "poc": vpvr["poc"], "vah": vpvr["vah"], "val": vpvr["val"],
            "hvn_top3": vpvr["hvn_top3"], "lvn_top3": vpvr["lvn_top3"],
        }
    if imbalance_zones is not None:
        evidence["imbalance_zones"] = [
            {
                "type": z.get("type", "FVG"), "direction": z["direction"],
                "low": z["low"], "high": z["high"], "ce": z["ce"],
                "start_dt": str(z["start_dt"]), "end_dt": str(z["end_dt"]),
            }
            for z in imbalance_zones
        ]

    evidence_path = outdir / f"{symbol}_chart_evidence.json"
    with evidence_path.open("w", encoding="utf-8") as f:
        json.dump(evidence, f, indent=2)

    print(json.dumps({"ok": True, "charts": generated, "evidence": str(evidence_path)}, indent=2))


if __name__ == "__main__":
    main()
