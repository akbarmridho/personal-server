---
name: fundamental-analysis
description: Fundamental-analysis helper for IDX stocks used to assess business quality, financial quality, valuation, governance, and value-trap risk with an explicit workflow spine.
---

## Scope

Use this skill to perform fundamental analysis for:

- full company review
- business and financial quality check
- valuation check
- filing-led review

This skill answers whether the business is worth owning, whether the financials are trustworthy, whether the price is reasonable, and what would break the view. It does not decide timing on its own.

## Required Data And Fail-Fast

Use these sources according to the active mode.

| Source | Used for | If unavailable |
|--------|----------|----------------|
| `get-stock-profile` | Company identity, business model, segment context, industry anchor | Stop |
| `get-stock-keystats` | Ratio snapshot, market cap, valuation context, price anchor | Stop |
| `get-stock-financials` | Income statement, balance sheet, cash flow, trend work | Stop |
| `get-stock-governance` | Ownership, board/management, insider context | Stop |
| `list-filing` + `get-filing` | Official annual-report, financial-statement, and disclosure review | Stop when official evidence is required by mode |
| `search-documents`, `list-documents`, `get-document` | Internal research, concall/public-expose summaries, contextual evidence | Stop only when this evidence was explicitly requested or selected as required scope |

Core source contract:

- Call `get-stock-profile({ symbol })` once early in the run before deeper analysis.
- Use `list-filing` -> `get-filing` as the official filing path.
- Use `search-documents`, `list-documents`, and `get-document` for research and contextual evidence, not as the primary filing path.
- If any required source for the selected mode fails, stop and report dependency failure.

## Core Runtime Rules

- Fundamentals are required but not sufficient in IDX. State clearly when timing can still be dominated by flow, narrative, or liquidity.
- Start with business model and earnings quality before valuation.
- Distinguish accounting profit from cash generation before calling a business high quality.
- Use a minimum 3-year trend view; prefer 5-10 years for cyclical businesses.
- Use 2-3 valuation methods for `FULL_REVIEW` and `VALUATION_ONLY` unless the business model cleanly rules methods out.
- Investigate divergence across methods instead of averaging blindly.
- Use conservative assumptions over management promotion.
- Treat value-trap and manipulation diagnostics as hard filters, not side commentary.
- For IDX ownership work, interpret controller, ultimate owner, free float, institutional and foreign holders, and custody-vs-active-holder context. Do not import promoter/FII/DII labels as-is.
- All verdict and status values must match `enums-and-glossary.md`.

## Deterministic vs Agent-Judgment Boundary

| Check | Type | How |
|-------|------|-----|
| Revenue growth, margin trend, ROE/ROA/ROCE, asset turnover | Deterministic | Computed from `get-stock-financials` and `get-stock-keystats` |
| Current ratio, DER, ICR, net gearing, cash-flow-to-debt | Deterministic | Computed from `get-stock-financials` |
| OCF vs net profit, FCF, capex trend | Deterministic | Computed from financials |
| Valuation methods and MoS | Deterministic | Computed from financials, price context, and explicit assumptions |
| Business quality verdict | Agent judgment | Synthesize business model clarity, competitive position, and durability |
| Financial quality verdict | Agent judgment | Synthesize statement quality, trend health, and cash confirmation |
| Management and governance assessment | Agent judgment | Evaluate capital allocation, RPT quality, transparency, and holder alignment |
| Value trap assessment | Agent judgment | Weigh cheapness against structural weakness and accounting quality |
| Thesis posture | Agent judgment | Decide whether the name is actionable, watchlist-only, or avoid |

## Reference Routing

Use this file as the runtime owner. Do not load all references by default.

Always load:

- `references/enums-and-glossary.md`
- `references/output-report-template.md`

Reference sets by mode:

- `FULL_REVIEW`
  - `references/financial-statements-framework.md`
  - `references/valuation-methods-framework.md`
  - `references/company-quality-framework.md`
  - `references/risk-assessment-framework.md`
- `QUALITY_CHECK`
  - `references/financial-statements-framework.md`
  - `references/company-quality-framework.md`
  - `references/risk-assessment-framework.md`
- `VALUATION_ONLY`
  - `references/valuation-methods-framework.md`
  - `references/company-quality-framework.md`
- `FILING_REVIEW`
  - `references/company-quality-framework.md`
  - `references/risk-assessment-framework.md`

Load sector or mechanism references only when thesis-critical:

- `references/banking-sector.md`
- `references/bank-ckpn-writeoff-overdue-diagnostics.md`
- `references/sharia-banking-sector.md`
- `references/coal-sector.md`
- `references/construction-sector.md`
- `references/oil-gas-sector.md`
- `references/property-sector.md`
- `references/retail-consumer-sector.md`
- `references/indonesia-gold-playbook.md`

## Workflow Spine

Runtime workflow owner. Defines canonical analysis order, phase gates, and final output requirements.

### Purpose Mode

- `FULL_REVIEW` - full business, financial, valuation, risk, and official-evidence review
- `QUALITY_CHECK` - business quality and financial quality review without a full valuation build
- `VALUATION_ONLY` - valuation-focused work with enough business context to avoid category mistakes
- `FILING_REVIEW` - disclosure-led review of annual report, notes, auditor remarks, public expose, or similar materials

If the user request is ambiguous, default to `FULL_REVIEW`.

### Mode Requirements

#### `FULL_REVIEW`

Must use `get-stock-profile`, `get-stock-keystats`, `get-stock-financials`, `get-stock-governance`, and official filing retrieval via `list-filing` -> `get-filing`.

#### `QUALITY_CHECK`

Must produce explicit `business_quality`, `financial_quality`, `trap_risk`, and what would trigger a deeper valuation review.

#### `VALUATION_ONLY`

Must still anchor the business model first with `get-stock-profile`. Stop if the company economics are too unstable for a credible valuation method set.

#### `FILING_REVIEW`

Must state exactly which filing or document was reviewed, what changed, and whether it changes business quality, financial quality, valuation, or risk.

### Canonical Phase Order

`MODE` -> `DATA` -> `BUSINESS` -> `REVENUE` -> `PROFITABILITY` -> `CAPITAL_EFFICIENCY` -> `BALANCE_SHEET` -> `CASH_FLOW` -> `OWNERSHIP_GOVERNANCE` -> `INDUSTRY_MOAT` -> `VALUATION` -> `RED_FLAGS` -> `OFFICIAL_EVIDENCE` -> `THESIS` -> `RESULT`

### Phase Contracts

#### 1. MODE

Define the job and scope. Output: `purpose_mode`, `analysis_scope`, `required_evidence`.

#### 2. DATA

Fetch required sources in parallel where possible.

Required early anchor:

- `get-stock-profile({ symbol })`

Core parallel set:

- `get-stock-keystats`
- `get-stock-financials`
- `get-stock-governance`

Official evidence route when required:

- `list-filing`
- `get-filing`

Context route when required:

- `search-documents` or `list-documents`
- `get-document`

Stop: if a required source for the selected mode fails or returns unusable coverage.

#### 3. BUSINESS

Answer:

- what the company does
- how it makes money
- product, segment, and geographic mix when material
- whether the business is simple enough to understand and structurally relevant

Stop: if the business model cannot be explained clearly from available evidence, lower confidence sharply and avoid strong conclusions.

#### 4. REVENUE

Assess:

- sales growth quality
- segment growth and mix shift
- geographic exposure when material
- price, volume, and pricing-power context where available

Stop: if reported growth cannot be reconciled with segment mix, end-demand context, or working-capital evidence, elevate red-flag risk.

#### 5. PROFITABILITY

Assess:

- gross, operating, EBITDA, and net profit trend when meaningful for the sector
- margin durability
- one-off distortion risk

Stop: if profit quality depends materially on one-offs, do not treat the margin profile as durable.

#### 6. CAPITAL_EFFICIENCY

Assess:

- ROE
- ROA
- ROCE when meaningful
- asset turnover

Stop: if return ratios look strong only because of leverage, buybacks against weak economics, or a tiny equity base, downgrade quality.

#### 7. BALANCE_SHEET

Assess:

- liquidity
- leverage
- borrowings trend
- reserves or retained-earnings buildup
- working-capital quality

Stop: if solvency or refinancing risk is unclear, do not label financial quality as `CLEAN`.

#### 8. CASH_FLOW

Assess:

- OCF trend
- FCF trend
- CFO vs PAT alignment
- capex intensity and reinvestment burden

Stop: if cash generation fails to validate accounting profit over time, treat as a major quality warning.

#### 9. OWNERSHIP_GOVERNANCE

Assess:

- controller and ultimate-owner clarity
- free-float and holder structure
- institutional and foreign-holder context
- custody-vs-active-holder interpretation
- management quality, capital allocation, RPT behavior, and governance record

Stop: if holder interpretation is ambiguous, do not infer smart-money accumulation from nominee or custody names.

#### 10. INDUSTRY_MOAT

Assess:

- industry cycle and tailwinds
- competitive intensity
- barriers to entry
- brand, cost, distribution, network, or regulatory advantages

Stop: if the company is good but the industry structure is deteriorating, cap conviction.

#### 11. VALUATION

Use 2-3 methods when the mode requires valuation. Select methods that fit the business.

Must produce:

- method set used
- fair-value range
- margin of safety
- `valuation_verdict`

Stop: if the business model does not support a credible method set, state that directly and avoid false precision.

#### 12. RED_FLAGS

Check:

- value-trap pattern
- manipulation signals
- dilution and funding risk
- weak disclosures or accounting-quality concerns

Must produce explicit `trap_risk`.

#### 13. OFFICIAL_EVIDENCE

When official evidence is in scope, review the latest relevant annual-report, audited statements, notes, auditor remarks, public expose, or similar disclosures from `list-filing` -> `get-filing`.

When contextual evidence is in scope, add internal research or transcript-like materials through `search-documents` / `get-document`.

Must separate:

- what is directly supported by official filings
- what is supported by contextual research
- what remains inference

#### 14. THESIS

Synthesize:

- why the business is attractive or not
- why the current price is attractive or not
- key triggers
- major risks
- what would change the view

#### 15. RESULT

Produce output per `references/output-report-template.md`.

Final result must include:

- `business_quality`
- `financial_quality`
- `valuation_verdict`
- `trap_risk`
- `thesis_posture`
- `confidence`
- key invalidation conditions

The result must allow combinations such as strong business but expensive, or cheap but likely a trap.

## Execution Defaults

- For `FULL_REVIEW`, fetch the required core sources in parallel, then fetch official evidence.
- Load sector references only when the thesis materially depends on sector mechanics.
- Prefer annual plus quarterly statement views when the tool provides both.
- Reuse fetched data; do not re-query the same symbol without reason.
- If evidence is mixed, lower confidence and keep the final posture conservative.
