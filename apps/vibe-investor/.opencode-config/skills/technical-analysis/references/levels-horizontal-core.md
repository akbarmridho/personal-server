# Levels Horizontal Core

## Objective

Map actionable horizontal support/resistance zones from structure, then use those zones as decision areas rather than precise single-price lines.

## Charting-First Practice

- Draw levels/zones on charts first, then interpret.
- Start from higher timeframe obvious structures first, then refine lower timeframe detail.
- Keep level map minimal and actionable.
- Chart observations should be logged before setup decision.

## Core Rules

- `R-LVL-01` Levels are zones, not single lines.
- `R-LVL-02` Higher timeframe and repeatedly respected zones have priority.
- `R-LVL-03` First retest is strongest; repeated tests weaken level quality.
- `R-LVL-04` Broken support/resistance can flip role after acceptance.
- `R-LVL-06` Use close-based confirmation, not wick-only breaches.
- `R-LVL-07` Mapping and trading are separate steps; map alone is not trade permission.

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

## Wick vs Body Guidance

- For stop-run/spike/deviation setups: prioritize wick behavior and fast reclaim.
- For breakout acceptance and reversal structure: prioritize close/body confirmation.
- When both are informative, report both with explicit precedence.

## Trace Requirements

- top support/resistance zone values and touched dates
- role-reversal or failed-break notes when present

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


def role_reversal(last_close: float, level: float, was_support: bool):
    if was_support and last_close < level:
        return "support_broken_may_flip_to_resistance"
    if (not was_support) and last_close > level:
        return "resistance_broken_may_flip_to_support"
    return "no_flip_signal"


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
```
