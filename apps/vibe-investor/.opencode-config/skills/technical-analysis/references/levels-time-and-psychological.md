# Levels Time And Psychological

## Objective

Add contextual confluence from time-based pivots and round-number behavior without replacing structural level logic.

## Rules

- `R-LVL-08` Time-based pivots (monthly/weekly/daily open) can act as contextual decision levels.
- `R-LVL-09` Psychological round numbers can strengthen confluence, not replace structure.

## Time-Based Levels

Track when relevant:

- Monthly Open
- Weekly Open
- Daily Open

Typical use:

- as contextual pivot around higher-timeframe bias
- as acceptance/rejection clues when price reclaims or loses open levels

## Psychological Levels

Track major round numbers using instrument-appropriate increments.

Typical use:

- confluence with structural zones and profile nodes
- trap/deviation awareness around obvious round numbers

## Trace Requirements

- include relevant open levels and current relation (above/below/reclaim/loss)
- include round-number interactions only when materially relevant

## Implementation Note

Deterministic time-based opens and round-level outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`
