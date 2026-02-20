---
name: fundamental-analysis
description: Fundamental analysis for IDX stocks, including financial health checks, multi-method valuation, company quality assessment, sector context, and risk scoring.
---

## Scope Guardrail (IDX Only)

- This skill is for Indonesian Stock Exchange (IDX/BEI) equity fundamentals.
- Focus on business quality, earnings and cash durability, valuation, and fundamental risk.
- This is not a flow-only or chart-only skill.

## How To Use This Skill

Use this file as the entrypoint. Do not load all references by default.

1. Classify the request (full fundamental review, valuation-only, risk check, or sector deep-dive).
2. Load only the relevant references.
3. Collect required MCP data in parallel.
4. Return a structured verdict with confidence and invalidation conditions.

## Data Sources

- `get-stock-fundamental`: ratios, key stats, and long-horizon context.
- `get-stock-financials`: income statement, balance sheet, cash flow (quarterly and annual).
- `get-stock-governance`: ownership, management, insider and control context.
- `get-sectors`, `get-companies`: peer and subsector mapping.
- `search-documents`, `list-documents`, `get-document`: filings, research, and disclosures.
- `list-knowledge`, `get-knowledge`: sector and mechanism-specific deep references.

## Reference Index (Modular)

### Core frameworks

- [Workflow and operating sequence](references/workflow-and-operating-sequence.md)
- [Financial statements framework](references/financial-statements-framework.md)
- [Valuation methods framework](references/valuation-methods-framework.md)
- [Company quality framework](references/company-quality-framework.md)
- [Risk assessment framework](references/risk-assessment-framework.md)
- [Knowledge-catalog and sector routing](references/knowledge-catalog-and-sector-routing.md)
- [Output report template](references/output-report-template.md)

### Existing specialized references

- [Bank CKPN write-off overdue diagnostics](references/bank-ckpn-writeoff-overdue-diagnostics.md)
- [Banking sector](references/banking-sector.md)
- [Sharia banking sector](references/sharia-banking-sector.md)
- [Coal sector](references/coal-sector.md)
- [Construction sector](references/construction-sector.md)
- [Oil and gas sector](references/oil-gas-sector.md)
- [Oil and gas narrative proxies](references/oil-gas-narrative-proxies.md)
- [Property sector](references/property-sector.md)
- [Retail consumer sector](references/retail-consumer-sector.md)
- [Indonesia gold playbook](references/indonesia-gold-playbook.md)

## Execution Defaults

- For a full analysis, fetch `get-stock-fundamental`, `get-stock-financials`, `get-stock-governance`, and `search-documents` in parallel.
- Use fail-fast behavior: if required data retrieval fails, stop and report the missing dependency.
- Use 2-3 valuation methods minimum, then cross-check for divergence.
- Distinguish accounting profit from cash generation before issuing a verdict.
- Always include top risks and what would change the assessment.
