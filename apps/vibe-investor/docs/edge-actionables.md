# Edge Validation — Actionable Items

Derived from ChatGPT and Gemini deep research on skill edge validation.

## Code / Backtest Changes

### ~~1. Ablation-test vision~~ — resolved

Tested with BUMI (clear bearish) and eyeballed MEDC/ITMG/ADMR (ambiguous). Finding: JSON alone is sufficient for clear-cut cases (LLM reaches correct WAIT with or without charts). For contested cases (pullback quality, breakout retest, distribution chop), charts carry visual context that JSON doesn't fully capture — candle shape, volume signature, MA interaction patterns. Charts never hallucinated or degraded decisions. Conclusion: keep charts mandatory in skill workflow, no demotion needed. See `docs/bumi-ablation-prompts.md` for test details.

### 2. ARA/ARB awareness in deterministic layer

Scripts don't account for IDX auto-rejection limits. Breakout near upper ARA or sweep near ARB can be mechanical, not structural. Add price-limit proximity flag to `ta_context` (`near_ara` / `near_arb`) and let policy downgrade confidence or force WAIT.

Limits by price band (current as of 2025):

- Rp50–Rp200: ARA 35%, ARB 15%
- Rp200–Rp5,000: ARA 25%, ARB 15%
- >Rp5,000: ARA 20%, ARB 15%

Touches: `scripts/ta_context_flags.py` (new flag), `scripts/build_ta_context.py` (wire into red_flags), SKILL.md (document the flag).

### 3. Liquidity/ADTV filter in TA skill

PM skill has ADTV checks but TA skill doesn't. Thin names produce unreliable structure signals. Add minimum ADTV gate — if ADTV is below threshold, either skip analysis or add a high-severity red flag.

Touches: `scripts/build_ta_context.py` (ADTV check at validation stage), SKILL.md (document the gate).

### 4. Realistic IDX friction in backtest

Current backtest uses next-bar-open execution but no spread, tick-size, or slippage model. Add a simple fixed-cost model: ~0.15% sell fee + estimated spread by ADTV bucket. Shows which setups survive friction.

Touches: `backtest/technical/lib/execution.py` (cost model in `close_position`), `backtest/technical/run_backtest.py` (cost params), `backtest/technical/lib/report.py` (net-of-cost metrics).

## Doctrine / Framing Changes

### 5. Track multiple-testing exposure

When scanning N stocks and picking the best setup, effective significance is diluted by N. Log how many symbols were scanned per decision period in backtest reports. Doesn't change the system — makes selection bias visible.

Touches: `backtest/technical/lib/report.py` (add scan count field).

### 6. Soften ICT/SMC language

Replace "liquidity sweep" (implies intentional stop-hunting) with "level excursion + rejection/acceptance" (describes observable behavior). Signal logic stays the same, but stops implying causation unverifiable from OHLCV. More robust to IDX microstructure where "sweeps" can be auto-rejection artifacts.

Touches: SKILL.md (terminology pass), `scripts/ta_common.py` and `scripts/build_ta_context.py` (variable/field naming where applicable — keep schema field names stable for backtest compatibility, change only prose/comments).

## Already In Progress

### 7. Take-profit doctrine

Biggest gap confirmed by both research outputs. Refinement plan in `docs/tp-refinement-plan.md`.

## Priority

1. Items 2 + 4 first (ARA/ARB awareness + friction model) — directly affect whether backtest results are trustworthy
2. Item 7 alongside (take-profit doctrine + code)
3. Item 3 next (ADTV filter)
4. Items 5 + 6 last (reporting + terminology — low effort, do anytime)
