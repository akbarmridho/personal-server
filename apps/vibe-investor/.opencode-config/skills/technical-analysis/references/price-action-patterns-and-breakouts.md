# Price Action Patterns And Breakouts

## Objective

Score setup quality for swing decisions using price-volume behavior and structural context.

## Allowed Setup Families

- `S1` Breakout and retest continuation.
- `S2` Pullback to demand in intact uptrend.
- `S3` Sweep and reclaim reversal.
- `S4` Range edge rotation.
- `S5` Cup-and-handle continuation (optional, lower priority than structure + volume).
- `S6` Wyckoff spring from support with reclaim (advanced, requires strict confirmation).

## Core Rules

- `R-PA-01` Breakout needs close beyond level plus volume expansion.
- `R-PA-02` Breakout without follow-through is suspect.
- `R-PA-03` Failed breakout (deviation) is a valid opposite signal only after reclaim/failure confirmation.
- `R-PA-04` Pattern labels without structure and volume confluence are not tradable.
- `R-PA-05` Prefer setups aligned with daily regime and liquidity draw.
- `R-PA-06` In balance state, prioritize edge-to-edge behavior; avoid middle-of-range entries.
- `R-PA-07` Reversal setups require `CHOCH + confirmation BOS`; CHOCH alone is warning only.

## Volume Confirmation

- `R-VOL-01` Breakout volume should be above recent average (example 20-day mean).
- `R-VOL-02` Up move on weak volume is lower quality.
- `R-VOL-03` Repeated high-volume down closes near highs signals distribution risk.
- `R-VOL-04` Price up + volume up is strongest continuation profile.
- `R-VOL-05` Price down + volume down can be healthy pullback in uptrend context.

## Wyckoff Pattern Notes

- Selling climax context: panic spike, then inability to make fresh lows despite pressure.
- Spring context: break below support on weak commitment, then quick reclaim and follow-through.
- Distribution warning: churn at highs with high volume but poor progress.

## Early Participation Signal

- If first-hour intraday volume reaches roughly 70 percent of average daily volume, escalate monitoring for possible expansion move.
- This is an alert condition, not standalone entry permission.

## Divergence Protocol (Quick Scan)

- Always run a quick bearish divergence scan (price higher high vs RSI14 or MACD histogram lower high).
- Divergence alone is warning, not reversal confirmation.
- Escalate only after structure break confirmation.

## BOS And CHOCH Reversal Playbooks

Bullish reversal flow:

1. Market in bearish structure.
2. Price prints bullish CHOCH (break above recent lower high).
3. Pullback holds as higher low.
4. Price breaks prior high again (confirmation BOS).
5. Setup becomes eligible for long plan.

Bearish reversal flow:

1. Market in bullish structure.
2. Price prints bearish CHOCH (break below recent higher low).
3. Pullback fails as lower high.
4. Price breaks prior low again (confirmation BOS).
5. Setup becomes eligible for short-plan context.

Structure status enum for reporting:

- `no_signal`
- `choch_only`
- `choch_plus_bos_confirmed`

## Optional Confluence (FVG And OTE)

Use these only after structural confirmation. They refine entries, not validate reversals.

Detailed FVG/IFVG definitions, CE handling, and mitigation states are defined in `fair-value-gap-and-imbalances.md`.

- FVG: entry refinement on retrace to imbalance zone.
- OTE: fib retracement zone `0.618`, `0.706`, `0.786` of latest impulse.
- Neither FVG nor OTE can replace invalidation, stop, and structure confirmation.

When lens is `SMC_ICT_LIGHT`, optional confluence may also include OB/Breaker/IFVG/EQH-EQL context from SMC reference.

## Trace Requirements

- Provide at least 3 evidence ids for setup call:
  - trigger candle timestamp and close
  - broken/reclaimed level
  - volume ratio at trigger and follow-through candle
- For reversal setups, include CHOCH and confirmation BOS evidence references.
- If divergence exists, include status and invalidator level.
- If FVG/OTE is used, include exact zone bounds and source swing.

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


def choose_setup(regime, ib_state, breakout_state, structure_state="no_signal", spring_confirmed=False):
    if structure_state == "choch_plus_bos_confirmed":
        return "S3"
    if structure_state == "choch_only":
        return "NO_VALID_SETUP"
    if spring_confirmed:
        return "S6"
    if regime == "trend_continuation" and breakout_state == "valid_breakout":
        return "S1"
    if regime == "trend_continuation" and ib_state in {"inside_ib_range", "failed_break_below_ibl"}:
        return "S2"
    if regime in {"potential_reversal", "range_rotation"} and ib_state in {"failed_break_above_ibh", "failed_break_below_ibl"}:
        return "S3"
    if regime == "range_rotation":
        return "S4"
    return "NO_VALID_SETUP"


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


def ote_zone(swing_low: float, swing_high: float):
    span = swing_high - swing_low
    return {
        "fib_0_618": swing_high - span * 0.618,
        "fib_0_706": swing_high - span * 0.706,
        "fib_0_786": swing_high - span * 0.786,
    }
```
