# Breakout And Participation

## Objective

Validate breakout and continuation quality using close behavior, follow-through, and volume participation.

## Breakout Rules

- `R-PA-01` Breakout needs close beyond level plus volume expansion.
- `R-PA-02` Breakout without follow-through is suspect.
- `R-PA-03` Failed breakout (deviation) is a valid opposite signal only after reclaim/failure confirmation.
- `R-PA-08` Clean breakout should displace quickly; post-breakout stalling increases trap risk.

## Volume Confirmation

- `R-VOL-01` Breakout volume should be above recent average (example 20-day mean).
- `R-VOL-02` Up move on weak volume is lower quality.
- `R-VOL-03` Repeated high-volume down closes near highs signals distribution risk.
- `R-VOL-04` Price up + volume up is strongest continuation profile.
- `R-VOL-05` Price down + volume down can be healthy pullback in uptrend context.

## Early Participation Signal

- If first-hour intraday volume reaches roughly 70 percent of average daily volume, escalate monitoring.
- This is an alert condition, not standalone entry permission.

## Trace Requirements

- trigger candle timestamp and close
- follow-through candle timestamp and close
- trigger volume ratio
- displacement quality note: clean displacement or stalling

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


def classify_price_volume(change_pct: float, vol_ratio: float):
    if change_pct > 0 and vol_ratio >= 1.2:
        return "strong_up"
    if change_pct < 0 and vol_ratio <= 0.8:
        return "healthy_pullback"
    if change_pct > 0 and vol_ratio <= 0.8:
        return "weak_rally"
    if change_pct < 0 and vol_ratio >= 1.2:
        return "distribution"
    return "neutral"
```
