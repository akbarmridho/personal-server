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

## Reference Code

```python
import pandas as pd


def base_quality(window: pd.DataFrame, min_weeks=7, max_depth=0.35):
    n_days = len(window)
    weeks = n_days / 5.0
    hi = float(window["high"].max())
    lo = float(window["low"].min())
    depth = (hi - lo) / hi if hi > 0 else 0.0
    too_short = weeks < min_weeks
    too_deep = depth > max_depth
    status = "ok"
    if too_short or too_deep:
        status = "weak"
    return {
        "weeks": weeks,
        "depth": depth,
        "too_short": too_short,
        "too_deep": too_deep,
        "status": status,
    }
```
