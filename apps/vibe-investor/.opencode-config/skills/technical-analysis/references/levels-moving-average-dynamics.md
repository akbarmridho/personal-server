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

## Implementation Note

Deterministic MA stack and posture outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`
