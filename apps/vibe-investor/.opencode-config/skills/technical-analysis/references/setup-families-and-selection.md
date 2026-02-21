# Setup Families And Selection

## Objective

Select one setup family based on regime, structure status, and acceptance context.

## Allowed Setup Families

- `S1` Breakout and retest continuation.
- `S2` Pullback to demand in intact uptrend.
- `S3` Sweep and reclaim reversal.
- `S4` Range edge rotation.
- `S5` Cup-and-handle continuation (optional, lower priority than structure + volume).
- `S6` Wyckoff spring from support with reclaim (advanced, requires strict confirmation).

## Core Selection Rules

- `R-PA-04` Pattern labels without structure and volume confluence are not tradable.
- `R-PA-05` Prefer setups aligned with daily regime and liquidity draw.
- `R-PA-06` In balance state, prioritize edge-to-edge behavior; avoid middle-of-range entries.
- `R-PA-07` Reversal setups require `CHOCH + confirmation BOS`; CHOCH alone is warning only.

## Trace Requirements

- selected setup id and reason
- setup rejection reason when `NO_VALID_SETUP`

## Reference Code

```python
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
```
