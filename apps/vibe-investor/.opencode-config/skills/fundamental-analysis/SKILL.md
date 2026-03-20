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
- ownership and shareholder-structure review
- sector or mechanism checks when the lens remains fundamental

This skill answers whether the business is worth owning, whether the financials are trustworthy, whether the price is reasonable, and what would break the view. It does not decide timing on its own.

Keep the boundary with `narrative-analysis` strict. This skill does not own catalyst-story framing, hype-cycle interpretation, priced-in narrative judgment, speculative premium analysis, or crowd-attention reads except where they directly change fundamental risk, funding risk, or valuation assumptions.

## Required Data And Fail-Fast

Use these sources according to the active mode.

| Source | Used for | If unavailable |
|--------|----------|----------------|
| `get-stock-profile` | Company identity, business model, segment context, industry anchor | Stop |
| `get-stock-keystats` | Ratio snapshot, market cap, valuation context, price anchor | Stop |
| `get-stock-financials` | Income statement, balance sheet, cash flow, trend work | Stop |
| `get-stock-governance` | Ownership, board/management, insider context, holder structure, holding-composition history | Stop |
| `get-shareholder-entity` | Cross-issuer holdings for a named holder entity | Stop when controller-network, affiliate, or cross-holding evidence is required by mode or question |
| `list-filing` + `get-filing` | Official annual-report, financial-statement, and disclosure review | Stop when official evidence is required by mode or question |
| `search-documents`, `list-documents`, `get-document` | Internal research, analysis, news, concall/public-expose summaries, and contextual evidence | Stop when contextual evidence is required by mode or question |

Core source contract:

- Call `get-stock-profile({ symbol })` once early in the run before deeper analysis.
- Use `list-filing` -> `get-filing` as the official filing path.
- Use `search-documents`, `list-documents`, and `get-document` for research and contextual evidence.
- Use `get-shareholder-entity({ entity_name })` only when a named holder materially enters the ownership conclusion and the symbol-level governance payload is not enough.
- Do not force every conclusion through filings. Analysis and news documents can be primary evidence when the task is sectoral, mechanism-led, or about externally reported developments.
- Do not treat contextual documents as a substitute for filings when the claim is specifically about accounting quality, audited numbers, disclosure quality, or formal capital-structure terms.
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
- For IDX ownership work, interpret controller, ultimate owner, reported free float, effective float, institutional and foreign holders, and custody-vs-active-holder context. Do not import promoter/FII/DII labels as-is.
- Distinguish reported free float from effective float. If the effective float cannot be estimated defensibly, output a range or a categorical float-tightness state with uncertainty notes rather than fake precision.
- Use a practical holder taxonomy: controller / affiliate, management / insider, strategic, domestic institution, foreign institution, passive / index, retail / others, nominee / custody / unclear, and treasury.
- Treat concentration, overhang, and minority alignment as first-class ownership outputs, not side commentary.
- Narrative hooks from ownership work are secondary outputs only. They can inform `narrative-analysis`, but this skill still owns structural interpretation, not story trading.
- All verdict and status values must match `enums-and-glossary.md`.

## Deterministic vs Agent-Judgment Boundary

| Check | Type | How |
|-------|------|-----|
| Revenue growth, margin trend, ROE/ROA/ROCE, asset turnover | Deterministic | Computed from `get-stock-financials` and `get-stock-keystats` |
| Current ratio, DER, ICR, net gearing, cash-flow-to-debt | Deterministic | Computed from `get-stock-financials` |
| OCF vs net profit, FCF, capex trend | Deterministic | Computed from financials |
| Valuation methods and MoS | Deterministic | Computed from financials, price context, and explicit assumptions |
| Controller identity and affiliate stake | Deterministic when disclosed, otherwise mixed | Extract from governance data and formal disclosures; aggregate affiliated holdings when defensible |
| Cross-holdings for a named holder entity | Deterministic | Use `get-shareholder-entity` when a specific holder materially matters |
| Reported free float | Deterministic | Compute from available governance/disclosure data using explicit exclusions when data supports it |
| Concentration metrics (`top_3`, `top_5`, `HHI`) | Deterministic | Compute from holder weights when holder list quality is sufficient |
| Holder-base shift | Deterministic | Read holding-composition history from `get-stock-governance`; describe only shifts directly evidenced by the returned series |
| Overhang events explicitly disclosed | Deterministic | Tender offers, rights issues, placements, lock-ups, pledges, insider sales from filings or formal disclosures |
| Business quality verdict | Agent judgment | Synthesize business model clarity, competitive position, and durability |
| Financial quality verdict | Agent judgment | Synthesize statement quality, trend health, and cash confirmation |
| Management and governance assessment | Agent judgment | Evaluate capital allocation, RPT quality, transparency, and holder alignment |
| Effective float estimate / range | Mixed | Start from reported float, then adjust for sticky or unclear blocks only when the evidence supports it |
| Holder-category classification | Mixed | Use house taxonomy, but mark uncertain classifications explicitly instead of forcing false precision |
| Minority alignment assessment | Agent judgment | Weigh controller power, affiliate structure, holder diversity, RPT risk, and float tightness |
| Ownership uncertainty | Agent judgment | State nominee ambiguity, missing beneficial-owner detail, or incomplete holder coverage clearly |
| Value trap assessment | Agent judgment | Weigh cheapness against structural weakness and accounting quality |
| Thesis posture | Agent judgment | Decide whether the name is actionable, watchlist-only, or avoid |

## Reference Routing

Use this file as the runtime owner. Do not load all references by default.

Always load:

- `references/core/enums-and-glossary.md`
- `references/core/output-report-template.md`

Reference sets by mode:

- `FULL_REVIEW`
- `references/core/financial-statements-framework.md`
- `references/core/valuation-methods-framework.md`
- `references/core/company-quality-framework.md`
- `references/core/shareholder-structure-framework.md`
- `references/core/risk-assessment-framework.md`
- `references/core/filing-review-framework.md`
- `QUALITY_CHECK`
  - `references/core/financial-statements-framework.md`
  - `references/core/company-quality-framework.md`
  - `references/core/shareholder-structure-framework.md`
  - `references/core/risk-assessment-framework.md`
- `VALUATION_ONLY`
  - `references/core/valuation-methods-framework.md`
  - `references/core/company-quality-framework.md`
- `FILING_REVIEW`
  - `references/core/company-quality-framework.md`
  - `references/core/shareholder-structure-framework.md` when control, dilution, float, or holder structure matters
  - `references/core/risk-assessment-framework.md`
  - `references/core/filing-review-framework.md`
- `OWNERSHIP_REVIEW`
  - `references/core/company-quality-framework.md`
  - `references/core/shareholder-structure-framework.md`
  - `references/core/risk-assessment-framework.md`
  - use `get-shareholder-entity` when holder-network or affiliate evidence is thesis-critical
  - `references/core/filing-review-framework.md` when formal disclosures materially drive the conclusion
- `SECTOR_REVIEW`
  - `references/core/valuation-methods-framework.md`
  - `references/core/company-quality-framework.md`
  - `references/core/risk-assessment-framework.md`
  - sector-specific references selected for the sector under review
- `MECHANISM_REVIEW`
  - `references/core/valuation-methods-framework.md`
  - `references/core/company-quality-framework.md`
  - `references/core/risk-assessment-framework.md`
  - `references/core/filing-review-framework.md` when formal disclosures matter
  - mechanism-specific references selected for the mechanism under review

Archive-only curation source:

- `references/core/valuation-book-doctrine.md`
  - doctrine hub for valuation curation
- `references/core/valuation-method-selection.md`
  - deeper curation note for method fit and exclusions
- `references/core/valuation-assumption-discipline.md`
  - deeper curation note for assumption quality and hard failure cases
- `references/core/valuation-sector-fit.md`
  - deeper curation note for sector and model-specific valuation fit
- `references/core/valuation-reconciliation-rules.md`
  - deeper curation note for handling divergence across methods
- `valuation-book-extract/`
  - source archive only for valuation curation work

Load sector or mechanism references only when thesis-critical:

- `references/sectors/banking-sector.md`
- `references/sectors/sharia-banking-sector.md`
- `references/sectors/coal-sector.md`
- `references/sectors/construction-sector.md`
- `references/sectors/oil-gas-sector.md`
- `references/sectors/property-sector.md`
- `references/sectors/retail-consumer-sector.md`
- `references/sectors/indonesia-gold-playbook.md`

## Workflow Spine

Runtime workflow owner. Defines canonical analysis order, phase gates, and final output requirements.

### Purpose Mode

- `FULL_REVIEW` - full business, financial, valuation, risk, and official-evidence review
- `QUALITY_CHECK` - business quality and financial quality review without a full valuation build
- `VALUATION_ONLY` - valuation-focused work with enough business context to avoid category mistakes
- `FILING_REVIEW` - disclosure-led review of annual report, notes, auditor remarks, public expose, or similar materials
- `OWNERSHIP_REVIEW` - controller map, holder structure, float quality, concentration, overhang, and minority-alignment review
- `SECTOR_REVIEW` - sector economics, industry structure, player-quality, and comparative fundamental review
- `MECHANISM_REVIEW` - fundamentally relevant mechanism review such as dilution, asset-quality cleaning, funding path, or capital-structure events

If the user request is ambiguous, default to `FULL_REVIEW`.

### Mode Requirements

| Mode | Minimum requirement |
|---|---|
| `FULL_REVIEW` | Use `get-stock-profile`, `get-stock-keystats`, `get-stock-financials`, `get-stock-governance`, and official filing retrieval when the claim depends on audited or formal disclosure evidence |
| `QUALITY_CHECK` | Produce explicit `business_quality`, `financial_quality`, `trap_risk`, and what would trigger a deeper valuation review |
| `VALUATION_ONLY` | Anchor the business model first and stop if the company economics are too unstable for a credible method set |
| `FILING_REVIEW` | State which filing or formal document was reviewed, why it is the correct primary disclosure, what changed, and what it changes |
| `OWNERSHIP_REVIEW` | Produce explicit controller / affiliate map, holder taxonomy view, reported vs effective float view, concentration, overhang, minority alignment, and uncertainty notes |
| `SECTOR_REVIEW` | Define sector boundary, demand drivers, value-chain logic, competition intensity, and strong-player vs weak-player traits using contextual evidence as first-class input |
| `MECHANISM_REVIEW` | Define the mechanism, why it matters fundamentally, what evidence best captures it, and whether it strengthens or weakens quality, valuation, solvency, minority alignment, or funding risk |

### Canonical Phase Order

`MODE` -> `DATA` -> `BUSINESS` -> `REVENUE` -> `PROFITABILITY` -> `CAPITAL_EFFICIENCY` -> `BALANCE_SHEET` -> `CASH_FLOW` -> `OWNERSHIP_GOVERNANCE` -> `INDUSTRY_MOAT` -> `VALUATION` -> `RED_FLAGS` -> `EVIDENCE_TRACE` -> `THESIS` -> `RESULT`

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

For `FILING_REVIEW`, stop if the selected disclosure is not the strongest available official source for the question and no reason is given.

For `SECTOR_REVIEW`, stop if the sector call is being made from one company and one document only.

For `MECHANISM_REVIEW`, stop if the mechanism is material but the evidence set does not include the document type that actually governs the mechanism.

For `OWNERSHIP_REVIEW`, stop if the ownership call depends on unavailable holder/disclosure evidence and no uncertainty-bounded conclusion can be made honestly.

| Phase | Core job | Stop / downgrade rule |
|---|---|---|
| `BUSINESS` | explain what the company does, how it makes money, and relevant mix | if the business cannot be explained clearly from evidence, lower confidence sharply |
| `REVENUE` | test growth quality, mix shift, and pricing-power context | if growth cannot be reconciled with segment mix, demand context, or working-capital evidence, elevate red-flag risk; acquisition-led or channel-stuffing-style growth is not high-quality growth |
| `PROFITABILITY` | test margin durability and one-off distortion | if profit quality depends materially on one-offs, do not treat margins as durable |
| `CAPITAL_EFFICIENCY` | test ROE, ROA, ROCE, and turnover quality | if returns are mainly leverage-driven or supported by a weak equity base, downgrade quality |
| `BALANCE_SHEET` | test liquidity, leverage, borrowings, reserves, and working capital | if solvency or refinancing risk is unclear, do not label financial quality `CLEAN` |
| `CASH_FLOW` | test OCF, FCF, CFO vs PAT, and capex burden | if cash does not validate profit over time, treat as a major quality warning |
| `OWNERSHIP_GOVERNANCE` | test controller clarity, holder structure, reported vs effective float, concentration, overhang, management, capital allocation, and RPT behavior | if holder interpretation is ambiguous, do not infer active smart-money behavior; if effective float is unclear, output a range or tightness state plus uncertainty note |
| `INDUSTRY_MOAT` | test industry cycle, structure, barriers, and advantage durability | if the industry structure is deteriorating, cap conviction; for `SECTOR_REVIEW`, this is a primary output |
| `VALUATION` | use a method set that fits the business and produce a fair-value view | stop on false precision, heroic assumptions, guidance-only builds, or single-fragile-method dependence; for `SECTOR_REVIEW`, valuation may be comparative rather than intrinsic |
| `RED_FLAGS` | test value-trap, manipulation, dilution, and weak-disclosure risk | multiple aligned red flags cannot be offset by cheapness alone |
| `EVIDENCE_TRACE` | separate filing-backed claims, contextual-document claims, news-backed claims, and inference | if a filing-led conclusion depends on unsupported commentary, stop; contextual documents can lead when the task is sectoral, mechanism-led, or about externally reported developments |
| `THESIS` | synthesize why the asset, sector, or mechanism is attractive or not, plus risks and invalidation | keep the section inside the fundamental lens; if the case depends more on storytelling than economics, keep posture conservative |

#### 15. RESULT

Produce output per `references/core/output-report-template.md`.

Final result must include:

- `business_quality`
- `financial_quality`
- `valuation_verdict`
- `trap_risk`
- `thesis_posture`
- `confidence`
- evidence trace with source class separation
- key invalidation conditions
- ownership structure summary when holder structure is material to the call

The result must allow combinations such as strong business but expensive, or cheap but likely a trap.

## Mode-Aware Valuation Behavior

### `FULL_REVIEW`

- choose a primary method and at least one secondary check when the business model allows it
- explain why the primary method best matches the business economics
- if methods diverge, explain the source before giving a verdict

### `VALUATION_ONLY`

- anchor the business model first to avoid category mistakes
- use the smallest credible method set, usually one primary method plus one sanity check
- stop if the economics are too unstable for a defensible valuation range

### `SECTOR_REVIEW`

- emphasize sector multiple ranges, method fit by sub-model, and what separates premium names from discount names
- comparative valuation is acceptable when full intrinsic builds are not the point
- do not force single-company target-price style outputs unless the request becomes company-specific

### `OWNERSHIP_REVIEW`

- prioritize controller clarity, holder taxonomy, float quality, concentration, overhang, and minority alignment over full valuation work
- use `get-shareholder-entity` only when one or more named holders materially affect controller, affiliate, or cross-holding interpretation
- use holding-composition history from `get-stock-governance` when ownership-base shifts matter structurally
- use float ranges or float-tightness states when effective float cannot be estimated precisely
- emit secondary narrative hooks only when there is a clear ownership change or supply event backed by evidence
- do not promise ownership-change history unless the data exists in the active evidence set

### `MECHANISM_REVIEW`

- use mechanism-fit math first: dilution, rights issue economics, SOTP, NAV, recap, LBO, or post-event capital structure
- value the mechanism's impact on minority holders, solvency, and per-share economics
- use trading multiples only as a secondary context after event math is clear

### `FILING_REVIEW`

- valuation is conditional and evidence-led
- only update valuation if the filing changes earnings power, asset value, capital structure, payout capacity, or risk assumptions
- state exactly which assumption changed and which valuation method is affected

## Execution Defaults

- For `FULL_REVIEW`, fetch the required core sources in parallel, then fetch official evidence.
- Load sector references only when the thesis materially depends on sector mechanics.
- Prefer annual plus quarterly statement views when the tool provides both.
- Reuse fetched data; do not re-query the same symbol without reason.
- If evidence is mixed, lower confidence and keep the final posture conservative.
