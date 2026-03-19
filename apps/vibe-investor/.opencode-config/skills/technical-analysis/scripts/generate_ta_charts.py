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
    add_atr14,
    add_intraday_context,
    add_ma_stack,
    add_rsi,
    add_swings,
    add_volume_features,
    anomaly_overrides,
    choose_adaptive_ma,
    derive_levels,
    detect_structure_events,
    detect_sweep_events,
    detect_trendline_levels,
    liquidity_draws,
    liquidity_path_after_event,
    load_ohlcv,
    pick_draw_targets,
    select_nearest_levels,
)
from ta_context_location import (
    classify_liquidity_sweep,
    derive_internal_liquidity_levels,
    find_equal_liquidity_clusters,
    remap_liquidity_draws,
)
from wyckoff_state import build_wyckoff_state


DEFAULT_FIGRATIO = (20, 9)
DEFAULT_FIGSCALE = 1.25
DEFAULT_DPI = 180
MAX_DISPLAY_SR_LINES = 5
DAILY_SR_LINE_COLORS = ["#1f77b4", "#2ca02c", "#ff7f0e", "#d62728", "#17becf"]
DAILY_SR_LINE_WIDTH = 1.75
DAILY_SR_COLOR = "#374151"
DAILY_SR_MARKER_SIZE = 18
WYCKOFF_PHASE_COLORS = {
    "accumulation": "#9fd0c3",
    "markup": "#b8c7f5",
    "distribution": "#efc1be",
    "markdown": "#e7c4a8",
    "unclear": "#d1d5db",
}
SWEEP_COLORS = {
    "accepted_up": "#00c853",
    "rejected_up": "#e53935",
    "unresolved_up": "#9e9e9e",
    "accepted_down": "#e53935",
    "rejected_down": "#00c853",
    "unresolved_down": "#9e9e9e",
}
SWEEP_TYPE_MARKERS = {
    "eqh": "D",
    "eql": "D",
    "trendline": "P",
    "swing": "o",
}
EQH_COLOR = "#ab47bc"
EQL_COLOR = "#ff7043"
INTERNAL_LIQ_COLOR = "#78909c"


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
        help="Comma-separated modules: core,vpvr or all.",
    )
    parser.add_argument(
        "--ma-mode",
        choices=["hybrid", "baseline"],
        default="hybrid",
        help="Daily chart MA mode: hybrid or baseline.",
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
    CHART_MODULES = {"core", "vpvr"}
    items = {x.strip().lower() for x in raw.split(",") if x.strip()}
    if not items:
        items = {"core"}
    if "all" in items:
        return set(CHART_MODULES)
    items &= CHART_MODULES
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


def build_daily_ma_config(
    df_daily: pd.DataFrame,
    ma_mode: str,
) -> dict[str, Any]:
    config: dict[str, Any] = {
        "mode": ma_mode,
        "displayed_series": [],
    }
    if ma_mode == "baseline":
        config["displayed_series"] = ["EMA21", "SMA50", "SMA200"]
        return config

    adaptive = choose_adaptive_ma(df_daily)
    adaptive_period = adaptive.get("adaptive_period")
    if adaptive_period is None:
        raise ValueError("hybrid MA mode requested but no adaptive period was found")

    config["adaptive"] = {
        "period": int(adaptive_period),
        "ma_type": "sma",
        "respect_score": float(adaptive["score"]),
        "label": f"SMA{int(adaptive_period)}",
    }
    details = adaptive.get("details")
    if isinstance(details, dict) and details:
        config["adaptive"]["details"] = details
    config["displayed_series"] = ["EMA21", "SMA50", "SMA200", f"SMA{int(adaptive_period)}"]
    return config


def _daily_ma_lines(
    x: pd.DataFrame,
    ma_config: dict[str, Any],
) -> tuple[list[Any], list[Line2D], str]:
    mode = str(ma_config["mode"])
    apds: list[Any] = []
    legend_handles: list[Line2D] = []
    title_suffix = "S/R + Baseline MA"

    if mode == "baseline":
        lines = [
            ("EMA21", "#f39c12", "EMA21", 1.8),
            ("SMA50", "#3498db", "SMA50", 1.8),
            ("SMA200", "#9b59b6", "SMA200", 1.8),
        ]
    else:
        adaptive = dict(ma_config["adaptive"])
        col = adaptive["label"]
        if col not in x.columns:
            x[col] = x["close"].rolling(int(adaptive["period"])).mean()
        lines = [
            ("EMA21", "#f39c12", "EMA21", 1.6),
            ("SMA50", "#3498db", "SMA50", 1.6),
            ("SMA200", "#9b59b6", "SMA200", 1.7),
            (col, "#e74c3c", f"Adaptive {col}", 2.2),
        ]
        title_suffix = f"S/R + Hybrid {col}"

    for col, color, label, width in lines:
        if col in x.columns and x[col].notna().any():
            apds.append(mpf.make_addplot(x[col], color=color, width=width))
            legend_handles.append(
                Line2D([], [], color=color, linewidth=2.0, label=label)
            )
    return apds, legend_handles, title_suffix


def _level_touch_indices(
    df: pd.DataFrame,
    level: float,
    tolerance_pct: float = 0.015,
) -> list[int]:
    tol = max(abs(level) * tolerance_pct, 1e-9)
    mask = (
        ((df["low"] - tol) <= level) & ((df["high"] + tol) >= level)
    ) | ((df["close"] - level).abs() <= tol)
    return [int(i) for i in np.flatnonzero(mask.to_numpy())]


def _cluster_touch_indices(indices: list[int], gap: int = 6) -> list[tuple[int, int]]:
    if not indices:
        return []
    sorted_idx = sorted(indices)
    clusters: list[tuple[int, int]] = []
    start = sorted_idx[0]
    end = sorted_idx[0]
    for idx in sorted_idx[1:]:
        if idx - end <= gap:
            end = idx
            continue
        clusters.append((start, end))
        start = idx
        end = idx
    clusters.append((start, end))
    return clusters


def _draw_level_segments(
    ax: Any,
    df: pd.DataFrame,
    levels: list[float],
    colors: list[str],
    linewidth: float,
    extend_to_latest: bool = True,
    latest_min_window: int = 18,
    historical_pad: int = 2,
) -> list[float]:
    visible_levels: list[float] = []
    n = len(df)
    if n == 0:
        return visible_levels
    recent_start = max(0, n - latest_min_window)
    for i, level in enumerate(levels):
        color = colors[i % len(colors)] if colors else DAILY_SR_COLOR
        touches = _level_touch_indices(df, float(level))
        if not touches:
            continue
        clusters = _cluster_touch_indices(touches)
        drawn_any = False
        if len(clusters) >= 2:
            start, end = clusters[-2]
            x0 = max(0, start - historical_pad)
            x1 = min(n - 1, end + historical_pad)
            ax.plot(
                [x0, x1], [float(level), float(level)],
                color=color, linewidth=linewidth, alpha=0.52,
                linestyle=(0, (4, 3)), solid_capstyle="round",
            )
            ax.scatter(
                [x0, x1], [float(level), float(level)],
                color=color, s=DAILY_SR_MARKER_SIZE, marker="s", alpha=0.55, zorder=3,
            )
            drawn_any = True
        latest_start, latest_end = clusters[-1]
        x0 = max(recent_start, latest_start - historical_pad)
        x1 = n - 1 if extend_to_latest else min(n - 1, latest_end + historical_pad)
        if x1 > x0:
            ax.plot(
                [x0, x1], [float(level), float(level)],
                color=color, linewidth=linewidth, alpha=0.92,
                linestyle=(0, (6, 3)), solid_capstyle="round",
            )
            ax.scatter(
                [x0, x1], [float(level), float(level)],
                color=color, s=DAILY_SR_MARKER_SIZE, marker="s", alpha=0.95, zorder=4,
            )
            drawn_any = True
        if drawn_any:
            visible_levels.append(float(level))
    return visible_levels




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
    ma_config: dict[str, Any],
) -> None:
    x = prepare_daily_window(df_daily, lookback)
    last_close = float(x["close"].iloc[-1])
    sr_levels = select_nearest_levels(
        [z["zone_mid"] for z in zones], ref_price=last_close, max_n=MAX_DISPLAY_SR_LINES,
    )
    sr_colors = [DAILY_SR_COLOR] * len(sr_levels)
    sh = x["swing_high"].copy()
    sl = x["swing_low"].copy()
    apds, legend_handles, title_suffix = _daily_ma_lines(x, ma_config)
    if sh.notna().any():
        apds.append(mpf.make_addplot(sh, type="scatter", marker="v", markersize=60, color="#d62728"))
    if sl.notna().any():
        apds.append(mpf.make_addplot(sl, type="scatter", marker="^", markersize=60, color="#2ca02c"))
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(), addplot=apds,
        marketcolor_overrides=anomaly_overrides(x),
        title=f"{symbol} Daily Structure ({title_suffix})",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]
    visible_levels = _draw_level_segments(
        ax, x.reset_index(drop=True), sr_levels, sr_colors, DAILY_SR_LINE_WIDTH
    )
    zone_preview = ", ".join(f"{v:.0f}" for v in visible_levels) if visible_levels else "-"
    if visible_levels:
        legend_handles.append(
            Line2D(
                [], [], color=DAILY_SR_COLOR, linewidth=DAILY_SR_LINE_WIDTH,
                linestyle=(0, (6, 3)), marker="s", markersize=5,
                label="Localized S/R",
            )
        )
    legend_handles.extend([
        Line2D([], [], marker="^", linestyle="None", markerfacecolor="#2ca02c",
               markeredgecolor="#2ca02c", markersize=7, label="Swing low"),
        Line2D([], [], marker="v", linestyle="None", markerfacecolor="#d62728",
               markeredgecolor="#d62728", markersize=7, label="Swing high"),
    ])
    ax.legend(handles=legend_handles, loc="upper left", fontsize=8, ncol=2, framealpha=0.9)
    ax.text(
        1.02, 1.15,
        (
            f"S/R zones shown ({len(visible_levels)}): {zone_preview}"
            if visible_levels
            else "No localized S/R levels selected"
        ),
        transform=ax.transAxes, ha="right", va="top", fontsize=8,
        bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
    )
    fig.savefig(str(path), dpi=DEFAULT_DPI, bbox_inches="tight")
    plt.close(fig)


def plot_intraday_structure(
    df_intraday: pd.DataFrame,
    zones: list[dict[str, Any]],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = add_intraday_context(df_intraday.tail(lookback))
    last_close = float(x["close"].iloc[-1])
    hlines = select_nearest_levels([z["zone_mid"] for z in zones], ref_price=last_close, max_n=2)
    apds = [
        mpf.make_addplot(x["EMA9"], color="#00bcd4", width=1.7),
        mpf.make_addplot(x["EMA20"], color="#5e35b1", width=1.7),
        mpf.make_addplot(x["VWAP"], color="#ff9800", width=1.9),
    ]
    plot_kwargs: dict[str, Any] = {
        "type": "candle",
        "volume": True,
        "style": _base_style(),
        "addplot": apds,
        "title": f"{symbol} Intraday Structure",
        "figratio": DEFAULT_FIGRATIO,
        "figscale": DEFAULT_FIGSCALE,
        "update_width_config": _width_config(),
        "returnfig": True,
    }
    if hlines:
        plot_kwargs["hlines"] = {
            "hlines": hlines,
            "colors": ["#1f77b4"] * len(hlines),
            "linewidths": [1.5] * len(hlines),
        }
    fig, axes = mpf.plot(to_mpf(x), **plot_kwargs)
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
        ] + ([Line2D([], [], color="#1f77b4", linewidth=1.5, label="Daily S/R")] if hlines else []),
        loc="upper left", fontsize=8, ncol=2, framealpha=0.9,
    )
    ax.text(
        1.02, 1.15,
        f"VWAP={latest_vwap:.2f} | EMA9={latest_ema9:.2f} | EMA20={latest_ema20:.2f}",
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
    sweep_events: list[dict[str, Any]] | None = None,
    sweep_label: str = "none",
    sweep_outcome: str = "unresolved",
    sweep_side: str | None = None,
    path_state: str = "unclear",
    eqh_levels: list[float] | None = None,
    eql_levels: list[float] | None = None,
    internal_levels: list[float] | None = None,
) -> None:
    x = df_daily.tail(lookback).copy().reset_index(drop=True)
    n = len(x)
    up_bos = np.full(n, np.nan)
    up_choch = np.full(n, np.nan)
    down_bos = np.full(n, np.nan)
    down_choch = np.full(n, np.nan)

    dt_to_idx = {pd.Timestamp(dt): int(i) for i, dt in enumerate(x["datetime"])}
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

    apds = []
    if np.isfinite(up_bos).any():
        apds.append(
            mpf.make_addplot(
                up_bos, type="scatter", marker="^", markersize=120, color="#00c853",
            )
        )
    if np.isfinite(up_choch).any():
        apds.append(
            mpf.make_addplot(
                up_choch, type="scatter", marker="^", markersize=115, color="#00acc1",
            )
        )
    if np.isfinite(down_bos).any():
        apds.append(
            mpf.make_addplot(
                down_bos, type="scatter", marker="v", markersize=120, color="#e53935",
            )
        )
    if np.isfinite(down_choch).any():
        apds.append(
            mpf.make_addplot(
                down_choch, type="scatter", marker="v", markersize=115, color="#fb8c00",
            )
        )
    fig, axes = mpf.plot(
        to_mpf(x), type="candle", volume=True, style=_base_style(),
        addplot=apds,
        title=f"{symbol} Structure Events & Liquidity",
        figratio=DEFAULT_FIGRATIO, figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(), returnfig=True,
    )
    ax = axes[0]

    # Draw draw-target lines manually (avoids mpf hlines auto-legend)
    draws_list = [
        v for v in [draws.get("current_draw"), draws.get("opposing_draw")]
        if v is not None
    ]
    for dlvl in draws_list:
        ax.axhline(dlvl, color="#e91e63", linewidth=1.8, linestyle="-", alpha=0.85)

    # EQH / EQL / internal liquidity levels
    if eqh_levels:
        for lvl in eqh_levels:
            ax.axhline(lvl, color=EQH_COLOR, linewidth=1.4, linestyle=(0, (2, 3)), alpha=0.85)
    if eql_levels:
        for lvl in eql_levels:
            ax.axhline(lvl, color=EQL_COLOR, linewidth=1.4, linestyle=(0, (2, 3)), alpha=0.85)
    if internal_levels:
        for lvl in internal_levels:
            ax.axhline(lvl, color=INTERNAL_LIQ_COLOR, linewidth=1.0, linestyle=":", alpha=0.7)

    atr_unit = float((x["high"] - x["low"]).tail(min(50, n)).median())
    if not np.isfinite(atr_unit) or atr_unit <= 0:
        atr_unit = max(float(x["close"].median()) * 0.01, 8.0)

    # BOS/CHOCH annotations
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

    # Sweep event markers
    if sweep_events:
        dt_to_idx_sweep = {pd.Timestamp(str(row["datetime"])): int(i) for i, row in x.iterrows()}
        for se in sweep_events:
            se_dt = pd.Timestamp(str(se["datetime"]))
            se_idx = dt_to_idx_sweep.get(se_dt)
            if se_idx is None:
                continue
            se_level = float(se["level"])
            se_side = str(se.get("side", "up"))
            se_outcome_val = str(se.get("outcome", "unresolved"))
            se_type = str(se.get("sweep_type", "swing"))
            color_key = f"{se_outcome_val}_{se_side}"
            color = SWEEP_COLORS.get(color_key, "#9e9e9e")
            marker = SWEEP_TYPE_MARKERS.get(se_type, "o")
            ax.scatter(
                [se_idx], [se_level], color=color, s=200, marker=marker,
                edgecolors="#111111", linewidths=0.8, zorder=6, alpha=0.95,
            )
            sign = 1.0 if se_side == "up" else -1.0
            ax.annotate(
                f"{se_type} {se_outcome_val}",
                xy=(se_idx, se_level),
                xytext=(se_idx, se_level + sign * atr_unit * 1.4),
                textcoords="data", ha="center",
                va="bottom" if se_side == "up" else "top",
                fontsize=7, color=color, fontweight="bold",
                bbox={"facecolor": "white", "alpha": 0.85, "edgecolor": color, "boxstyle": "round,pad=0.2"},
                arrowprops={"arrowstyle": "->", "linewidth": 1.0, "color": color, "alpha": 0.9},
            )

    # Single unified legend
    legend_handles: list[Line2D] = [
        Line2D([], [], marker="^", linestyle="None", markerfacecolor="#00c853",
               markeredgecolor="#00c853", markersize=8, label="Up BOS"),
        Line2D([], [], marker="^", linestyle="None", markerfacecolor="#00acc1",
               markeredgecolor="#00acc1", markersize=8, label="Up CHOCH"),
        Line2D([], [], marker="v", linestyle="None", markerfacecolor="#e53935",
               markeredgecolor="#e53935", markersize=8, label="Down BOS"),
        Line2D([], [], marker="v", linestyle="None", markerfacecolor="#fb8c00",
               markeredgecolor="#fb8c00", markersize=8, label="Down CHOCH"),
    ]
    if draws_list:
        legend_handles.append(
            Line2D([], [], color="#e91e63", linewidth=1.8, label="Draw target"),
        )
    if eqh_levels:
        legend_handles.append(
            Line2D([], [], color=EQH_COLOR, linewidth=1.4, linestyle=(0, (2, 3)), label="EQH"),
        )
    if eql_levels:
        legend_handles.append(
            Line2D([], [], color=EQL_COLOR, linewidth=1.4, linestyle=(0, (2, 3)), label="EQL"),
        )
    if internal_levels:
        legend_handles.append(
            Line2D([], [], color=INTERNAL_LIQ_COLOR, linewidth=1.0, linestyle=":", label="Internal liq"),
        )
    if sweep_events:
        legend_handles.append(
            Line2D([], [], marker="D", linestyle="None", markerfacecolor="#00c853",
                   markeredgecolor="#111111", markersize=7, label="Excursion accepted"),
        )
        legend_handles.append(
            Line2D([], [], marker="D", linestyle="None", markerfacecolor="#e53935",
                   markeredgecolor="#111111", markersize=7, label="Excursion rejected"),
        )
    ax.legend(handles=legend_handles, loc="upper left", fontsize=7, ncol=2, framealpha=0.9)

    # Info box
    info_parts = []
    if draws_list:
        info_parts.append(f"curr_draw={draws.get('current_draw')} | opp_draw={draws.get('opposing_draw')}")
    if sweep_label != "none":
        info_parts.append(f"excursion={sweep_label} side={sweep_side or '?'} outcome={sweep_outcome} path={path_state}")
    if info_parts:
        ax.text(
            1.02, 1.15, "\n".join(info_parts),
            transform=ax.transAxes, ha="right", va="top", fontsize=8,
            bbox={"facecolor": "white", "alpha": 0.78, "edgecolor": "#d0d0d0"},
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


def plot_wyckoff_history(
    df_daily: pd.DataFrame,
    wyckoff_state: dict[str, Any],
    path: Path,
    symbol: str,
    lookback: int,
) -> None:
    x = df_daily.tail(lookback).copy().reset_index(drop=True)
    if x.empty:
        raise ValueError("cannot render Wyckoff chart for empty daily dataframe")
    full_len = len(df_daily)
    visible_start = full_len - len(x)
    visible_segments = []
    for seg in wyckoff_state.get("_full_history", wyckoff_state.get("wyckoff_history", [])):
        start_idx = int(seg["start_index"])
        end_idx = int(seg["end_index"])
        if end_idx < visible_start or start_idx >= full_len:
            continue
        visible_segments.append(
            {
                **seg,
                "_start": max(0, start_idx - visible_start),
                "_end": min(len(x) - 1, end_idx - visible_start),
            }
        )

    fig, axes = mpf.plot(
        to_mpf(x),
        type="candle",
        volume=True,
        style=_base_style(),
        marketcolor_overrides=anomaly_overrides(x),
        title=f"{symbol} Wyckoff History",
        figratio=DEFAULT_FIGRATIO,
        figscale=DEFAULT_FIGSCALE,
        update_width_config=_width_config(),
        returnfig=True,
    )
    price_ax = axes[0]
    shade_axes = [ax for ax in axes if ax is not None]
    y_top = float(x["high"].max())
    y_span = max(float(x["high"].max() - x["low"].min()), 1.0)
    for seg in visible_segments:
        color = WYCKOFF_PHASE_COLORS.get(str(seg["cycle_phase"]), "#d1d5db")
        x0 = float(seg["_start"])
        x1 = float(seg["_end"]) + 1.0
        for ax in shade_axes:
            ax.axvspan(x0, x1, facecolor=color, alpha=0.28, linewidth=0)
        if int(seg["_end"]) > int(seg["_start"]):
            for ax in shade_axes:
                ax.axvline(x0, color=color, linestyle="--", linewidth=1.0, alpha=0.9)
        label_parts = [str(seg["cycle_phase"]).upper()[:4]]
        schematic = str(seg.get("schematic_phase", "not_applicable"))
        if schematic not in {"not_applicable", "unclear"}:
            label_parts.append(schematic)
        mid_x = (x0 + x1) / 2.0
        price_ax.text(
            mid_x,
            y_top + y_span * 0.03,
            " ".join(label_parts),
            ha="center",
            va="bottom",
            fontsize=8,
            color="#1f2937",
            bbox={
                "facecolor": color,
                "alpha": 0.55,
                "edgecolor": color,
                "boxstyle": "round,pad=0.28",
            },
        )

    # Wyckoff event markers
    _WYCKOFF_EVENT_COLORS = {
        "SC": "#e53935", "BC": "#e53935", "AR": "#00c853",
        "ST": "#78909c", "Spring": "#2979ff", "ToS": "#5c6bc0",
        "SOS": "#00c853", "LPS": "#66bb6a",
        "UT": "#ff7043", "UTAD": "#d32f2f", "SOW": "#e53935", "LPSY": "#ef5350",
    }
    _WYCKOFF_EVENT_MARKERS = {
        "SC": "v", "BC": "^", "AR": "^", "ST": "o",
        "Spring": "D", "ToS": "d", "SOS": "^", "LPS": "s",
        "UT": "v", "UTAD": "D", "SOW": "v", "LPSY": "s",
    }
    event_placed: list[tuple[int, float]] = []
    atr_unit = float((x["high"] - x["low"]).tail(min(50, len(x))).median())
    if not np.isfinite(atr_unit) or atr_unit <= 0:
        atr_unit = max(float(x["close"].median()) * 0.01, 8.0)
    has_events = False
    for seg in visible_segments:
        seg_events = seg.get("events", [])
        if not seg_events:
            continue
        has_events = True
        for ev in seg_events:
            ev_abs_idx = int(ev["bar_index"])
            ev_vis_idx = ev_abs_idx - visible_start
            if ev_vis_idx < 0 or ev_vis_idx >= len(x):
                continue
            ev_type = str(ev["type"])
            ev_price = float(ev["price"])
            ev_color = _WYCKOFF_EVENT_COLORS.get(ev_type, "#9e9e9e")
            ev_marker = _WYCKOFF_EVENT_MARKERS.get(ev_type, "o")
            price_ax.scatter(
                [ev_vis_idx], [ev_price], color=ev_color, s=140, marker=ev_marker,
                edgecolors="#111111", linewidths=0.7, zorder=6, alpha=0.92,
            )
            # Annotation with anti-overlap
            is_support = ev_type in {"SC", "ST", "Spring", "ToS", "LPS", "SOW"}
            sign = -1.0 if is_support else 1.0
            ty = ev_price + sign * atr_unit * 0.9
            for _ in range(5):
                overlap = any(
                    abs(ev_vis_idx - px) <= 4 and abs(ty - py) <= atr_unit * 0.6
                    for px, py in event_placed
                )
                if not overlap:
                    break
                ty += sign * atr_unit * 0.5
            price_ax.annotate(
                ev_type, xy=(ev_vis_idx, ev_price), xytext=(ev_vis_idx, ty),
                textcoords="data", ha="center",
                va="top" if is_support else "bottom",
                fontsize=7, color=ev_color, fontweight="bold",
                bbox={"facecolor": "white", "alpha": 0.82, "edgecolor": ev_color, "boxstyle": "round,pad=0.2"},
                arrowprops={"arrowstyle": "-", "linewidth": 0.6, "color": ev_color, "alpha": 0.7},
            )
            event_placed.append((ev_vis_idx, ty))

    handles = [
        Rectangle((0, 0), 1, 1, facecolor=color, edgecolor=color, alpha=0.45, label=label)
        for label, color in [
            ("Accumulation", WYCKOFF_PHASE_COLORS["accumulation"]),
            ("Markup", WYCKOFF_PHASE_COLORS["markup"]),
            ("Distribution", WYCKOFF_PHASE_COLORS["distribution"]),
            ("Markdown", WYCKOFF_PHASE_COLORS["markdown"]),
        ]
    ]
    if has_events:
        handles.append(
            Line2D([], [], marker="D", linestyle="None", markerfacecolor="#2979ff",
                   markeredgecolor="#111111", markersize=6, label="Wyckoff event"),
        )
    price_ax.legend(handles=handles, loc="upper left", fontsize=8, ncol=2, framealpha=0.92)
    summary = (
        f"Cycle={wyckoff_state['current_cycle_phase']} | "
        f"Phase={wyckoff_state['current_wyckoff_phase']} | "
        f"Confidence={wyckoff_state['wyckoff_current_confidence']} | "
        f"Maturity={wyckoff_state['wyckoff_current_maturity']}"
    )
    price_ax.text(
        1.01,
        1.06,
        summary,
        transform=price_ax.transAxes,
        ha="right",
        va="top",
        fontsize=8,
        bbox={"facecolor": "white", "alpha": 0.84, "edgecolor": "#d0d0d0"},
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

    daily, intraday_1m, intraday, corp = load_ohlcv(input_path)
    daily = add_ma_stack(daily)
    daily = add_swings(daily)
    daily = add_volume_features(daily)
    daily = add_atr14(daily)
    zones = derive_levels(daily)
    events = detect_structure_events(daily)
    ma_config = build_daily_ma_config(daily, args.ma_mode)
    wyckoff_state = build_wyckoff_state(daily, return_full_history=True)

    last_close = float(daily["close"].iloc[-1])
    last_atr14 = float(daily["ATR14"].iloc[-1]) if "ATR14" in daily.columns and pd.notna(daily["ATR14"].iloc[-1]) else 0.0
    ext_levels = [float(z["zone_mid"]) for z in zones]
    internal_levels = derive_internal_liquidity_levels(daily, last_close, ext_levels)
    equal_liq = find_equal_liquidity_clusters(daily, last_atr14)
    trendlines = detect_trendline_levels(daily)
    sweep_events_list = detect_sweep_events(
        daily,
        eqh_levels=equal_liq["eqh_levels"],
        eql_levels=equal_liq["eql_levels"],
        internal_levels=internal_levels,
        trendlines=trendlines,
    )
    sweep_label, sweep_outcome_val, event_scope, sweep_side = classify_liquidity_sweep(
        sweep_events=sweep_events_list,
    )
    liq = liquidity_draws(last_close, zones, internal_levels=internal_levels)
    liq["draw_targets"] = pick_draw_targets(ext_levels, internal_levels, last_close)
    remap_liquidity_draws(
        liq=liq,
        event_scope=event_scope,
        sweep_outcome_value=sweep_outcome_val,
        sweep_side=sweep_side,
    )
    liq["sweep_event"] = sweep_label
    liq["sweep_outcome"] = sweep_outcome_val
    liq["liquidity_path"] = liquidity_path_after_event(event_scope, sweep_outcome_val)

    if args.range_mode == "auto":
        daily_lookback = compute_dynamic_daily_lookback(
            daily, events, max_bars=args.daily_lookback,
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

    draws = {
        "current_draw": liq.get("current_draw"),
        "opposing_draw": liq.get("opposing_draw"),
    }

    generated: dict[str, str] = {}

    p_daily = outdir / f"{symbol}_daily_structure.png"
    plot_daily_structure(
        daily, zones, p_daily, symbol, daily_lookback, ma_config,
    )
    generated["daily_structure"] = str(p_daily)

    p_intraday = outdir / f"{symbol}_intraday_structure.png"
    plot_intraday_structure(intraday, zones, p_intraday, symbol, intraday_lookback)
    generated["intraday_structure"] = str(p_intraday)

    p_events = outdir / f"{symbol}_structure_events.png"
    plot_structure_events(
        daily, events, draws, p_events, symbol, daily_lookback,
        sweep_events=sweep_events_list,
        sweep_label=sweep_label,
        sweep_outcome=sweep_outcome_val,
        sweep_side=sweep_side,
        path_state=liq.get("liquidity_path", "unclear"),
        eqh_levels=equal_liq["eqh_levels"],
        eql_levels=equal_liq["eql_levels"],
        internal_levels=internal_levels,
    )
    generated["structure_events"] = str(p_events)

    p_wyckoff = outdir / f"{symbol}_wyckoff_history.png"
    plot_wyckoff_history(daily, wyckoff_state, p_wyckoff, symbol, daily_lookback)
    generated["wyckoff_history"] = str(p_wyckoff)

    vpvr = None
    if "vpvr" in modules:
        vpvr = vpvr_stats(daily)
        p_vpvr = outdir / f"{symbol}_vpvr_profile.png"
        plot_vpvr_profile(daily, vpvr, p_vpvr, symbol)
        generated["vpvr_profile"] = str(p_vpvr)

    range_selection = {
        "mode": args.range_mode,
        "daily_lookback_used": int(daily_lookback),
        "intraday_lookback_used": int(intraday_lookback),
    }

    evidence = {
        "symbol": symbol,
        "input": str(input_path),
        "modules": sorted(modules),
        "ma_config": ma_config,
        "artifacts": generated,
        "range_selection": range_selection,
        "data_range": {
            "daily": {
                "start": str(daily["datetime"].iloc[0]),
                "end": str(daily["datetime"].iloc[-1]),
                "rows": int(len(daily)),
            },
            "intraday_1m": {
                "start": str(intraday_1m["datetime"].iloc[0]),
                "end": str(intraday_1m["datetime"].iloc[-1]),
                "rows": int(len(intraday_1m)),
            },
            "intraday_15m": {
                "start": str(intraday["datetime"].iloc[0]),
                "end": str(intraday["datetime"].iloc[-1]),
                "rows": int(len(intraday)),
            },
            "corp_actions_rows": int(len(corp)),
        },
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
        "liquidity_map": {
            "current_draw": liq.get("current_draw"),
            "opposing_draw": liq.get("opposing_draw"),
            "sweep_event": sweep_label,
            "sweep_outcome": sweep_outcome_val,
            **({"sweep_side": sweep_side} if sweep_side in {"up", "down"} else {}),
            "liquidity_path": liq.get("liquidity_path", "unclear"),
            "eqh_levels": equal_liq["eqh_levels"],
            "eql_levels": equal_liq["eql_levels"],
            "internal_levels": internal_levels,
            "sweep_events": sweep_events_list,
        },
        "wyckoff_state": {
            "current_cycle_phase": wyckoff_state["current_cycle_phase"],
            "current_wyckoff_phase": wyckoff_state["current_wyckoff_phase"],
            "wyckoff_current_confidence": wyckoff_state["wyckoff_current_confidence"],
            "wyckoff_current_maturity": wyckoff_state["wyckoff_current_maturity"],
            "wyckoff_history": wyckoff_state["wyckoff_history"],
        },
    }
    if vpvr is not None:
        evidence["vpvr"] = {
            "poc": vpvr["poc"], "vah": vpvr["vah"], "val": vpvr["val"],
            "hvn_top3": vpvr["hvn_top3"], "lvn_top3": vpvr["lvn_top3"],
        }

    evidence_path = outdir / f"{symbol}_chart_evidence.json"
    with evidence_path.open("w", encoding="utf-8") as f:
        json.dump(evidence, f, indent=2)

    print(json.dumps({"ok": True, "artifacts": generated, "evidence": str(evidence_path)}, indent=2))


if __name__ == "__main__":
    main()
