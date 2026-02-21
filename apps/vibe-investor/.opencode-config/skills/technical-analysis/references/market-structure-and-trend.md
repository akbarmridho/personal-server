# Market Structure And Trend

## Objective

Classify daily market regime before any setup decision.

## Core Rules

- `R-REGIME-01` Uptrend: higher highs and higher lows on daily swings.
- `R-REGIME-02` Downtrend: lower highs and lower lows on daily swings.
- `R-REGIME-03` Range rotation: mixed swings with repeated rejection at range edges.
- `R-REGIME-04` Potential reversal: CHOCH plus follow-through BOS in opposite direction.
- `R-REGIME-05` Wick-only breaks do not change regime without close confirmation.

## Strong And Weak Swing Logic

- `R-SWING-01` Strong high/low: pivot that caused structural break.
- `R-SWING-02` Weak high/low: pivot that failed to break structure and remains liquidity target.

## Regime Output

Return one state only:

- `trend_continuation`
- `range_rotation`
- `potential_reversal`
- `no_trade`

## Trace Requirements

- Add at least 2 evidence items for regime call:
  - last confirmed swing highs and lows with timestamps
  - break candle close values versus broken level

## Reference Code

```python
import numpy as np
import pandas as pd


def add_swings(df: pd.DataFrame, n: int = 2) -> pd.DataFrame:
    out = df.copy()
    out["datetime"] = pd.to_datetime(out["datetime"])
    out = out.sort_values("datetime").reset_index(drop=True)

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


def classify_regime(df: pd.DataFrame):
    swings_h = df[df["swing_high"].notna()][["datetime", "swing_high"]].tail(4)
    swings_l = df[df["swing_low"].notna()][["datetime", "swing_low"]].tail(4)

    if len(swings_h) < 2 or len(swings_l) < 2:
        return "no_trade", {"reason": "insufficient_swings"}

    hh = swings_h["swing_high"].iloc[-1] > swings_h["swing_high"].iloc[-2]
    hl = swings_l["swing_low"].iloc[-1] > swings_l["swing_low"].iloc[-2]
    lh = swings_h["swing_high"].iloc[-1] < swings_h["swing_high"].iloc[-2]
    ll = swings_l["swing_low"].iloc[-1] < swings_l["swing_low"].iloc[-2]

    if hh and hl:
        regime = "trend_continuation"
    elif lh and ll:
        regime = "potential_reversal"
    else:
        regime = "range_rotation"

    proof = {
        "last_swing_high": {
            "t": str(swings_h["datetime"].iloc[-1]),
            "v": float(swings_h["swing_high"].iloc[-1]),
        },
        "last_swing_low": {
            "t": str(swings_l["datetime"].iloc[-1]),
            "v": float(swings_l["swing_low"].iloc[-1]),
        },
    }
    return regime, proof
```
