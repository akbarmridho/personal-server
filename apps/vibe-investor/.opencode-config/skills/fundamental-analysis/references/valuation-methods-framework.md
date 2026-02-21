# Valuation Methods Framework

## Core Concepts

- Market price reflects current positioning and sentiment.
- Intrinsic value is a fundamental anchor, not a timing trigger.
- Margin of Safety (MoS) = (IV - Price) / IV.

MoS interpretation:

- <0%: overvalued
- 0-30%: fair
- >30%: undervalued (subject to confirmation)
- High-risk names may require around 50% MoS.

## Method Selection Guide

| Method | Best for | Avoid when |
|--------|----------|------------|
| EPS Discounted | Consistent positive earnings | Erratic or negative earnings |
| Equity Growth | Positive equity trend with uneven earnings | Negative or shrinking equity |
| ROE-PBV | Stable and healthy ROE | Volatile or weak ROE |
| DCF | Predictable positive FCF | Negative/unstable FCF |
| DDM | Stable dividend payers | No dividend discipline |
| Asset-based NAV | Asset-heavy companies | Service-light asset models |

## Method Notes

### EPS Discounted

1. Compute BVPS and EPS.
2. Estimate earnings growth (cap around 15%).
3. Project 5 years.
4. Discount projected earnings.
5. IV = BVPS + discounted projected EPS total.

### Equity Growth

1. Estimate ROE.
2. Compound BVPS over 5 years.
3. Use projected BVPS as IV anchor.

### ROE-PBV

- Practical mapping: fair PBV around ROE x 10.
- Low PBV with weak ROE can still be a value trap.

### DCF

1. Estimate FCF.
2. Estimate WACC.
3. Set conservative terminal growth (<WACC, often <=4%).
4. Discount explicit period + terminal value.

### DDM

- Use for stable payout businesses.
- Validate payout sustainability before applying formula.

### Asset-based NAV

- Revalue core assets at realistic market assumptions.
- Subtract net debt.
- Apply sector-appropriate discount where relevant.

## Cross-Validation Rules

- Use 2-3 methods minimum.
- Investigate major divergence between methods.
- Favor conservative assumptions over promotional guidance.
- Flag valuation barriers: negative equity, persistent losses, manipulation signals, pre-revenue dependence.

## Implementation Note

Enforcement: agent workflow during Phase 2 step 2 (see SKILL.md). Method selection is agent judgment based on business characteristics. MoS calculation and per-method IV computation are deterministic. Cross-validation (2-3 methods minimum) is required. Verdict values (`UNDERVALUED`/`FAIR`/`OVERVALUED`) must match `enums-and-glossary.md`.
