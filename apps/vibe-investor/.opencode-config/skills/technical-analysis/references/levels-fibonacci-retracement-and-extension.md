# Levels Fibonacci Retracement And Extension

## Objective

Use Fibonacci retracement and extension as structured confluence for pullback entries, invalidation planning, and target projection.

## Scope

- Fibonacci is context support, not standalone signal.
- Most useful in directional markets; lower reliability in choppy ranges.
- Swing anchors must be explicit and repeatable.

## Retracement Rules

- `R-FIB-01` Identify trend first (uptrend or downtrend) before drawing Fib.
- `R-FIB-02` Uptrend retracement anchors from swing low to swing high.
- `R-FIB-03` Downtrend retracement anchors from swing high to swing low.
- `R-FIB-04` Primary retracement map: `0.236`, `0.382`, `0.5`, `0.618`, `0.786`.
- `R-FIB-05` OTE is a tactical subset (`0.618`, `0.706`, `0.786`) and should not replace full retracement context.
- `R-FIB-06` Prefer Fib levels that align with structure zones, MA dynamic support/resistance, or VPVR nodes.

Interpretation guide:

- shallow pullback (`0.236` to `0.382`): stronger momentum continuation context
- medium pullback (`0.5` to `0.618`): common continuation test area
- deep pullback (`0.786`): higher failure risk unless strong reclaim/acceptance appears

## Extension Rules

- `R-FIB-07` Use extensions for path planning after continuation confirms.
- `R-FIB-08` Common extension map: `1.0`, `1.272`, `1.618`, `2.618`.
- `R-FIB-09` Extension targets should be checked against next liquidity/level map; if conflict exists, prioritize validated structure level.

## Risk And Confirmation

- `R-FIB-10` Never execute from Fib level alone; require structure/acceptance evidence.
- `R-FIB-11` Stops belong beyond structural invalidation, not exactly on Fib lines.
- `R-FIB-12` If Fib map and market structure conflict, downgrade conviction or output `WAIT`.

## Trace Requirements

- active swing anchors (time and price)
- retracement levels used and nearest interaction level
- extension levels used for target ladder (if used)
- confluence note: structure / MA / VPVR alignment

## Reference Code

```python
def fib_retracement_levels(swing_low: float, swing_high: float, trend: str = "up"):
    # trend in {"up", "down"}
    ratios = [0.236, 0.382, 0.5, 0.618, 0.706, 0.786]
    out = {}
    if trend == "up":
        span = swing_high - swing_low
        for r in ratios:
            out[f"fib_{r}"] = swing_high - span * r
    else:
        span = swing_high - swing_low
        for r in ratios:
            out[f"fib_{r}"] = swing_low + span * r
    return out


def fib_extension_levels(swing_low: float, swing_high: float, trend: str = "up"):
    ratios = [1.0, 1.272, 1.618, 2.618]
    out = {}
    span = swing_high - swing_low
    if trend == "up":
        for r in ratios:
            out[f"ext_{r}"] = swing_low + span * r
    else:
        for r in ratios:
            out[f"ext_{r}"] = swing_high - span * r
    return out
```
