# Reversal Playbooks And Confluence

## Objective

Standardize reversal validation and optional confluence usage after structural confirmation.

## Divergence Protocol

- Always run a quick bearish divergence scan (price higher high vs RSI14 or MACD histogram lower high).
- Divergence alone is warning, not reversal confirmation.
- Escalate only after structure break confirmation.

## BOS And CHOCH Reversal Playbooks

Bullish reversal flow:

1. market in bearish structure
2. bullish CHOCH (break above recent lower high)
3. pullback holds as higher low
4. confirmation BOS up
5. setup eligible for long plan

Bearish reversal flow:

1. market in bullish structure
2. bearish CHOCH (break below recent higher low)
3. pullback fails as lower high
4. confirmation BOS down
5. setup eligible for bearish plan context

Structure status enum:

- `no_signal`
- `choch_only`
- `choch_plus_bos_confirmed`

## Optional Confluence (FVG And OTE)

Use only after structural confirmation. These refine entries and do not validate reversals.

- FVG retrace zone
- OTE zone (`0.618`, `0.706`, `0.786`)

OTE is tactical; broader Fib retracement/extension context remains in `levels-fibonacci-retracement-and-extension.md`.

Detailed FVG/IFVG and mitigation logic is in `fair-value-gap-and-imbalances.md`.

When lens is `SMC_ICT_LIGHT`, confluence may also include OB/Breaker/IFVG/EQH-EQL context.

## Trace Requirements

- CHOCH evidence (time and level)
- confirmation BOS evidence (time and level)
- divergence status and invalidator
- confluence bounds when FVG/OTE is used

## Reference Code

```python
def ote_zone(swing_low: float, swing_high: float):
    span = swing_high - swing_low
    return {
        "fib_0_618": swing_high - span * 0.618,
        "fib_0_706": swing_high - span * 0.706,
        "fib_0_786": swing_high - span * 0.786,
    }
```
