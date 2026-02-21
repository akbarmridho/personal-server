---
name: fundamental-analysis
description: Fundamental analysis for IDX stocks, including financial health checks, multi-method valuation, company quality assessment, sector context, and risk scoring.
---

## How To Use This Skill

Use this file as the entrypoint. Do not load all references by default.

1. Classify the request (full fundamental review, valuation-only, risk check, or sector deep-dive).
2. Load only the relevant references.
3. Collect required MCP data in parallel.
4. Execute sequential analysis phases.
5. Return a structured verdict with confidence and invalidation conditions.

## Reference Index And Topic Ownership

| File | Topics |
|------|--------|
| [enums-and-glossary.md](references/enums-and-glossary.md) | Shared verdicts, statuses, labels, risk score interpretation |
| [financial-statements-framework.md](references/financial-statements-framework.md) | Balance sheet, income statement, cash flow checks, advanced ratios, trend requirements |
| [valuation-methods-framework.md](references/valuation-methods-framework.md) | MoS, EPS discounted, equity growth, ROE-PBV, DCF, DDM, NAV, cross-validation |
| [company-quality-framework.md](references/company-quality-framework.md) | Business model, moat, industry lifecycle, pricing power, ownership/governance, management, growth story |
| [risk-assessment-framework.md](references/risk-assessment-framework.md) | Value trap detection, manipulation signals, IDX 2.0 risk score, Altman Z, pre-buy checklist |
| [output-report-template.md](references/output-report-template.md) | Final report structure and section contract |
| [banking-sector.md](references/banking-sector.md) | CASA, NIM, NPL, LDR, CAR, BOPO, funding structure, bank valuation |
| [bank-ckpn-writeoff-overdue-diagnostics.md](references/bank-ckpn-writeoff-overdue-diagnostics.md) | CKPN vs write-off mechanics, kolektibilitas, improvement-vs-cleaning diagnostics |
| [sharia-banking-sector.md](references/sharia-banking-sector.md) | Sharia contracts (murabahah, ijarah, mudharabah, musyarakah), FDR, NPF, PSR, DPS governance |
| [coal-sector.md](references/coal-sector.md) | Strip ratio, GAR/NAR, HBA/ICI/Newcastle, DMO, permits, player taxonomy |
| [construction-sector.md](references/construction-sector.md) | New contracts, order book, burn rate, DER norms, turnkey vs progress payment, BUMN Karya lessons |
| [oil-gas-sector.md](references/oil-gas-sector.md) | Value chain, PSC basics, benchmarks (ICP/MOPS/Brent), IDX proxy mapping, narrative proxies |
| [property-sector.md](references/property-sector.md) | Landbank, PSAK 72 revenue lag, adjusted DER, NAV valuation, historical NAV discount |
| [retail-consumer-sector.md](references/retail-consumer-sector.md) | CCC, DIO/DSO/DPO, SSSG, margin-vs-volume, seasonality |
| [indonesia-gold-playbook.md](references/indonesia-gold-playbook.md) | Gold value chain, mining vs trading model, reserves/resources, production/cash cost data, refinery capacity |
| This file (SKILL.md) | Workflow, data sources, operating rules, deterministic-vs-judgment boundary |

## Data Sources And Fail-Fast

| Source | Used for | If unavailable |
|--------|----------|----------------|
| `get-stock-keystats` | Ratios, key stats, price context | Stop |
| `get-stock-financials` | Income statement, balance sheet, cash flow (quarterly/annual) | Stop |
| `get-stock-governance` | Ownership, management, insider context | Stop |
| `search-documents`, `list-documents`, `get-document` | Filings, research, disclosures | Stop |

Stop: if fetch fails, stop the task and report dependency failure.

## Operating Rules

- Fundamentals are required but not sufficient in IDX. Keep conclusions explicit about where non-fundamental factors may dominate timing.
- Use 2-3 valuation methods minimum, then cross-check for divergence.
- Distinguish accounting profit from cash generation before issuing a verdict.
- Minimum 3-year trend view; prefer 5-10 years for cyclical businesses.
- Favor conservative assumptions over promotional guidance.
- Always include top risks and what would change the assessment.
- All verdict and status values must match `enums-and-glossary.md`.

## Deterministic vs Agent-Judgment Boundary

| Check | Type | How |
|-------|------|-----|
| Current ratio, DER, ICR | Deterministic | Computed from `get-stock-financials` |
| OCF/Net Profit divergence | Deterministic | Computed from financials |
| Altman Z-Score | Deterministic | Computed from financials |
| Valuation methods (EPS discounted, DCF, etc.) | Deterministic | Computed from financials + assumptions |
| MoS calculation | Deterministic | (IV - Price) / IV |
| IDX 2.0 risk score components | Agent judgment | Synthesize flow, narrative, liquidity, dilution risk |
| Moat assessment | Agent judgment | Evaluate competitive position, margin durability, market share |
| Value trap vs genuine value | Agent judgment | Weigh earnings quality, trend, and structural position |
| Thesis quality and conviction | Agent judgment | Synthesize all inputs into overall view |
| Management quality assessment | Agent judgment | Evaluate capital allocation, RPT quality, transparency |

## Sector And Mechanism Routing

Use this routing when sector or mechanism detail is thesis-critical.

1. Identify the exact sector or mechanism required by the thesis.
2. Load only the matching specialized references.
3. Apply sector/mechanism-specific checks before final verdict.

Routing defaults:

- Holder interpretation and custody-vs-active checks: `company-quality-framework.md`
- Bank asset-quality mechanics: `bank-ckpn-writeoff-overdue-diagnostics.md`
- Sector deep dives: banking, sharia-banking, coal, construction, oil-gas, property, retail-consumer, gold playbook references

## Workflow

### Phase 1: Parallel Data Collection

Run in parallel:

- `get-stock-keystats`
- `get-stock-financials` (income-statement, balance-sheet, cash-flow as needed)
- `get-stock-governance`
- `search-documents` (if filings/research context is relevant)

### Phase 2: Sequential Analysis

1. Financial statements health check (load `financial-statements-framework.md`).
2. Valuation with 2-3 methods minimum (load `valuation-methods-framework.md`).
3. Company quality and moat assessment (load `company-quality-framework.md`).
4. Risk assessment and trap detection (load `risk-assessment-framework.md`).
5. Sector-specific context check (load matching sector reference if thesis-critical).

### Phase 3: Synthesis

Produce output per `output-report-template.md`:

- Fair-value range
- Margin of safety view
- Fundamental verdict: `UNDERVALUED`, `FAIR`, or `OVERVALUED`
- Confidence level and key invalidation conditions

## Execution Defaults

- For a full analysis, fetch all required data sources in parallel.
- Use fail-fast behavior: if required data retrieval fails, stop and report the missing dependency.
- Load sector references only when the sector is thesis-critical, not by default.
- All output verdicts and statuses must use values from `enums-and-glossary.md`.
