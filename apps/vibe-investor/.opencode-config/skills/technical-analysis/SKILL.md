---
name: technical-analysis
description: Technical-analysis helper for IDX stocks used to refine entry, exit, timing, and risk inside a broader investment process, with deterministic preprocessing and bounded decision output.
---

## Scope

Entry/exit timing, invalidation, and risk map for swing to long-term positions. Daily owns thesis direction; 15m owns trigger and confirmation. This skill does not own trade decisions — that belongs to the human via the parent workflow.

## Role in Synthesis

Technical analysis is **timing and risk placement**. It answers "how do we express this trade safely?" not "is the thesis true?"

- A low TA score on a working momentum stock means "risk placement is harder and chase risk is higher," not "don't act."
- TA informs entry zone, stop level, position sizing (via stop distance), and add/trim timing.
- TA owns structure-break detection for exit signals — when structure breaks, TA should flag it clearly.
- TA does not veto entries based on extension alone. Being in a working uptrend is not a negative for the thesis — it's a timing consideration.

## Data And Deterministic Build

Use `fetch-ohlcv` as the only chart-data source. Required: `daily[]`, `intraday_1m[]`. Optional: `corp_actions[]`. Prices are split-style adjusted, not dividend-adjusted. If required data is missing, stop.

The deterministic layer is mandatory. Do not skip chart generation or chart reading.

### Context Build

```bash
python3 scripts/build_ta_context.py \
  --input {FETCH_OHLCV_OUTPUT_PATH} \
  --symbol {SYMBOL} \
  --outdir work \
  --modules core,vpvr,breakout
```

### Chart Build

```bash
python3 scripts/generate_ta_charts.py \
  --input {FETCH_OHLCV_OUTPUT_PATH} \
  --symbol {SYMBOL} \
  --outdir work \
  --modules core,vpvr \
  --ma-mode {DAILY_MA_MODE}
```

MA modes: `hybrid` (default) = EMA21 + SMA50 + SMA200 + adaptive SMA{n}; `baseline` = EMA21 + SMA50 + SMA200 only. Use artifact paths from the chart evidence manifest.

## Purpose Modes

- `INITIAL` — fresh thesis
- `UPDATE` — refresh active thesis. Must produce `thesis_status`, `review_reason`, delta assessment.
- `POSTMORTEM` — review failed/exited thesis. Must produce failure point, missed warning, handling improvement.

If prior context is required and missing, stop.

## Canonical Phase Order

`MODE → STATE → LOCATION → SETUP → TRIGGER → CONFIRMATION → RISK → ASSESSMENT → MONITORING`

Each phase has a stop condition. If a phase cannot produce a clean answer, cap conviction and state why. Do not force a narrative through a broken phase.

| Phase | Job | Stop condition |
|-------|-----|----------------|
| STATE | Classify daily state (balance/imbalance), regime, Wyckoff, MA posture | Unclassifiable → low conviction |
| LOCATION | Map price vs decision zones, value-area acceptance, draw targets | Mid-range noise with no zone → mixed/no-setup score |
| SETUP | Select one of S1-S5 or NO_VALID_SETUP | No clean fit → NO_VALID_SETUP, low score |
| TRIGGER | Has the setup triggered? 15m owns trigger quality | No trigger → setup-forming score range |
| CONFIRMATION | Follow-through, participation, contradiction check | Mixed confirmation → lower score, state contradiction |
| RISK | Invalidation, next-zone path, RR | Unclear invalidation or no path → cap conviction |
| ASSESSMENT | Final `technical_assessment` object | — |
| MONITORING | What confirms, invalidates, or refreshes next | — |

Daily owns STATE, LOCATION, SETUP, risk map. 15m owns TRIGGER, CONFIRMATION, tactical timing. 15m can cap conviction but cannot create a trade against daily thesis.

## Market Structure

### State And Regime

- Start with balance (accepted in value area) or imbalance (directional repricing).
- Default: price stays in current value area until close-based acceptance proves otherwise.
- Breakout acceptance = close outside range + follow-through. Failed acceptance = trap evidence.
- Uptrend: HH + HL. Downtrend: LH + LL. Mixed swings → range rotation unless MA posture confirms continuation.
- Wick-only breaks do not change regime without close confirmation.

### BOS And CHOCH

- Continuation BOS: structural break in trend direction.
- CHOCH: first opposite-direction structural break. Warning, not confirmation.
- Confirmation BOS: second break in new direction after CHOCH. Reversal confirmed only after CHOCH + confirmation BOS.
- CHOCH+ (momentum-failure variant): failed extension first, then opposite break.
- Wick-only excursion does not qualify.

### Wyckoff

One contextual label after state call: accumulation, markup, distribution, markdown. Guidance, not standalone trigger.

### MA Tiebreaker

When swings are mixed: bullish continuation only if price > SMA200, EMA21 > SMA50, and at least one bullish swing holds. Mirror for bearish. Otherwise range_rotation.

### No-Resistance Protocol

Price in discovery with no overhead resistance: do not force fixed top target. Use structure continuation and invalidation. Downgrade conviction only on structural weakness.

## Levels And Location

Levels are zones, not lines. Map first, trade second. Practical order:

1. Daily S/R → 2. Structural swing H/L → 3. VPVR (POC/VAH/VAL, HVN/LVN) → 4. Baseline MA context → 5. Liquidity draw map → 6. Time-based/round levels when relevant

Key rules:

- First retest is strongest; repeated tests weaken.
- Broken S/R can flip role after close-based acceptance.
- MAs are dynamic context, not entry signals. Adaptive MA refines but never overrides baseline.
- VPVR: POC = fair-value magnet, accepted above VAH = bullish, below VAL = bearish, rotating inside = balance. VPVR never overrides stop discipline.
- Liquidity draw: always identify current and opposing draw. Level excursion must be labeled acceptance or rejection. Wick-only excursion is not confirmation.

## Setups

One setup family or `NO_VALID_SETUP`. Setup must fit daily regime and location. Middle-of-range entries usually → NO_VALID_SETUP.

| Setup | When | Needs |
|-------|------|-------|
| S1 breakout + retest | Continuation regime, resistance challenged | Close beyond level, follow-through, retest hold |
| S2 pullback to demand | Intact uptrend, price at support | Support hold, acceptable selling pressure |
| S3 excursion + reclaim | Level excursion snaps back, reversal plausible | Clear excursion, reclaim holding |
| S4 range edge rotation | Balance regime, price at edge | Edge rejection/acceptance, edge-to-edge path |
| S5 Wyckoff spring | Accumulation context, support-side excursion | Spring excursion, reclaim, follow-through |

Trigger rules: setup area alone is not enough — action requires a trigger. 15m owns trigger quality. Absent trigger caps score in setup-forming range.

Breakout quality: needs close + participation. No follow-through = suspect. Weak base needs stronger confirmation.

Reversal: CHOCH alone is warning. Actionable only after CHOCH + confirmation BOS + constructive pullback.

## Risk And Execution

- No setup without invalidation.
- Entry valid only near a mapped zone. Mid-range without confluence = low quality.
- Primary target = next meaningful zone. Further targets along zone ladder.
- Stop hierarchy: structural invalidation → ATR fallback → time stop.
- Stop may tighten, never loosen.
- Add only when structure valid and PM no-averaging-down rule satisfied.
- Adaptive MA refines execution only after structural plan exists.

### Take-Profit

- R-TP-01: high-conviction setup includes trade-management plan at entry.
- R-TP-02: targets from structure/value zones and R-multiples, not oscillators.
- R-TP-03: partial sizing by family — S1/S2: 25/25/50, S3/S5: 40/30/30, S4: 50/30/20. Pilots: no partial harvest, hold whole until scaled to STARTER or exited.
- R-TP-04: trail mode from state/regime, setup family, Wyckoff maturity.
- R-TP-05 through R-TP-10: stop tightens never loosens; after T1 protect remainder; failed acceptance accelerates exit; stale winners need time-stop; discovery mode = trailing over top calls; re-add = fresh entry.

## Conviction Scoring

```yaml
technical_assessment:
  conviction_score: 62
  confidence: MEDIUM
  bull_factors: []
  bear_factors: []
  risk_map:
    invalidation: 10200
    target_1: 11500
    rr: 2.1
  red_flags: []
  key_levels: []
  monitoring_triggers: []
```

### Score Rubric

| Score | Meaning |
|-------|---------|
| 0-15 | Structure broken, thesis invalidated |
| 16-30 | Damaged, no setup, poor location |
| 31-45 | Mixed, developing, mid-range noise |
| 46-60 | Setup forming, location decent, trigger developing |
| 61-75 | Setup valid, trigger active or near, confirmation partial |
| 76-90 | Clean setup, trigger confirmed, good RR |
| 91-100 | Textbook setup, strong confirmation, excellent RR |

Score must reflect both structural quality and execution readiness. Lower score instead of forcing a low-quality narrative.

### Red Flags

Core: F1_STRUCTURE_BREAK | F2_DISTRIBUTION | F3_WEAK_BREAKOUT | F4_LEVEL_EXHAUSTION | F5_MARKET_CONTEXT_MISMATCH | F6_MA_BREAKDOWN | F7_POSITION_RISK | F8_NO_NEARBY_SUPPORT | F9_UNCONFIRMED_STRUCTURE_SHIFT | F10_NO_NEXT_ZONE_PATH | F11_LIQUIDITY_MAP_MISSING | F12_BREAKOUT_STALLING

Conditional: F13_VOLUME_CONFLUENCE_WEAK | F14_BREAKOUT_FILTER_WEAK | F15_MA_WHIPSAW | F16_PRICE_LIMIT_PROXIMITY | F17_LIQUIDITY_WEAK

Severity: `low` | `medium` | `high` | `critical`. Key guidance:

- F6: `medium` losing EMA21 only; `high` losing SMA50 or below both
- F16: `medium` default; `high` when bar finished near limit and is core to interpretation
- F17: `medium` for low liquidity (Rp1B-10B); `high` for very_low (< Rp1B). PM owns ADTV hard rails.

Every flag: `flag_id`, `severity`, `why`. Include overall risk summary.

## Output

This skill produces:

1. **`ta_context.json`** — deterministic preprocessing output. System of record for all TA structured data (levels, MA posture, Wyckoff, VPVR, setup, red flags, risk map). Written by the preprocessing script.
2. **`chart_evidence.json`** — deterministic chart preprocessing output. Structure events, liquidity map, Wyckoff state, VPVR levels. Written by the chart generation script.
3. **Chart PNGs** — visual evidence. Written by the chart generation script.
4. **Lens summary for `plan.md`** — the LLM's unique interpretation, written directly into the symbol's `plan.md` under the `## Technical ({score}) — {role}` section.

The lens summary contains ONLY what the LLM uniquely contributes — interpretation, reasoning, bull/bear factors, monitoring triggers, and history entries. It must NOT restate structured data that already lives in `ta_context.json` (levels, MA proximity, Wyckoff phase details, setup scores, red flag codes, etc.).

### Required fields in the lens summary

- Score, role, bias
- Current state interpretation (3-5 sentences)
- Bull/bear factors (curated for this thesis)
- Key levels line (invalidation, stop, targets, R:R)
- Monitoring triggers (upgrade/downgrade/exit)
- History entry (date, score, 1-3 sentences of reasoning)

### Required fields in `ta_context.json`

All structured data: `purpose_mode`, `conviction_score`, `confidence`, `bias`, `setup_family`, `key_active_level`, `trigger_status`, `invalidation`, `next_trigger`, `bull_factors`, `bear_factors`, `risk_map`, `red_flags`, `key_levels`, `monitoring_triggers`, `chart_artifact_refs`. Add `risk_map.rr` for constructive setups, `current_rr` when long.

### Writing to plan.md

- **INITIAL mode**: write the full Technical section using `write` (as part of creating the entire `plan.md`).
- **UPDATE mode**: use `edit` to surgically update only what changed — score in the header, state paragraph if interpretation materially changed, and append a history entry. Never rewrite the whole section if only the score shifted.
- **If nothing material changed**: do not touch the Technical section. No update is a valid outcome.

See `memory/symbols/README.md` for the full plan template, edit protocol, and statefulness rules.

## Artifact Persistence

Write chart PNGs (`*.png`), `ta_context.json`, and `chart_evidence.json` to `memory/symbols/{SYMBOL}/` when the symbol has an existing plan or is in the coverage universe. Otherwise write to `work/`.
