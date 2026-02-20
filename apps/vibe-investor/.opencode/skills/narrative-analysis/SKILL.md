---
name: narrative-analysis
description: Narrative and catalyst analysis for IDX stocks, including story classification, catalyst mapping, narrative strength scoring, failure-mode detection, and speculative premium assessment.
---

## Scope Guardrail (IDX Only)

- This skill is for Indonesian Stock Exchange (IDX/BEI) narrative work.
- Focus on story quality, catalyst path, and failure risk.
- Out of scope: deep flow analysis (`get-stock-bandarmology`) and chart-based technical analysis (`fetch-ohlcv`).

## How To Use This Skill

Use this file as the entrypoint. Do not load all references by default.

1. Classify user intent (new story scan, catalyst check, priced-in check, failure audit, or report drafting).
2. Load only relevant reference files.
3. Pull MCP data in parallel when running a full analysis.
4. Return a verdict: `STRONG`, `MODERATE`, `WEAK`, or `BROKEN`.

## Data Sources

- `search-documents`, `list-documents`, `get-document`: filings, research, news, rumors.
- `search-twitter`: social narrative spread and momentum.
- `get-stock-fundamental`: valuation context and market-cap framing.
- `get-stock-governance`: owner behavior, control quality, insider signals.
- `get-sectors`, `get-companies`: thematic and peer mapping.
- `list-knowledge`, `get-knowledge`: external knowledge-catalog entries for sector and corporate-action mechanics.

## Reference Index (Modular)

### Core frameworks

- [Workflow and operating sequence](references/workflow-and-operating-sequence.md)
Use for end-to-end execution order.

- [Narrative identification framework](references/narrative-identification-framework.md)
Use to classify story type, business excitement, owner character, and ownership map.

- [Catalyst mapping framework](references/catalyst-mapping-framework.md)
Use for catalyst calendar, timing proximity, and corporate-action mechanics.

- [Narrative strength and priced-in tests](references/narrative-strength-and-priced-in-tests.md)
Use for scoring and consensus/late-stage detection.

- [Narrative failure and risk scoring](references/narrative-failure-and-risk-scoring.md)
Use to map thesis breakers and binary-dependency risk.

- [Output report template](references/output-report-template.md)
Use when writing final structured narrative outputs.

### Specialized deep references

- [Knowledge-catalog routing](references/knowledge-catalog-routing.md)
- [Narrative valuation framework](references/narrative-valuation-framework.md)
- [Haluasi and rerating premium](references/haluasi-and-rerating-premium.md)
- [Hype lifecycle pompom to cuci piring](references/hype-lifecycle-pompom-to-cuci-piring.md)
- [Rights issue purpose and signal map](references/rights-issue-purpose-and-signal-map.md)
- [Backdoor listing screening](references/backdoor-listing-screening.md)
- [WTFF backdoor cycle](references/wtff-backdoor-cycle.md)
- [IPO analysis](references/ipo-analysis.md)

## Execution Defaults

- For full analysis: run `search-documents`, `search-twitter`, `get-stock-fundamental`, and `get-stock-governance` in parallel.
- Use hard failure logic: if core data retrieval fails, fail the analysis instead of guessing.
- Prefer explicit catalyst timelines and invalidation triggers over vague narrative opinions.
