# Setups And Breakouts

## Setup Families And Selection

### Objective

Select one setup family based on regime, structure status, and acceptance context.

### Allowed Setup Families

- `S1` Breakout and retest continuation.
- `S2` Pullback to demand in intact uptrend.
- `S3` Sweep and reclaim reversal.
- `S4` Range edge rotation.
- `S5` Cup-and-handle continuation (optional, lower priority than structure + volume).
- `S6` Wyckoff spring from support with reclaim (advanced, requires strict confirmation).

### Core Selection Rules

- `R-PA-04` Pattern labels without structure and volume confluence are not tradable.
- `R-PA-05` Prefer setups aligned with daily regime and liquidity draw.
- `R-PA-06` In balance state, prioritize edge-to-edge behavior; avoid middle-of-range entries.
- `R-PA-07` Reversal setups require `CHOCH + confirmation BOS`; CHOCH alone is warning only.

### Trace Requirements

- selected setup id and reason
- setup rejection reason when `NO_VALID_SETUP`

### Implementation Note

Deterministic setup-family selection and Wyckoff spring detection outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`

## Breakout And Participation

### Objective

Validate breakout and continuation quality using close behavior, follow-through, and volume participation.

### Breakout Rules

- `R-PA-01` Breakout needs close beyond level plus volume expansion.
- `R-PA-02` Breakout without follow-through is suspect.
- `R-PA-03` Failed breakout (deviation) is a valid opposite signal only after reclaim/failure confirmation.
- `R-PA-08` Clean breakout should displace quickly; post-breakout stalling increases trap risk.

### Volume Confirmation

- `R-VOL-01` Breakout volume should be above recent average (example 20-day mean).
- `R-VOL-02` Up move on weak volume is lower quality.
- `R-VOL-03` Repeated high-volume down closes near highs signals distribution risk.
- `R-VOL-04` Price up + volume up is strongest continuation profile.
- `R-VOL-05` Price down + volume down can be healthy pullback in uptrend context.

### Early Participation Signal

- If first-hour intraday volume reaches roughly 70 percent of average daily volume, escalate monitoring.
- This is an alert condition, not standalone entry permission.

### Trace Requirements

- trigger candle timestamp and close
- follow-through candle timestamp and close
- trigger volume ratio
- displacement quality note: clean displacement or stalling

### Implementation Note

Deterministic breakout snapshot extraction is implemented in:

- Module: `breakout`
- Script: `scripts/build_ta_context.py`

## Breakout Quality Filters

### Objective

Improve breakout selectivity using base-quality and market-context filters before execution.

### Base-Quality Filters

- `R-BQ-04` Avoid very short bases (example under 7 weeks) for swing breakout calls.
- `R-BQ-05` Avoid excessively deep/loose bases (example drawdown over 35 percent) unless separate reversal thesis is active.
- `R-BQ-06` Late-stage bases carry higher failure risk; demand stronger confirmation.

### Breakout Strength Filters

- `R-BQ-07` Breakout day should show volume expansion versus average.
- `R-BQ-08` Fast post-break displacement is preferred; stalling quickly after break is warning.
- `R-BQ-09` If broad market context is weak/risk-off, downgrade pure breakout setups.

### Watchlist Context Filter

- `R-BQ-10` For momentum-style continuation scans, prioritize names trading relatively close to major highs.
- This is a prioritization filter only, not an entry trigger.

### Trace Requirements

- base quality note (duration/depth/stage)
- breakout strength note (volume and displacement)
- market context impact note (`supportive`, `neutral`, `adverse`)

### Implementation Note

Deterministic breakout base-quality outputs are implemented in:

- Module: `breakout`
- Script: `scripts/build_ta_context.py`

## Reversal Playbooks And Confluence

### Objective

Standardize reversal validation and optional confluence usage after structural confirmation.

### Divergence Protocol

- Always run a quick bearish divergence scan (price higher high vs RSI14 or MACD histogram lower high).
- Divergence alone is warning, not reversal confirmation.
- Escalate only after structure break confirmation.

### BOS And CHOCH Reversal Playbooks

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

### Optional Confluence (FVG And OTE)

Use only after structural confirmation. These refine entries and do not validate reversals.

- FVG retrace zone
- OTE zone (`0.618`, `0.706`, `0.786`)

OTE is tactical; broader Fib retracement/extension context remains in the Fibonacci Retracement And Extension section of `levels.md`.

Detailed FVG/IFVG and mitigation logic is in `fair-value-gap-and-imbalances.md`.

When lens is `SMC_ICT_LIGHT`, confluence may also include OB/Breaker/IFVG/EQH-EQL context.

### Trace Requirements

- CHOCH evidence (time and level)
- confirmation BOS evidence (time and level)
- divergence status and invalidator
- confluence bounds when FVG/OTE is used

### Implementation Note

Deterministic structure-status and OTE helper outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`
