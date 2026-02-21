# Breakout And Participation

## Objective

Validate breakout and continuation quality using close behavior, follow-through, and volume participation.

## Breakout Rules

- `R-PA-01` Breakout needs close beyond level plus volume expansion.
- `R-PA-02` Breakout without follow-through is suspect.
- `R-PA-03` Failed breakout (deviation) is a valid opposite signal only after reclaim/failure confirmation.
- `R-PA-08` Clean breakout should displace quickly; post-breakout stalling increases trap risk.

## Volume Confirmation

- `R-VOL-01` Breakout volume should be above recent average (example 20-day mean).
- `R-VOL-02` Up move on weak volume is lower quality.
- `R-VOL-03` Repeated high-volume down closes near highs signals distribution risk.
- `R-VOL-04` Price up + volume up is strongest continuation profile.
- `R-VOL-05` Price down + volume down can be healthy pullback in uptrend context.

## Early Participation Signal

- If first-hour intraday volume reaches roughly 70 percent of average daily volume, escalate monitoring.
- This is an alert condition, not standalone entry permission.

## Trace Requirements

- trigger candle timestamp and close
- follow-through candle timestamp and close
- trigger volume ratio
- displacement quality note: clean displacement or stalling

## Implementation Note

Deterministic breakout snapshot extraction is implemented in:

- Module: `breakout`
- Script: `scripts/build_ta_context.py`
