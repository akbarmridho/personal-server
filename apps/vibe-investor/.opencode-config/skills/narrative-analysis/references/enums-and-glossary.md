# Enums And Glossary

## Objective

Single source of truth for shared verdicts, scores, and labels used across narrative-analysis references and the output report template.

## Narrative Verdict

- `STRONG`: fresh, supported, catalyst-active
- `MODERATE`: real story but partially priced or delayed catalyst
- `WEAK`: stale or weakly supported narrative
- `BROKEN`: no credible narrative edge

## Confidence

- `HIGH`
- `MEDIUM`
- `LOW`

## Narrative Type

- `Thematic play`: riding macro/sector theme
- `Earnings turnaround`: recovery from weak base
- `Corporate action`: structural event (M&A, spin-off, rights issue)
- `Sector rotation`: capital rotation across sectors
- `Policy beneficiary`: regulation-driven uplift
- `MSCI/index inclusion`: forced-buying narrative
- `Conglomerate rerating`: group restructuring story
- `Dividend play`: payout-driven demand
- `Speculative/hype`: story-first, weak numbers

## Narrative Strength Score (0-15)

Five factors scored 0-3 each:

- Freshness: 0 stale, 3 brand new
- Market awareness: 0 everyone knows, 3 under-owned
- Fundamental support: 0 pure hype, 3 strong evidence
- Catalyst proximity: 0 none, 3 imminent (<1 month)
- Flow alignment: 0 visible distribution, 3 clear accumulation

## Failure Risk Score (0-3)

- `0` Low: multiple independent catalysts, resilient thesis
- `1` Moderate: 2-3 dependencies with partial redundancy
- `2` High: single-key catalyst, binary setup
- `3` Critical: visible cracks, narrative already degrading

## Business Excitement

- `high`
- `moderate`
- `low`

## Owner Character

- `aligned`: long-term value build, transparent, minority-friendly
- `neutral`: no strong signal either way
- `extractive`: cash extraction behavior, aggressive control-first

## Narrative Freshness

- `new`
- `developing`
- `aging`
- `stale`

## Market Awareness

- `unknown`
- `niche`
- `broad`
- `consensus`

## Priced-In Status

- `no`
- `partial`
- `full`

## Haluasi Premium Band

- `Moderate`: re-rating is explainable, softer mean reversion
- `High`: narrative dominates numbers, -30% to -50% drawdown on break
- `Extreme`: pure imagination + crowding, -50% to -80% tail risk

## Implementation Note

Enforcement: agent uses these values when filling the output report template. All verdict, score, and label fields in the report must use values from this file. Reference files use these labels but do not redefine them.
