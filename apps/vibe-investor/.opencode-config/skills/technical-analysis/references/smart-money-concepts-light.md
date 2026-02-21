# Smart Money Concepts Light

## Objective

Provide an evidence-first SMC layer that can be used with the technical-analysis skill without replacing core risk and invalidation discipline.

## Scope

This reference is active when lens is `SMC_ICT_LIGHT` or when user explicitly asks for SMC checks.

## Core Modules

1. Structure hierarchy: internal vs swing breaks.
2. BOS, CHOCH, and CHOCH+ (momentum-failure variant).
3. Order Block (OB) and Breaker Block.
4. FVG and Inversion FVG (IFVG).
5. Liquidity pools: EQH/EQL and sweep/deviation outcomes.
6. Premium/Discount zoning on active dealing range.
7. Optional MTF overlay context (HTF POI on LTF execution).

## Rules

- `R-SMC-01` Swing structure has higher decision weight than internal structure.
- `R-SMC-02` CHOCH is warning; reversal requires confirmation BOS.
- `R-SMC-03` CHOCH+ requires failed extension first, then opposite break.
- `R-SMC-04` OB validity requires displacement and local structure shift, not candle shape alone.
- `R-SMC-05` Breaker Block is an OB that failed and flipped polarity.
- `R-SMC-06` IFVG is a violated FVG that later acts as opposite-direction POI.
- `R-SMC-07` EQH/EQL are liquidity pools; sweep must be evaluated for acceptance vs rejection.
- `R-SMC-08` Premium/Discount is context filter, not standalone entry trigger.
- `R-SMC-09` SMC modules may refine entries; they do not override risk protocol.

## Parameter Guidance

Use stable defaults and report parameters used.

- swing length: 2 to 5 candles (larger for slower symbols)
- eqh/eql tolerance: ATR-based threshold (for example 0.10 to 0.25 ATR)
- fvg filter: minimum relative gap size to reduce noise
- ob lookback: recent impulse windows only

## Required Outputs (When SMC Active)

- `structure_weighted_bias`: swing-led conclusion with internal context note
- `structure_status`: `no_signal`, `choch_only`, `choch_plus_bos_confirmed`
- `liquidity_event`: `none`, `eqh_swept`, `eql_swept`, `accepted_after_sweep`, `rejected_after_sweep`
- `pd_zone`: `premium`, `discount`, `equilibrium`
- `smc_confluence_used`: list of modules actually used (or empty)

## Trace Requirements

Include evidence for each used module:

- structure breaks with timestamps and levels
- OB/Breaker zone bounds and mitigation/violation state
- FVG/IFVG bounds and reaction result
- EQH/EQL levels and sweep candle evidence
- Premium/Discount range anchors and equilibrium

If a module is not used, do not fabricate placeholders.

## Implementation Note

Deterministic SMC helper outputs (EQH/EQL and premium-discount context) are implemented in:

- Module: `smc`
- Script: `scripts/build_ta_context.py`
