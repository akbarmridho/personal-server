# Levels Moving Average Dynamics

## Objective

Use moving averages as dynamic support/resistance context to qualify trend quality and level behavior.

## Rules

- `R-LVL-MA-01` MA posture is context, not standalone entry signal.
- `R-LVL-MA-02` Typical dynamic ladder: 21EMA (fast), 50SMA (primary pullback support), 100SMA (deeper support), 200SMA (regime line).
- `R-LVL-MA-03` In uptrend continuation context, sustained acceptance above 50SMA and 100SMA strengthens bullish support thesis.
- `R-LVL-MA-04` Repeated loss/reclaim around key MAs signals unstable structure and should reduce conviction.
- `R-LVL-MA-05` MA context should be read with horizontal zones, not in isolation.

## Trace Requirements

- report posture above/below 21EMA, 50SMA, 100SMA, 200SMA
- note whether MAs are acting as support, resistance, or noisy chop

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
```
