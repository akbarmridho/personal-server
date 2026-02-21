# Market Structure And Trend

## Objective

Classify market state before setup selection using balance-imbalance logic, then map context with Wyckoff and swing structure.

## State And Regime Rules

- `R-STATE-01` Start with state: `balance` (accepted in value area) or `imbalance` (directional repricing).
- `R-STATE-02` Default assumption: price remains in current value area until close-based acceptance proves otherwise.
- `R-STATE-03` Breakout acceptance requires close outside range plus follow-through.
- `R-STATE-04` Failed acceptance (quick close back in range) is trap evidence, not trend confirmation.
- `R-REGIME-01` Uptrend: higher highs and higher lows on daily swings.
- `R-REGIME-02` Downtrend: lower highs and lower lows on daily swings.
- `R-REGIME-03` Range rotation: mixed swings with repeated rejection at range edges.
- `R-REGIME-04` Potential reversal: CHOCH plus follow-through BOS in opposite direction.
- `R-REGIME-05` Wick-only breaks do not change regime without close confirmation.

## Strong And Weak Swing Logic

- `R-SWING-01` Strong high/low: pivot that caused structural break.
- `R-SWING-02` Weak high/low: pivot that failed to break structure and remains liquidity target.

## Wyckoff Context Mapping

Use one label as context after state call:

- `accumulation`: balance after downtrend with absorption signs.
- `markup`: imbalance up with trend continuation.
- `distribution`: balance after uptrend with supply signs.
- `markdown`: imbalance down with trend continuation.

This map is contextual guidance, not a standalone trigger.

## Regime Output

Return these fields:

- `state`: `balance` or `imbalance`
- `regime`: `trend_continuation`, `range_rotation`, `potential_reversal`, `no_trade`
- `trend_bias`: `bullish`, `bearish`, `neutral`
- `wyckoff_context`: `accumulation`, `markup`, `distribution`, `markdown`, `unclear`

## Trace Requirements

- Add at least 2 evidence items for regime call:
  - last confirmed swing highs and lows with timestamps
  - break candle close values versus broken level
- Add 1 state proof: range boundary and acceptance/failure evidence.
- If conflict exists between numeric structure and visual read, report conflict and chosen precedence.

## No-Resistance Protocol

If price is in discovery with no clear overhead resistance:

- Do not force fixed top target.
- Keep action tied to structure continuation and invalidation.
- Downgrade conviction only on structural weakness or distribution evidence.

## Reference Code

The snippet below is a minimal baseline. Promote `range_rotation` to `potential_reversal` only when CHOCH and BOS follow-through are confirmed.

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
        trend_bias = "bullish"
    elif lh and ll:
        regime = "trend_continuation"
        trend_bias = "bearish"
    else:
        regime = "range_rotation"
        trend_bias = "neutral"

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
    return regime, trend_bias, proof


def infer_state(last_close: float, value_low: float, value_high: float, follow_close: float | None = None):
    outside = (last_close > value_high) or (last_close < value_low)
    if not outside:
        return "balance", "inside_value_area"
    if follow_close is None:
        return "imbalance", "outside_value_area_unconfirmed"

    if last_close > value_high and follow_close >= value_high:
        return "imbalance", "accepted_above_value"
    if last_close < value_low and follow_close <= value_low:
        return "imbalance", "accepted_below_value"
    return "balance", "failed_acceptance_back_inside"
```
