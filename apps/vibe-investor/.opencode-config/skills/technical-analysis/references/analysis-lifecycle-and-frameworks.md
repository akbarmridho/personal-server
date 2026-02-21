# Analysis Lifecycle And Frameworks

## Objective

Support repeatable technical analysis across time (initial thesis, periodic updates, thesis review, and postmortem) while allowing multiple schools of thought without breaking risk discipline.

## Modes

- `INITIAL`: Build first thesis from current data.
- `UPDATE`: Re-run analysis against prior report and classify deltas.
- `THESIS_REVIEW`: Validate whether prior thesis is still intact.
- `POSTMORTEM`: Analyze outcome after invalidation/exit.

## Prior Analysis Input Contract

Required for `UPDATE`, `THESIS_REVIEW`, and `POSTMORTEM`:

- prior report reference (file path or run date)
- prior action (`BUY`, `HOLD`, `WAIT`, `EXIT`)
- prior thesis summary (1-3 bullets)
- prior invalidators and stop level
- prior key levels and regime snapshot

If required prior context is unavailable, downgrade mode to `INITIAL` and state limitation.

## Thesis Status Model

Use one status:

- `intact`
- `improving`
- `degrading`
- `invalidated`

Delta requirements for non-initial modes:

- what changed (structure, levels, volume, setup quality, risk)
- what stayed the same
- why action changed or stayed

## Framework Lenses

Allowed lens values:

- `UNIFIED` (default)
- `CLASSICAL_TA`
- `WYCKOFF`
- `SMC_ICT_LIGHT`

Rules:

- `R-FW-01` `UNIFIED` is default output lens.
- `R-FW-02` Alternate lens may be used when explicitly requested.
- `R-FW-03` All lenses must still respect risk protocol and invalidation contract.
- `R-FW-04` If alternate lens disagrees with `UNIFIED`, report agreement/disagreement with evidence.
- `R-FW-05` `UNIFIED` should include participation context (volume profile or equivalent volume-by-price evidence) when available.
- `R-FW-06` Any actionable decision should map a level-to-level path (entry zone to next-zone target) or downgrade to `WAIT`.
- `R-FW-07` Any directional call should include liquidity draw map (current draw and opposing draw).

`SMC_ICT_LIGHT` scope:

- BOS/CHOCH/CHOCH+ structure, liquidity sweep/deviation, and optional FVG/OTE confluence.
- Optional modules: Order Block, Breaker Block, IFVG, EQH/EQL, Premium/Discount, and MTF POI overlay.
- No hidden assumptions beyond explicit evidence.

## Trace Requirements

For non-initial modes include:

- `Previous Thesis Snapshot`
- `Delta Log` table (Changed / Unchanged / Impact)
- `Thesis Status` and reason

For alternate lens include:

- `Lens Compare` table: `Lens`, `Bias`, `Action`, `Key Difference`, `Evidence refs`
