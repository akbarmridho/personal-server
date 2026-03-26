# Output Report Template

Use this file as an output contract, not a sample report. Keep outputs concise and mode-aware.

```markdown
## Fundamental Analysis: {SUBJECT}

**Business Quality:** {STRONG / ADEQUATE / WEAK}
**Financial Quality:** {CLEAN / MIXED / STRESSED}
**Valuation Verdict:** {UNDERVALUED / FAIR / OVERVALUED}
**Trap Risk:** {PASS / WARNING / FAIL}
**Thesis Posture:** {ACTIONABLE / WATCHLIST / AVOID}
**Confidence:** {HIGH / MEDIUM / LOW}

### Required Sections By Mode

#### FULL_REVIEW
- Overview: subject, scope, business model
- Quality: business quality, financial quality, key supporting metrics
- Ownership / governance: controller, float quality, concentration, overhang, minority alignment
- Industry / moat: structure, demand drivers, competitive edge or weakness
- Valuation: methods used, fair-value range or comparative frame, why the method set fits
- Red flags: major trap or accounting risks
- Evidence trace
- Investment view: posture, major risks, invalidation conditions

#### QUALITY_CHECK
- Overview
- Quality
- Red flags
- Evidence trace
- Investment view

#### VALUATION_ONLY
- Overview
- Valuation
- Key reasons the method set is valid or invalid
- Evidence trace
- Investment view

#### FILING_REVIEW
- Disclosure reviewed and why it was primary
- Key findings
- Impact on quality, valuation, solvency, or governance
- Evidence trace
- Investment view

#### OWNERSHIP_REVIEW
- Controller and affiliate map
- Beneficial-owner trail when supportable
- Holder taxonomy and largest holders
- Reported free float and effective float view
- Holding-composition history and ownership-base shift when material
- Float tightness and uncertainty
- Concentration metrics
- Entity cross-holdings when thesis-critical
- Overhang / supply-risk events
- Minority alignment
- Evidence trace
- Conclusion

#### SECTOR_REVIEW
- Sector boundary and demand drivers
- Industry economics and structure
- Strong-player vs weak-player traits
- Comparative valuation frame
- Key risks
- Evidence trace
- Conclusion

#### MECHANISM_REVIEW
- Mechanism under review and why it matters
- Economic and governance implications
- Impact on quality, valuation, solvency, dilution, or minority alignment
- Evidence trace
- Conclusion

### Ownership Structure Section

Include when ownership is material to the call:

- controller / affiliate summary
- beneficial-owner trail or explicit break in the disclosure chain
- reported free float
- effective float estimate or range
- float tightness state
- concentration (`top_3_pct`, `top_5_pct`, `HHI`) when available
- holding-composition shift when material and directly evidenced
- entity cross-holdings when controller or affiliate interpretation depends on them
- overhang / supply-risk summary
- minority alignment
- ownership uncertainty notes
- optional secondary narrative hooks only when strongly evidence-backed

### Evidence Trace
- primary evidence sources and why they were primary
- what is filing-backed
- what is backed by internal analysis or research documents
- what is backed by reported news documents
- what remains inference
```

## Caveat

Fundamental conclusion should explicitly state that timing and execution can still be affected by non-fundamental market factors.
