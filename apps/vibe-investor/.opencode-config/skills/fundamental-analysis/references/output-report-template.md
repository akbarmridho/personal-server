# Output Report Template

Use this structure for final fundamental outputs.

```markdown
## Fundamental Analysis: {SYMBOL}

**Verdict:** {UNDERVALUED / FAIR / OVERVALUED}
**Confidence:** {HIGH / MEDIUM / LOW}

### A. Company Overview
- Ticker, date, sector, price, market cap
- Business model summary (1-2 sentences)

### B. Financial Health Summary
| Category | Status | Key metric | Trend |
|----------|--------|------------|-------|
| Liquidity | HEALTHY/WARNING/DANGER | Current Ratio | Improving/Stable/Weakening |
| Solvency | ... | DER, ICR | ... |
| Profitability | ... | ROE, NPM | ... |
| Cash Flow | ... | OCF/Net Profit | ... |
| Earnings Quality | ... | Cash collection quality | ... |

### C. Valuation Assessment
| Method | Intrinsic value | MoS | Signal |
|--------|------------------|-----|--------|
| Method 1 | Rp X | X% | UNDERVALUED/FAIR/OVERVALUED |
| Method 2 | Rp X | X% | ... |
| Method 3 | Rp X | X% | ... |

Consensus fair-value range: {Rp X - Rp Y}

### D. Company Quality
- Moat assessment: WIDE/NARROW/NONE
- Management and ownership quality
- Growth path and rerating plausibility

### E. Risk Assessment
- Value trap check: PASS/WARNING/FAIL
- Manipulation risk: PASS/WARNING/FAIL
- IDX 2.0 risk score: {X/12}
- Altman Z context
- Top 3 risk factors

### F. What Changes This View
- 2-3 specific invalidation or confirmation triggers
```

## Caveat

Fundamental conclusion should explicitly state that timing and execution can still be affected by non-fundamental market factors.

## Implementation Note

Enforcement: agent workflow during Phase 3 (see SKILL.md). This template is the contract for the final output. Every section must be filled when producing a full fundamental analysis. All verdict, status, and label values must match `enums-and-glossary.md`.
