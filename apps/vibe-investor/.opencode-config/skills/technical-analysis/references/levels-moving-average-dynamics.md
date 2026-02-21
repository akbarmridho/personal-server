# Levels Moving Average Dynamics

## Objective

Use moving averages as dynamic support/resistance context to qualify trend quality and level behavior.

## Rules

- `R-LVL-MA-01` MA posture is context, not standalone entry signal.
- `R-LVL-MA-02` Baseline stack for consistency: 21EMA (fast), 50SMA (primary pullback support), 100SMA (deeper support), 200SMA (regime line).
- `R-LVL-MA-03` Adaptive MA may be used per symbol behavior (for example 3/5/10/20/50 family) when repeated respect is measurable.
- `R-LVL-MA-04` Preferred operating mode is `hybrid`: keep baseline stack for regime clarity, add one adaptive MA only when evidence supports it.
- `R-LVL-MA-05` In uptrend continuation context, sustained acceptance above 50SMA and 100SMA strengthens bullish support thesis.
- `R-LVL-MA-06` Repeated loss/reclaim around key MAs signals unstable structure and should reduce conviction.
- `R-LVL-MA-07` MA context should be read with horizontal zones, not in isolation.

Mode guidance:

- `baseline_stack`: best for cross-symbol consistency and reporting.
- `adaptive_primary`: best for single-symbol trend tracking when one MA is clearly respected.
- `hybrid` (default): combine both to avoid overfitting and preserve comparability.

## Trace Requirements

- report posture above/below 21EMA, 50SMA, 100SMA, 200SMA
- note whether MAs are acting as support, resistance, or noisy chop
- if adaptive MA is used, report selected period and respect evidence (touch/reclaim behavior)

## Reference Code

```python
import pandas as pd


def add_ma_stack(df: pd.DataFrame):
    x = df.copy()
    x["EMA21"] = x["close"].ewm(span=21, adjust=False).mean()
    x["SMA50"] = x["close"].rolling(50).mean()
    x["SMA100"] = x["close"].rolling(100).mean()
    x["SMA200"] = x["close"].rolling(200).mean()
    return x


def ma_posture(row):
    c = row["close"]
    return {
        "above_ema21": c >= row.get("EMA21", c),
        "above_sma50": c >= row.get("SMA50", c),
        "above_sma100": c >= row.get("SMA100", c),
        "above_sma200": c >= row.get("SMA200", c),
    }


def choose_adaptive_ma(df: pd.DataFrame, candidates=(3, 5, 10, 20, 50), lookback: int = 120):
    x = df.tail(lookback).copy()
    best_n = None
    best_score = -1.0

    for n in candidates:
        col = f"SMA{n}"
        x[col] = x["close"].rolling(n).mean()
        v = x[col].dropna()
        if len(v) < 20:
            continue

        # simple proxy: how often close stays on trend side while MA slope supports direction
        slope = x[col].diff()
        above = (x["close"] >= x[col]).astype(float)
        score = float((above * (slope > 0).astype(float)).sum())
        if score > best_score:
            best_score = score
            best_n = n

    return {"adaptive_period": best_n, "score": best_score}
```
