# Levels

## Horizontal Core

### Objective

Map actionable horizontal support/resistance zones from structure, then use those zones as decision areas rather than precise single-price lines.

### Charting-First Practice

- Draw levels/zones on charts first, then interpret.
- Start from higher timeframe obvious structures first, then refine lower timeframe detail.
- Keep level map minimal and actionable.
- Chart observations should be logged before setup decision.

### Core Rules

- `R-LVL-01` Levels are zones, not single lines.
- `R-LVL-02` Higher timeframe and repeatedly respected zones have priority.
- `R-LVL-03` First retest is strongest; repeated tests weaken level quality.
- `R-LVL-04` Broken support/resistance can flip role after acceptance.
- `R-LVL-06` Use close-based confirmation, not wick-only breaches.
- `R-LVL-07` Mapping and trading are separate steps; map alone is not trade permission.

### Strength By Test Count

- 1st test: strongest
- 2nd test: still reliable
- 3rd test: weakening
- 4th+ tests: elevated break risk

### Zone Construction

Use one method consistently per report:

- fixed width: around 1-2 percent
- ATR width: around 0.5 ATR
- wick-body map: candle body to rejection wick edge

### Wick vs Body Guidance

- For stop-run/spike/deviation setups: prioritize wick behavior and fast reclaim.
- For breakout acceptance and reversal structure: prioritize close/body confirmation.
- When both are informative, report both with explicit precedence.

### Trace Requirements

- top support/resistance zone values and touched dates
- role-reversal or failed-break notes when present

### Implementation Note

Deterministic level clustering and strength outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`

## Moving Average Dynamics

### Objective

Use moving averages as dynamic support/resistance context to qualify trend quality and level behavior.

### Rules

- `R-LVL-MA-01` MA posture is context, not standalone entry signal.
- `R-LVL-MA-02` Baseline stack for consistency: 21EMA (fast), 50SMA (primary pullback support), 100SMA (deeper support), 200SMA (regime line).
- `R-LVL-MA-03` Adaptive MA may be used per symbol behavior (for example 3/5/10/20/50 family) when repeated respect is measurable.
- `R-LVL-MA-04` Preferred operating mode is `hybrid`: keep baseline stack for regime clarity, add one adaptive MA only when evidence supports it.
- `R-LVL-MA-05` In uptrend continuation context, sustained acceptance above 50SMA and 100SMA strengthens bullish support thesis.
- `R-LVL-MA-06` Repeated loss/reclaim around key MAs signals unstable structure and should reduce conviction.
- `R-LVL-MA-07` MA context should be read with horizontal zones, not in isolation.

Mode guidance:

- `baseline_stack`: best for cross-symbol consistency and reporting.
- `adaptive_primary`: best for single-symbol trend tracking when one MA is clearly respected.
- `hybrid` (default): combine both to avoid overfitting and preserve comparability.

### Trace Requirements

- report posture above/below 21EMA, 50SMA, 100SMA, 200SMA
- note whether MAs are acting as support, resistance, or noisy chop
- if adaptive MA is used, report selected period and respect evidence (touch/reclaim behavior)

### Implementation Note

Deterministic MA stack and posture outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`

## Fibonacci Retracement And Extension

### Objective

Use Fibonacci retracement and extension as structured confluence for pullback entries, invalidation planning, and target projection.

### Scope

- Fibonacci is context support, not standalone signal.
- Most useful in directional markets; lower reliability in choppy ranges.
- Swing anchors must be explicit and repeatable.

### Retracement Rules

- `R-FIB-01` Identify trend first (uptrend or downtrend) before drawing Fib.
- `R-FIB-02` Uptrend retracement anchors from swing low to swing high.
- `R-FIB-03` Downtrend retracement anchors from swing high to swing low.
- `R-FIB-04` Primary retracement map: `0.236`, `0.382`, `0.5`, `0.618`, `0.786`.
- `R-FIB-05` OTE is a tactical subset (`0.618`, `0.706`, `0.786`) and should not replace full retracement context.
- `R-FIB-06` Prefer Fib levels that align with structure zones, MA dynamic support/resistance, or VPVR nodes.

Interpretation guide:

- shallow pullback (`0.236` to `0.382`): stronger momentum continuation context
- medium pullback (`0.5` to `0.618`): common continuation test area
- deep pullback (`0.786`): higher failure risk unless strong reclaim/acceptance appears

### Extension Rules

- `R-FIB-07` Use extensions for path planning after continuation confirms.
- `R-FIB-08` Common extension map: `1.0`, `1.272`, `1.618`, `2.618`.
- `R-FIB-09` Extension targets should be checked against next liquidity/level map; if conflict exists, prioritize validated structure level.

### Risk And Confirmation

- `R-FIB-10` Never execute from Fib level alone; require structure/acceptance evidence.
- `R-FIB-11` Stops belong beyond structural invalidation, not exactly on Fib lines.
- `R-FIB-12` If Fib map and market structure conflict, downgrade conviction or output `WAIT`.

### Trace Requirements

- active swing anchors (time and price)
- retracement levels used and nearest interaction level
- extension levels used for target ladder (if used)
- confluence note: structure / MA / VPVR alignment

### Implementation Note

Deterministic Fib retracement/extension and OTE helper outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`

## Time And Psychological

### Objective

Add contextual confluence from time-based pivots and round-number behavior without replacing structural level logic.

### Rules

- `R-LVL-08` Time-based pivots (monthly/weekly/daily open) can act as contextual decision levels.
- `R-LVL-09` Psychological round numbers can strengthen confluence, not replace structure.

### Time-Based Levels

Track when relevant:

- Monthly Open
- Weekly Open
- Daily Open

Typical use:

- as contextual pivot around higher-timeframe bias
- as acceptance/rejection clues when price reclaims or loses open levels

### Psychological Levels

Track major round numbers using instrument-appropriate increments.

Typical use:

- confluence with structural zones and profile nodes
- trap/deviation awareness around obvious round numbers

### Trace Requirements

- include relevant open levels and current relation (above/below/reclaim/loss)
- include round-number interactions only when materially relevant

### Implementation Note

Deterministic time-based opens and round-level outputs are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`

## VPVR And Confluence

### Objective

Use volume-by-price structure to strengthen level reliability and improve reaction/acceptance assessment.

### Rules

- `R-LVL-05` Prefer confluence zones (swing + VPVR + fib/round number) over isolated levels.
- `R-VP-08` Use POC as fair-value magnet.
- `R-VP-09` HVN is reaction zone; LVN is fast-travel zone.
- `R-VP-10` Use VPVR as confluence, not standalone trigger.
- `R-VP-11` If breakout enters LVN with acceptance, continuation probability increases toward next HVN.

### Practical Notes

- focus on top HVN/LVN zones, not every node
- combine VPVR context with structural levels and acceptance behavior

### Trace Requirements

- POC/HVN/LVN values from analyzed window
- confluence note linking VPVR node to structural decision zone

### Implementation Note

Deterministic VPVR level extraction is implemented in:

- Module: `vpvr`
- Script: `scripts/build_ta_context.py`

## Initial Balance IBH IBL

### Objective

Use Initial Balance as a probabilistic acceptance framework for intraday and period-open context.

### Initial Balance Concept

- IBH is highest traded price in initial observation window.
- IBL is lowest traded price in the same window.
- IB range represents early agreement, not certainty.
- Acceptance above/below IB suggests repricing agreement.
- Failed acceptance implies deviation/trap behavior.

### Intraday 60m Rules

- `R-IB-01` IBH is highest high of first 2 completed 60m bars in a session.
- `R-IB-02` IBL is lowest low of first 2 completed 60m bars in a session.
- `R-IB-03` `accepted_above_ibh`: close above IBH and next bar does not close back in range.
- `R-IB-04` `accepted_below_ibl`: close below IBL and next bar does not close back in range.
- `R-IB-05` failed break: excursion outside then close back inside within 1-2 bars.

Interpretation:

- `accepted_above_ibh` -> bullish acceptance bias
- `accepted_below_ibl` -> bearish acceptance bias
- failed breaks -> trap/deviation context

### Higher-Timeframe IB Overlay

For reporting, add stepped IBH/IBL overlay from period-open discovery windows.

- `R-IB-HTF-01` group daily candles by period (commonly month)
- `R-IB-HTF-02` compute IBH/IBL from first `n` candles (default `n=2`)
- `R-IB-HTF-03` draw stepped lines across each period
- `R-IB-HTF-04` label accepted/deviation state on latest period
- `R-IB-HTF-05` include artifact: `work/{SYMBOL}_ib_overlay.png`

### Trace Requirements

- latest IBH/IBL values and state label
- period + first_n bars used for overlay
- latest period acceptance/deviation label

### Implementation Note

Deterministic IB state and overlay generation are implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`
- Script: `scripts/generate_ta_charts.py`
