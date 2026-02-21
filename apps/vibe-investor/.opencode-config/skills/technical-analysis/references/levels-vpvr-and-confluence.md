# Levels VPVR And Confluence

## Objective

Use volume-by-price structure to strengthen level reliability and improve reaction/acceptance assessment.

## Rules

- `R-LVL-05` Prefer confluence zones (swing + VPVR + fib/round number) over isolated levels.
- `R-VP-08` Use POC as fair-value magnet.
- `R-VP-09` HVN is reaction zone; LVN is fast-travel zone.
- `R-VP-10` Use VPVR as confluence, not standalone trigger.
- `R-VP-11` If breakout enters LVN with acceptance, continuation probability increases toward next HVN.

## Practical Notes

- focus on top HVN/LVN zones, not every node
- combine VPVR context with structural levels and acceptance behavior

## Trace Requirements

- POC/HVN/LVN values from analyzed window
- confluence note linking VPVR node to structural decision zone

## Implementation Note

Deterministic VPVR level extraction is implemented in:

- Module: `vpvr`
- Script: `scripts/build_ta_context.py`
