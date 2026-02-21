# Initial Balance IBH IBL

## Objective

Use Initial Balance as a probabilistic acceptance framework for intraday and period-open context.

## Initial Balance Concept

- IBH is highest traded price in initial observation window.
- IBL is lowest traded price in the same window.
- IB range represents early agreement, not certainty.
- Acceptance above/below IB suggests repricing agreement.
- Failed acceptance implies deviation/trap behavior.

## Intraday 60m Rules

- `R-IB-01` IBH is highest high of first 2 completed 60m bars in a session.
- `R-IB-02` IBL is lowest low of first 2 completed 60m bars in a session.
- `R-IB-03` `accepted_above_ibh`: close above IBH and next bar does not close back in range.
- `R-IB-04` `accepted_below_ibl`: close below IBL and next bar does not close back in range.
- `R-IB-05` failed break: excursion outside then close back inside within 1-2 bars.

Interpretation:

- `accepted_above_ibh` -> bullish acceptance bias
- `accepted_below_ibl` -> bearish acceptance bias
- failed breaks -> trap/deviation context

## Higher-Timeframe IB Overlay

For reporting, add stepped IBH/IBL overlay from period-open discovery windows.

- `R-IB-HTF-01` group daily candles by period (commonly month)
- `R-IB-HTF-02` compute IBH/IBL from first `n` candles (default `n=2`)
- `R-IB-HTF-03` draw stepped lines across each period
- `R-IB-HTF-04` label accepted/deviation state on latest period
- `R-IB-HTF-05` include artifact: `work/{SYMBOL}_ib_overlay.png`

## Trace Requirements

- latest IBH/IBL values and state label
- period + first_n bars used for overlay
- latest period acceptance/deviation label

## Implementation Note

Deterministic IB state and overlay generation are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`
- Script: `scripts/generate_ta_charts.py`
