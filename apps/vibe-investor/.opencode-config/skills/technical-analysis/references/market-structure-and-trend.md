# Market Structure And Trend

## Objective

Classify market state before setup selection using balance-imbalance logic, then map context with Wyckoff and swing structure.

## State And Regime Rules

- `R-STATE-01` Start with state: `balance` (accepted in value area) or `imbalance` (directional repricing).
- `R-STATE-02` Default assumption: price remains in current value area until close-based acceptance proves otherwise.
- `R-STATE-03` Breakout acceptance requires close outside range plus follow-through.
- `R-STATE-04` Failed acceptance (quick close back in range) is trap evidence, not trend confirmation.
- `R-REGIME-01` Uptrend: higher highs and higher lows on daily swings.
- `R-REGIME-02` Downtrend: lower highs and lower lows on daily swings.
- `R-REGIME-03` Range rotation: mixed swings with repeated rejection at range edges.
- `R-REGIME-04` Potential reversal: CHOCH plus follow-through BOS in opposite direction.
- `R-REGIME-05` Wick-only breaks do not change regime without close confirmation.

## Strong And Weak Swing Logic

- `R-SWING-01` Strong high/low: pivot that caused structural break.
- `R-SWING-02` Weak high/low: pivot that failed to break structure and remains liquidity target.

## BOS And CHOCH Taxonomy

- `R-BOS-01` Continuation BOS: break of prior structural level in the direction of prevailing trend.
- `R-CHOCH-01` CHOCH: first opposite-direction structural break against prevailing trend.
- `R-BOS-02` Confirmation BOS: second structural break in the new direction after CHOCH.
- `R-BOS-03` Reversal is considered confirmed only after `CHOCH + confirmation BOS`.
- `R-BOS-04` Wick-only excursion does not qualify as BOS or CHOCH.
- `R-CHOCH-02` CHOCH+ (momentum-failure variant): failed extension first, then opposite structural break.

## Reversal Validation Chain

Use this sequence for reversal classification:

1. Confirm prior trend context (bullish or bearish).
2. Detect CHOCH as the first opposite close-based break.
3. Observe pullback behavior (higher low for bullish case, lower high for bearish case).
4. Require confirmation BOS in new direction.
5. If step 4 fails, keep state as unconfirmed and avoid reversal call.

Liquidity-grab filter:

- If break occurs but price quickly reclaims prior structure without follow-through, classify as deviation/liquidity grab, not reversal confirmation.

## Wyckoff Context Mapping

Use one label as context after state call:

- `accumulation`: balance after downtrend with absorption signs.
- `markup`: imbalance up with trend continuation.
- `distribution`: balance after uptrend with supply signs.
- `markdown`: imbalance down with trend continuation.

This map is contextual guidance, not a standalone trigger.

## Regime Output

Return these fields:

- `state`: `balance` or `imbalance`
- `regime`: `trend_continuation`, `range_rotation`, `potential_reversal`, `no_trade`
- `trend_bias`: `bullish`, `bearish`, `neutral`
- `wyckoff_context`: `accumulation`, `markup`, `distribution`, `markdown`, `unclear`

## Trace Requirements

- Add at least 2 evidence items for regime call:
  - last confirmed swing highs and lows with timestamps
  - break candle close values versus broken level
- Add 1 state proof: range boundary and acceptance/failure evidence.
- For reversal narratives, include CHOCH level/time and confirmation BOS level/time.
- If conflict exists between numeric structure and visual read, report conflict and chosen precedence.

## No-Resistance Protocol

If price is in discovery with no clear overhead resistance:

- Do not force fixed top target.
- Keep action tied to structure continuation and invalidation.
- Downgrade conviction only on structural weakness or distribution evidence.

## Implementation Note

Deterministic market-structure preprocessing is implemented in:

- Module: `core`
- Script: `scripts/build_ta_context.py`
