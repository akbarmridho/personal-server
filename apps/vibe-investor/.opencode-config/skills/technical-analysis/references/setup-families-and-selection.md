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

## Implementation Note

Deterministic setup-family selection and Wyckoff spring detection outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`
