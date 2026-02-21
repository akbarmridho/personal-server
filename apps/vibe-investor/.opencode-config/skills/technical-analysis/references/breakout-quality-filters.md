# Breakout Quality Filters

## Objective

Improve breakout selectivity using base-quality and market-context filters before execution.

## Base-Quality Filters

- `R-BQ-04` Avoid very short bases (example under 7 weeks) for swing breakout calls.
- `R-BQ-05` Avoid excessively deep/loose bases (example drawdown over 35 percent) unless separate reversal thesis is active.
- `R-BQ-06` Late-stage bases carry higher failure risk; demand stronger confirmation.

## Breakout Strength Filters

- `R-BQ-07` Breakout day should show volume expansion versus average.
- `R-BQ-08` Fast post-break displacement is preferred; stalling quickly after break is warning.
- `R-BQ-09` If broad market context is weak/risk-off, downgrade pure breakout setups.

## Watchlist Context Filter

- `R-BQ-10` For momentum-style continuation scans, prioritize names trading relatively close to major highs.
- This is a prioritization filter only, not an entry trigger.

## Trace Requirements

- base quality note (duration/depth/stage)
- breakout strength note (volume and displacement)
- market context impact note (`supportive`, `neutral`, `adverse`)

## Implementation Note

Deterministic breakout base-quality outputs are implemented in:

- Module: `breakout`
- Script: `scripts/build_ta_context.py`
