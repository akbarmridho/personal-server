# Levels Support Resistance And VPVR

## Objective

Build actionable zones and liquidity map from daily structure, then validate tactical acceptance with intraday IBH/IBL.

## Initial Balance Concept (Market Agreement)

Initial Balance represents early-session agreement between buyers and sellers.

- IBH is the highest traded price in the initial observation window.
- IBL is the lowest traded price in the same window.
- The IB range is early price discovery, not a magic boundary.
- Acceptance above IBH or below IBL indicates market agreement at a new value area.
- Failed acceptance (deviation) means the market rejected the attempted repricing.

Use IB as a probabilistic structural reference, not certainty. The often-cited high continuation rate after true acceptance is observational and context-dependent.

## Charting-First Practice

- Draw levels/zones on charts first, then interpret.
- Keep level count focused: major zones first, then tactical zones.
- Use chart annotations for support, resistance, IBH, IBL, and acceptance/failure labels.
- Chart observations should be logged before the final setup decision.

## Core Rules

- `R-LVL-01` Levels are zones, not single lines.
- `R-LVL-02` Higher timeframe and repeatedly respected zones have priority.
- `R-LVL-03` First retest is strongest; repeated tests weaken level quality.
- `R-LVL-04` Broken support/resistance can flip role after acceptance.
- `R-LVL-05` Prefer confluence zones (swing + VPVR + fib/round number) over isolated levels.
- `R-LVL-06` Use close-based confirmation, not wick-only breaches.

## Strength By Test Count

- 1st test: strongest
- 2nd test: still reliable
- 3rd test: weakening
- 4th+ tests: elevated break risk

## Zone Construction

Use one method consistently per report:

- fixed width: around 1-2 percent
- ATR width: around 0.5 ATR
- wick-body map: candle body to rejection wick edge

## VPVR Rules

- `R-VPVR-01` Use POC as fair-value magnet.
- `R-VPVR-02` HVN is reaction zone; LVN is fast-travel zone.
- `R-VPVR-03` Use VPVR as confluence, not standalone trigger.
- `R-VPVR-04` If breakout enters LVN with acceptance, continuation probability increases toward next HVN.

## IBH And IBL Rules (Intraday 60m)

- `R-IB-01` IBH is the highest high of first 2 completed 60m bars in a session.
- `R-IB-02` IBL is the lowest low of first 2 completed 60m bars in a session.
- `R-IB-03` `accepted_above_ibh`: close above IBH and next bar does not close back in range.
- `R-IB-04` `accepted_below_ibl`: close below IBL and next bar does not close back in range.
- `R-IB-05` Failed break (deviation): excursion outside then close back inside within 1-2 bars.

Interpretation guidance:

- `accepted_above_ibh` -> bullish acceptance bias for the session.
- `accepted_below_ibl` -> bearish acceptance bias for the session.
- Failed break states -> trap/deviation context; require re-evaluation before directional commitment.

Use IBH/IBL to qualify acceptance of direction, not as standalone entry.

## Higher-Timeframe IB Overlay (TradingView-Style)

For reporting, add a daily chart with stepped IBH/IBL overlays derived from period-open discovery windows (for example, monthly period using first 2 daily candles).

- `R-IB-HTF-01` Group daily candles by period (commonly month).
- `R-IB-HTF-02` For each period, compute IBH/IBL from first `n` daily candles (default `n=2`).
- `R-IB-HTF-03` Draw stepped horizontal lines across the full period for both IBH and IBL.
- `R-IB-HTF-04` If current price is outside stepped IB range with close-based acceptance, label accepted state.
- `R-IB-HTF-05` Always include this artifact: `work/{SYMBOL}_ib_overlay.png`.

## Liquidity Trap Notes

- Stop-sweep behavior around obvious support/resistance is common.
- Treat quick reclaim after a wick break as potential deviation trap.
- For execution, use stop buffers and close-confirmation rather than exact-touch assumptions.

## Trace Requirements

- Evidence must include:
  - top support/resistance zone values and touched dates
  - POC/HVN/LVN values from analyzed window
  - latest IBH/IBL values and state label
- For IB overlay chart, include period, `n` bars, latest period IBH/IBL, and acceptance/deviation label.
- Include at least one role-reversal or failed-break note when present.

## Reference Code

```python
import numpy as np
import pandas as pd
import mplfinance as mpf


def cluster_levels(levels, tolerance=0.02):
    if len(levels) == 0:
        return []
    clusters = []
    for lvl in sorted(levels):
        if not clusters:
            clusters.append([lvl])
            continue
        if abs(lvl - np.mean(clusters[-1])) / max(np.mean(clusters[-1]), 1e-9) <= tolerance:
            clusters[-1].append(lvl)
        else:
            clusters.append([lvl])
    out = []
    for c in clusters:
        out.append({
            "zone_mid": float(np.mean(c)),
            "zone_low": float(min(c)),
            "zone_high": float(max(c)),
            "touches": len(c),
        })
    return out


def classify_level_strength(touches: int):
    if touches <= 1:
        return "strong_first_test"
    if touches == 2:
        return "strong"
    if touches == 3:
        return "weakening"
    return "fragile"


def vpvr_core(df, bins=40):
    lo, hi = df["low"].min(), df["high"].max()
    edges = np.linspace(lo, hi, bins + 1)
    hist = np.zeros(bins)
    mids = (edges[:-1] + edges[1:]) / 2

    for _, row in df.iterrows():
        li = np.searchsorted(edges, row["low"], side="right") - 1
        hi_i = np.searchsorted(edges, row["high"], side="right") - 1
        li = max(li, 0)
        hi_i = min(hi_i, bins - 1)
        if hi_i >= li:
            hist[li:hi_i + 1] += row["volume"]

    poc_idx = int(hist.argmax())
    return {
        "poc": float(mids[poc_idx]),
        "hvn_top3": [float(x) for x in mids[np.argsort(hist)[-3:]]],
        "lvn_top3": [float(x) for x in mids[np.argsort(hist)[:3]]],
    }


def role_reversal(last_close: float, level: float, was_support: bool):
    if was_support and last_close < level:
        return "support_broken_may_flip_to_resistance"
    if (not was_support) and last_close > level:
        return "resistance_broken_may_flip_to_support"
    return "no_flip_signal"


def latest_ib_state(df_intraday: pd.DataFrame):
    x = df_intraday.copy()
    x["dt"] = pd.to_datetime(x["datetime"])
    x["session"] = x["dt"].dt.date
    latest_sess = sorted(x["session"].unique())[-1]
    d = x[x["session"] == latest_sess].sort_values("dt").reset_index(drop=True)

    if len(d) < 3:
        return {"state": "insufficient_session_bars"}

    ib = d.iloc[:2]
    ibh = float(ib["high"].max())
    ibl = float(ib["low"].min())

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

    return {
        "session": str(latest_sess),
        "ibh": ibh,
        "ibl": ibl,
        "state": state,
    }


def compute_period_ib_levels(df_daily: pd.DataFrame, period: str = "M", first_n_bars: int = 2):
    x = df_daily.copy()
    x["dt"] = pd.to_datetime(x["datetime"])
    x = x.sort_values("dt").reset_index(drop=True)
    x["period"] = x["dt"].dt.to_period(period)

    # Outputs aligned with df index for step-like overlay lines.
    ibh_line = pd.Series(np.nan, index=x.index, dtype="float64")
    ibl_line = pd.Series(np.nan, index=x.index, dtype="float64")
    period_info = []

    for p, g in x.groupby("period", sort=True):
        g = g.sort_values("dt")
        seed = g.head(first_n_bars)
        if len(seed) < first_n_bars:
            continue
        ibh = float(seed["high"].max())
        ibl = float(seed["low"].min())
        idx = g.index
        ibh_line.loc[idx] = ibh
        ibl_line.loc[idx] = ibl
        period_info.append({"period": str(p), "ibh": ibh, "ibl": ibl})

    return x, ibh_line, ibl_line, period_info


def latest_period_ib_state(df_daily: pd.DataFrame, period: str = "M", first_n_bars: int = 2):
    x, ibh_line, ibl_line, info = compute_period_ib_levels(df_daily, period=period, first_n_bars=first_n_bars)
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


def plot_daily_with_levels(df_daily: pd.DataFrame, zones: list, symbol: str, out_path: str):
    x = df_daily.copy()
    x["dt"] = pd.to_datetime(x["datetime"])
    x = x.set_index("dt")[["open", "high", "low", "close", "volume"]]

    hlines = []
    for z in zones[:8]:
        hlines.append(z["zone_mid"])

    style = mpf.make_mpf_style(base_mpf_style="yahoo", gridstyle=":")
    mpf.plot(
        x,
        type="candle",
        volume=True,
        style=style,
        hlines=dict(hlines=hlines, colors=["#1f77b4"] * len(hlines), linewidths=[0.8] * len(hlines)) if hlines else None,
        title=f"{symbol} Daily Structure",
        savefig=dict(fname=out_path, dpi=150, bbox_inches="tight"),
    )


def plot_intraday_with_ib(df_intraday: pd.DataFrame, ibh: float, ibl: float, symbol: str, out_path: str):
    x = df_intraday.copy()
    x["dt"] = pd.to_datetime(x["datetime"])
    x = x.set_index("dt")[["open", "high", "low", "close", "volume"]]

    style = mpf.make_mpf_style(base_mpf_style="yahoo", gridstyle=":")
    mpf.plot(
        x,
        type="candle",
        volume=True,
        style=style,
        hlines=dict(hlines=[ibh, ibl], colors=["#2ca02c", "#d62728"], linewidths=[1.0, 1.0]),
        title=f"{symbol} Intraday IBH/IBL",
        savefig=dict(fname=out_path, dpi=150, bbox_inches="tight"),
    )


def plot_daily_with_ib_overlay(df_daily: pd.DataFrame, symbol: str, out_path: str, period: str = "M", first_n_bars: int = 2):
    x, ibh_line, ibl_line, _ = compute_period_ib_levels(df_daily, period=period, first_n_bars=first_n_bars)
    x = x.set_index("dt")[["open", "high", "low", "close", "volume"]]

    apds = [
        mpf.make_addplot(ibh_line.values, color="#2f6bff", width=1.2),
        mpf.make_addplot(ibl_line.values, color="#2f6bff", width=1.2),
    ]

    style = mpf.make_mpf_style(base_mpf_style="yahoo", gridstyle=":")
    mpf.plot(
        x,
        type="candle",
        volume=True,
        style=style,
        addplot=apds,
        title=f"{symbol} Initial Balance Overlay ({period}, {first_n_bars})",
        savefig=dict(fname=out_path, dpi=150, bbox_inches="tight"),
    )
```
