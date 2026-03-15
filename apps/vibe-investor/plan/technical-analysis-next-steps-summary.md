# Technical Analysis Next Steps Summary

## Purpose

This file records the current agreed next steps for the `vibe-investor` technical-analysis work after the methodology and Wyckoff review.

It is a direction-setting note.
It freezes what should happen next before more feature work is added.

## 1. Freeze The Core Doctrine

The core technical-analysis method should remain:

- market structure and trend
- support and resistance / location
- daily thesis plus `60m` timing
- lean moving-average regime context:
  - `EMA21`
  - `SMA50`
  - `SMA200`
- trigger / confirmation / invalidation / risk map

This is the main doctrine stack that should be treated as authoritative.

## 2. Demote Or Remove Non-Core Layers

These are the main non-core candidates:

- treat `adaptive MA` as non-core unless later backtests prove clear value
- treat `FVG / imbalance` as non-core and optional only
- do not let broad Wyckoff doctrine become the primary thesis engine

Rule:

- non-core layers must not override structure, location, trigger, invalidation, or risk

## 3. Narrow Wyckoff To The Right Role

Wyckoff should stay, but in a narrower and cleaner role.

Wyckoff should be:

- a separate historical-state module
- a slower context layer
- support for one concrete actionable setup:
  - `S5` Wyckoff spring with reclaim

Wyckoff should not become:

- the primary doctrine of the whole technical-analysis skill
- a replacement for structure-first thesis logic
- a justification for broad narrative reinterpretation of every chart

## 4. Research Source Priority For Wyckoff

For Wyckoff implementation planning:

- use `wyckoff-research-gpt.md` as the primary design reference
- treat `wyckoff-research-gemini.md` as a secondary research note only

Reason:

- the GPT document is more disciplined on determinism, confirmation delay, and backtest safety
- the Gemini document contains useful ideas, but is too expansive and too confident to be treated as canonical design

Accepted extraction direction:

- separate module
- deterministic or hybrid finite state machine
- right-edge and delayed-confirmation handling
- current cycle state
- recent segment history
- confidence and maturity
- bridge into TA mainly through `S5`

## 5. Update Official Plan And Doctrine Docs

The next documentation pass should update:

- `backtesting-and-system-design.md`
- `technical-analysis-approach-brief-for-validation.md`
- `wyckoff-historical-state-design.md`

These files should reflect:

- the frozen core doctrine
- the narrowed Wyckoff role
- the removal or demotion of non-core overlays
- the need for IDX-specific backtest realism

## 6. Add IDX-Specific Backtest Requirements

The backtest design must explicitly model exchange-specific constraints.

At minimum:

- session and auction structure
- ARB / ARA aware execution assumptions
- liquidity and board eligibility gate
- mandatory corporate-action handling for backtests
- comparison against simpler technical baselines

This is required because the target market is `IDX`, not a frictionless generic market.

## 7. Define The Required Simple Baselines

The full technical-analysis skill must be compared against:

- simple trend plus pullback baseline
- simple breakout plus volume baseline
- simple range-reclaim baseline

Purpose:

- test whether the full doctrine stack adds real decision value
- prevent complexity from surviving only because it sounds persuasive

## 8. Implementation Order

Implementation should proceed in this order:

1. clean and freeze doctrine in the docs
2. define the three simple backtest baselines
3. add IDX-specific backtest assumptions
4. add a liquidity gate for `60m` timing
5. define corporate-action-aware backtest behavior
6. only then implement the separate Wyckoff historical-state engine

## 9. Immediate Next Step

The immediate next step is:

- doc cleanup and doctrine freeze

Not:

- more overlays
- broader doctrine expansion
- more feature work before the backtest contract is tightened
