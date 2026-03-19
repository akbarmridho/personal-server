# Deep Research Prompt: Broker-Flow Method For Indonesian Stocks

You are doing deep research to help design a broker-flow analysis system for Indonesian stocks.

Your job is not to invent a new style from scratch.

Your job is to research how similar concepts are defined and computed in practice, then recommend which parts are robust enough for deterministic implementation given the actual raw data contract below.

## Context

This system analyzes broker-flow separately from chart-based technical analysis.

The intended ownership split is:

- chart structure, support/resistance, trend state, setup families, trigger, confirmation, stop, target, and trade management belong to technical analysis
- broker-flow, sponsor quality, accumulation/distribution lean, persistence, concentration, divergence, trust, and lead-vs-confirm interpretation belong to flow analysis

This means:

- flow analysis must not become a second chart-analysis engine
- flow analysis must not emit trade entry signals, stop levels, target ladders, or chart setup IDs
- flow analysis may compare itself to price action only to describe `lead`, `confirm`, `warning`, or `unclear`

## Product Doctrine To Preserve

The intended broker-flow doctrine is:

1. Start with gross, not net
2. Verdict is weighted evidence, not trade permission
3. Broker flow can lead price
4. Divergence is warning or setup context, not a trigger by itself
5. Sponsor quality matters more than raw direction alone
6. Correlation and active regime determine how much trust to give the flow signal
7. Concentration and persistence matter more than one-off spikes

Do not drift away from those principles unless your research finds a strong reason and you explain it clearly.

## Actual Raw Data Contract Available

Assume the system has access to these raw inputs:

### 1. Daily Broker-Flow Series

For each trading day, there is a daily broker summary snapshot with:

- top 25 buy-side brokers
- top 25 sell-side brokers
- each broker row includes:
  - broker code
  - traded value
  - traded lots
  - average execution price
  - frequency / number of trades

Filters are fixed to:

- all investors
- regular market
- gross mode

Important:

- this is daily broker summary data, not tick-level tape
- it is top-25 per side, not necessarily the full broker universe

### 2. Daily OHLCV

For the same stock, daily OHLCV includes:

- date
- open
- high
- low
- close
- volume
- value
- frequency
- `soxclose` as a market-cap proxy

### 3. Market Cap Classification

Market cap is part of the current iteration and should be treated as fixed, not open-ended.

Use latest `soxclose` and classify with these buckets:

- `large`: market cap > Rp 10 Trillion
- `mid`: market cap Rp 1 Trillion to 10 Trillion
- `small`: market cap Rp 100 Billion to 1 Trillion
- `micro`: market cap < Rp 100 Billion

### 4. Liquidity Classification

Liquidity should be treated with these buckets based on average daily traded value:

- `high`: > Rp 50 Billion
- `medium`: Rp 10 Billion to 50 Billion
- `low`: Rp 1 Billion to 10 Billion
- `very_low`: < Rp 1 Billion

## Constraints

You must explicitly account for these limitations:

- no tick-by-tick broker tape
- no order book
- no full market-wide broker ledger if top-25 truncates the tail
- no authority to redefine chart structure, setup, or execution rules

If a concept cannot be computed well from these inputs, say so directly.

## What Needs Research

Research the following concepts and determine:

- what they mean
- whether they are standard, semi-standard, or product-specific
- how they are commonly computed
- what raw inputs are required
- whether they are realistically computable from the available data above
- what acceptable approximation exists if exact computation is not possible
- whether the concept is strong enough for deterministic v1

### A. Core Metrics

1. `CADI`
2. broker-side `VWAP` execution quality
3. `GVPR` / gross volume participation ratio
4. B/S spread and spread trend
5. top buyer share
6. top seller share
7. sponsor-quality interpretation from gross broker summary

### B. Advanced Signals

8. smart-money-style composite score (`SMT`-like concept)
9. broker persistence across days
10. concentration asymmetry
11. buy-side and sell-side Gini concentration
12. flow-price correlation
13. divergence between broker flow and price
14. wash-risk / anomaly-risk proxies

### C. Trust / Regime

15. how liquidity should affect trust
16. how market cap should affect trust
17. when broker-flow signals are more trustworthy vs less trustworthy
18. whether 30 trading days or 60 trading days is the better default primary window

### D. Implementation Decisions

19. which concepts are robust enough for deterministic v1
20. which concepts should stay heuristic only
21. which concepts should be deferred until better data exists

## Critical Research Questions

Answer these explicitly.

### 1. `CADI`

- What is the actual formula or family of formulas used in practice?
- Is it based on top-N net brokers, all visible brokers, or something else?
- How should trend or slope be computed?
- What window is most defensible?

### 2. Broker-Side VWAP

- How should `buy_avg_vs_vwap` and `sell_avg_vs_vwap` be interpreted?
- What denominator is most defensible:
  - session VWAP
  - selected-window VWAP
  - daily VWAP
- What thresholds separate aggressive vs passive execution?

### 3. `GVPR`

- How should GVPR be computed when only top-25 per side is visible?
- What denominator is correct or least bad?
- How biased is the result under partial broker visibility?

### 4. Smart-Money Composite / `SMT`

- Is there a credible standardized way to do this?
- If not, what are the most defensible components?
- Which weights are research-backed vs product heuristics?

### 5. Persistence

- How should persistence be measured:
  - consecutive same-side streaks
  - weighted persistence by traded value
  - recurrence concentration
  - something else
- How should the metric degrade when the same broker appears on both sides?

### 6. Concentration

- Is Gini the right metric here?
- Would HHI, entropy, top-k share, or another concentration measure be better?
- What thresholds are credible for `buy_heavy`, `sell_heavy`, or `balanced`?

### 7. Flow-Price Correlation

- Which price series should be used:
  - close-to-close returns
  - ranked returns
  - forward returns
  - something else
- Which flow series should be used:
  - net flow
  - CADI
  - SMT-like score
  - normalized imbalance
- Which method is more appropriate:
  - Pearson
  - Spearman
  - rolling R²
  - rank IC

### 8. Divergence

- How should bullish and bearish divergence be defined?
- Against which flow series should divergence be measured?
- How many bars or sessions are needed before divergence is meaningful?

### 9. Wash Risk / Anomaly Risk

- What can actually be inferred from daily top-25 broker summary data?
- What cannot be inferred without tick-level or order-book data?
- Which anomaly proxies are realistic enough for v1?

### 10. Sponsor Quality

- What separates:
  - strong sponsor
  - constructive sponsor
  - mixed / noisy participation
  - weak sponsor
- Is sponsor quality mostly about concentration, persistence, favorable execution, or a combination?

### 11. Trust Regime

- How should trust be adjusted by:
  - liquidity
  - market cap
  - flow-price correlation
- What conditions make broker flow:
  - `lead_capable`
  - `support_only`
  - `secondary`
  - `unreliable`

### 12. Window Choice

- Is ~30 trading days enough for stable readings?
- Which concepts materially improve with 60 trading days?
- Should different metrics use different windows?

## Output Requirements

Return the research in this exact structure.

### 1. Executive Summary

- 5 to 10 bullets
- strongest takeaways
- what is robust
- what is shaky
- what should be deferred

### 2. Concept Table

For every concept, provide:

- concept
- concise definition
- standard / semi-standard / product-specific
- required raw inputs
- recommended computation
- acceptable approximation with current data
- recommended window
- source quality
- confidence
- decision: `use now` | `use with caution` | `defer`

### 3. Formula Notes

For every concept with a meaningful formula or algorithm:

- formula or algorithm outline
- normalization notes
- rolling-window notes
- how to adapt it to top-25-per-side daily broker summary

### 4. Window Recommendation

Provide:

- recommended default primary window
- recommended secondary comparison windows
- justification

### 5. V1 Deterministic Set

Recommend the exact subset to compute first in a deterministic broker-flow context packet.

### 6. Deferred Set

List concepts that should wait for:

- better data
- more research
- or later product maturity

### 7. References

For every major conclusion:

- provide source links
- label the source type:
  - official docs
  - exchange / broker platform docs
  - academic paper
  - practitioner article
  - forum / community source

## Source Quality Rules

Prioritize sources in this order:

1. official exchange / broker / platform docs
2. academic or technical papers
3. credible practitioner writeups with explicit formulas
4. community/forum explanations only when better sources do not exist

For every major conclusion, explicitly say whether it is:

- strongly sourced
- weakly sourced
- inferred

## Important Guardrails

- do not bluff formulas that are not actually documented
- do not present heuristics as canonical if they are not
- do not let flow analysis become chart analysis
- do not output trade-entry, stop, target, or setup-family logic
- keep the result implementation-oriented

## Final Objective

At the end, the research should let us answer:

1. which broker-flow concepts are directly implementable
2. which concepts need heuristics or proxies
3. which concepts should be deferred
4. what the first deterministic broker-flow context packet should compute
