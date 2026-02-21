# Smart Money Concepts Light

## Objective

Provide an evidence-first SMC layer that can be used with the technical-analysis skill without replacing core risk and invalidation discipline.

## Scope

This reference is active when lens is `SMC_ICT_LIGHT` or when user explicitly asks for SMC checks.

## Core Modules

1. Structure hierarchy: internal vs swing breaks.
2. BOS, CHOCH, and CHOCH+ (momentum-failure variant).
3. Order Block (OB) and Breaker Block.
4. FVG and Inversion FVG (IFVG).
5. Liquidity pools: EQH/EQL and sweep/deviation outcomes.
6. Premium/Discount zoning on active dealing range.
7. Optional MTF overlay context (HTF POI on LTF execution).

## Rules

- `R-SMC-01` Swing structure has higher decision weight than internal structure.
- `R-SMC-02` CHOCH is warning; reversal requires confirmation BOS.
- `R-SMC-03` CHOCH+ requires failed extension first, then opposite break.
- `R-SMC-04` OB validity requires displacement and local structure shift, not candle shape alone.
- `R-SMC-05` Breaker Block is an OB that failed and flipped polarity.
- `R-SMC-06` IFVG is a violated FVG that later acts as opposite-direction POI.
- `R-SMC-07` EQH/EQL are liquidity pools; sweep must be evaluated for acceptance vs rejection.
- `R-SMC-08` Premium/Discount is context filter, not standalone entry trigger.
- `R-SMC-09` SMC modules may refine entries; they do not override risk protocol.

## Parameter Guidance

Use stable defaults and report parameters used.

- swing length: 2 to 5 candles (larger for slower symbols)
- eqh/eql tolerance: ATR-based threshold (for example 0.10 to 0.25 ATR)
- fvg filter: minimum relative gap size to reduce noise
- ob lookback: recent impulse windows only

## Required Outputs (When SMC Active)

- `structure_weighted_bias`: swing-led conclusion with internal context note
- `structure_status`: `no_signal`, `choch_only`, `choch_plus_bos_confirmed`
- `liquidity_event`: `none`, `eqh_swept`, `eql_swept`, `accepted_after_sweep`, `rejected_after_sweep`
- `pd_zone`: `premium`, `discount`, `equilibrium`
- `smc_confluence_used`: list of modules actually used (or empty)

## Trace Requirements

Include evidence for each used module:

- structure breaks with timestamps and levels
- OB/Breaker zone bounds and mitigation/violation state
- FVG/IFVG bounds and reaction result
- EQH/EQL levels and sweep candle evidence
- Premium/Discount range anchors and equilibrium

If a module is not used, do not fabricate placeholders.

## Reference Code

```python
import numpy as np
import pandas as pd


def detect_equal_levels(df: pd.DataFrame, atr_col: str = "ATR14", atr_mult: float = 0.2):
    x = df.copy()
    highs = x[x["swing_high"].notna()][["datetime", "swing_high", atr_col]].copy()
    lows = x[x["swing_low"].notna()][["datetime", "swing_low", atr_col]].copy()

    eqh, eql = [], []
    for i in range(1, len(highs)):
        h0, h1 = float(highs["swing_high"].iloc[i - 1]), float(highs["swing_high"].iloc[i])
        tol = float(highs[atr_col].iloc[i]) * atr_mult if pd.notna(highs[atr_col].iloc[i]) else 0
        if abs(h1 - h0) <= tol:
            eqh.append((str(highs["datetime"].iloc[i]), h1))
    for i in range(1, len(lows)):
        l0, l1 = float(lows["swing_low"].iloc[i - 1]), float(lows["swing_low"].iloc[i])
        tol = float(lows[atr_col].iloc[i]) * atr_mult if pd.notna(lows[atr_col].iloc[i]) else 0
        if abs(l1 - l0) <= tol:
            eql.append((str(lows["datetime"].iloc[i]), l1))
    return {"eqh": eqh[-3:], "eql": eql[-3:]}


def premium_discount_zone(range_low: float, range_high: float, price: float):
    eq = (range_low + range_high) / 2.0
    if price > eq:
        zone = "premium"
    elif price < eq:
        zone = "discount"
    else:
        zone = "equilibrium"
    return {"range_low": range_low, "range_high": range_high, "equilibrium": eq, "zone": zone}


def choose_structure_bias(swing_bias: str, internal_bias: str):
    # swing_bias/internal_bias in {"bullish", "bearish", "neutral"}
    if swing_bias != "neutral":
        return swing_bias
    return internal_bias
```
