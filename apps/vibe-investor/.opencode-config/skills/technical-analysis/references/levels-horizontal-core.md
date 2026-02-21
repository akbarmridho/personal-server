# Levels Horizontal Core

## Objective

Map actionable horizontal support/resistance zones from structure, then use those zones as decision areas rather than precise single-price lines.

## Charting-First Practice

- Draw levels/zones on charts first, then interpret.
- Start from higher timeframe obvious structures first, then refine lower timeframe detail.
- Keep level map minimal and actionable.
- Chart observations should be logged before setup decision.

## Core Rules

- `R-LVL-01` Levels are zones, not single lines.
- `R-LVL-02` Higher timeframe and repeatedly respected zones have priority.
- `R-LVL-03` First retest is strongest; repeated tests weaken level quality.
- `R-LVL-04` Broken support/resistance can flip role after acceptance.
- `R-LVL-06` Use close-based confirmation, not wick-only breaches.
- `R-LVL-07` Mapping and trading are separate steps; map alone is not trade permission.

## Strength By Test Count

- 1st test: strongest
- 2nd test: still reliable
- 3rd test: weakening
- 4th+ tests: elevated break risk

## Zone Construction

Use one method consistently per report:

- fixed width: around 1-2 percent
- ATR width: around 0.5 ATR
- wick-body map: candle body to rejection wick edge

## Wick vs Body Guidance

- For stop-run/spike/deviation setups: prioritize wick behavior and fast reclaim.
- For breakout acceptance and reversal structure: prioritize close/body confirmation.
- When both are informative, report both with explicit precedence.

## Trace Requirements

- top support/resistance zone values and touched dates
- role-reversal or failed-break notes when present

## Implementation Note

Deterministic level clustering and strength outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`
