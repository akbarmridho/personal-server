# Levels Support Resistance And VPVR

## Objective

Build actionable zones and liquidity map from daily structure, then validate tactical acceptance with intraday IBH/IBL.

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

## VPVR Rules

- `R-VPVR-01` Use POC as fair-value magnet.
- `R-VPVR-02` HVN is reaction zone; LVN is fast-travel zone.
- `R-VPVR-03` Use VPVR as confluence, not standalone trigger.

## IBH And IBL Rules (Intraday 60m)

- `R-IB-01` IBH is the highest high of first 2 completed 60m bars in a session.
- `R-IB-02` IBL is the lowest low of first 2 completed 60m bars in a session.
- `R-IB-03` `accepted_above_ibh`: close above IBH and next bar does not close back in range.
- `R-IB-04` `accepted_below_ibl`: close below IBL and next bar does not close back in range.
- `R-IB-05` Failed break (deviation): excursion outside then close back inside within 1-2 bars.

Use IBH/IBL to qualify acceptance of direction, not as standalone entry.

## Trace Requirements

- Evidence must include:
  - top support/resistance zone values and touched dates
  - POC/HVN/LVN values from analyzed window
  - latest IBH/IBL values and state label

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
```
