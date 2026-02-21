# Price Action Patterns And Breakouts

## Objective

Score setup quality for swing decisions using price-volume behavior and structural context.

## Allowed Setup Families

- `S1` Breakout and retest continuation.
- `S2` Pullback to demand in intact uptrend.
- `S3` Sweep and reclaim reversal.
- `S4` Range edge rotation.
- `S5` Cup-and-handle continuation (optional, lower priority than structure + volume).

## Core Rules

- `R-PA-01` Breakout needs close beyond level plus volume expansion.
- `R-PA-02` Breakout without follow-through is suspect.
- `R-PA-03` Failed breakout (deviation) is a valid opposite signal only after reclaim/failure confirmation.
- `R-PA-04` Pattern labels without structure and volume confluence are not tradable.
- `R-PA-05` Prefer setups aligned with daily regime and liquidity draw.

## Volume Confirmation

- `R-VOL-01` Breakout volume should be above recent average (example 20-day mean).
- `R-VOL-02` Up move on weak volume is lower quality.
- `R-VOL-03` Repeated high-volume down closes near highs signals distribution risk.

## Trace Requirements

- Provide at least 3 evidence ids for setup call:
  - trigger candle timestamp and close
  - broken/reclaimed level
  - volume ratio at trigger and follow-through candle

## Reference Code

```python
import pandas as pd


def add_volume_features(df: pd.DataFrame):
    out = df.copy()
    out["vol_ma20"] = out["volume"].rolling(20).mean()
    out["vol_ratio"] = out["volume"] / out["vol_ma20"]
    out["ret"] = out["close"].pct_change()
    return out


def breakout_quality(df: pd.DataFrame, level: float, side: str):
    # side in {"up", "down"}
    x = df.tail(10).reset_index(drop=True)
    trig = x.iloc[-2]
    foll = x.iloc[-1]

    if side == "up":
        trigger = trig["close"] > level
        follow = foll["close"] >= level
    else:
        trigger = trig["close"] < level
        follow = foll["close"] <= level

    vol_ok = trig["vol_ratio"] >= 1.2
    if trigger and follow and vol_ok:
        quality = "valid_breakout"
    elif trigger and not follow:
        quality = "failed_breakout"
    else:
        quality = "no_breakout"

    proof = {
        "trigger_dt": str(trig["datetime"]),
        "trigger_close": float(trig["close"]),
        "follow_dt": str(foll["datetime"]),
        "follow_close": float(foll["close"]),
        "trigger_vol_ratio": float(trig["vol_ratio"]) if pd.notna(trig["vol_ratio"]) else None,
    }
    return quality, proof


def choose_setup(regime, ib_state, breakout_state):
    if regime == "trend_continuation" and breakout_state == "valid_breakout":
        return "S1"
    if regime == "trend_continuation" and ib_state in {"inside_ib_range", "failed_break_below_ibl"}:
        return "S2"
    if regime in {"potential_reversal", "range_rotation"} and ib_state in {"failed_break_above_ibh", "failed_break_below_ibl"}:
        return "S3"
    if regime == "range_rotation":
        return "S4"
    return "NO_VALID_SETUP"
```
