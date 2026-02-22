---
name: narrative-analysis
description: Narrative and catalyst analysis for IDX stocks, including story classification, catalyst mapping, narrative strength scoring, failure-mode detection, and speculative premium assessment.
---

## How To Use This Skill

Use this file as the entrypoint. Do not load all references by default.

1. Classify user intent (new story scan, catalyst check, priced-in check, failure audit, or report drafting).
2. Load only relevant reference files.
3. Pull MCP data in parallel when running a full analysis.
4. Execute sequential analysis phases.
5. Return a verdict: `STRONG`, `MODERATE`, `WEAK`, or `BROKEN`.

## Concepts And School Of Thought

- Classify the narrative regime first (theme, turnaround, corporate action, policy, index agenda, or hype) before discussing upside.
- Map catalysts by event, date, and probability, then assess whether upside is still open or already priced in.
- Score narrative strength (0-15) and failure risk (0-3) as structured judgment, not free-form opinion.
- Decompose price into base value plus narrative premium, then explicitly state late-cycle and mean-reversion risk.
- Route mechanism-heavy cases through dedicated frameworks (rights issue, backdoor, IPO, hype lifecycle) before final verdict.
- Treat narrative as a pricing framework, not a moral/business-quality verdict; without complete source coverage, downgrade confidence.

## Reference Index And Topic Ownership

| File | Topics |
|------|--------|
| [enums-and-glossary.md](references/enums-and-glossary.md) | Shared verdicts, scores, labels, narrative types, premium bands |
| [narrative-core-framework.md](references/narrative-core-framework.md) | Business reality check, story type classification, owner character, catalyst calendar/proximity, strength scoring (0-15), priced-in detection, failure triggers, failure risk score (0-3), price-vs-narrative health |
| [narrative-premium-and-hype.md](references/narrative-premium-and-hype.md) | Base value vs narrative premium, certainty curve, haluasi premium bands, hype lifecycle (accumulation → pompom → frying → cuci piring), influencer red flags |
| [output-report-template.md](references/output-report-template.md) | Final report structure and section contract |
| [rights-issue-purpose-and-signal-map.md](references/rights-issue-purpose-and-signal-map.md) | Rights issue purposes, pricing signals, Indonesia-specific red flags |
| [backdoor-listing-screening.md](references/backdoor-listing-screening.md) | Shell screening criteria, pre-signals, TFF/WTFF late-cycle dynamics, post-injection reality check |
| [ipo-analysis.md](references/ipo-analysis.md) | Why traditional analysis fails for IPOs, underwriter role, manipulation patterns, lock-up dynamics |
| This file (SKILL.md) | Workflow, data sources, operating rules, deterministic-vs-judgment boundary |

## Data Sources And Fail-Fast

| Source | Used for | If unavailable |
|--------|----------|----------------|
| `search-documents`, `list-documents`, `get-document` | Filings, research, news, rumors | Stop |
| `search-twitter` | Social narrative spread and momentum | Stop |
| `get-stock-keystats` | Valuation context and market-cap framing | Stop |
| `get-stock-governance` | Owner behavior, control quality, insider signals | Stop |

Stop: if fetch fails, stop the task and report dependency failure.

All listed sources are hard dependencies — narrative analysis without complete source material is guessing.

## Operating Rules

- Narrative is a pricing regime, not a fundamental verdict. A strong narrative on a weak business is still a valid analytical finding.
- Always separate base value from narrative premium when assessing price.
- Prefer explicit catalyst timelines and invalidation triggers over vague narrative opinions.
- If a story is consensus and fully priced, say so — do not manufacture upside.
- Late-cycle and exit-liquidity risk must be flagged when detected, even if the narrative is still "intact."
- All verdict and label values must match `enums-and-glossary.md`.

## Deterministic vs Agent-Judgment Boundary

| Check | Type | How |
|-------|------|-----|
| Catalyst proximity (date-based) | Deterministic | Calendar dates from filings/announcements |
| Narrative strength score (0-15) | Structured judgment | Agent scores 5 factors using rubric from `narrative-core-framework.md` |
| Failure risk score (0-3) | Structured judgment | Agent scores using framework from `narrative-core-framework.md` |
| Narrative type classification | Agent judgment | Classify from source material and context |
| Owner character assessment | Agent judgment | Synthesize governance data, fundraising history, minority treatment |
| Priced-in determination | Agent judgment | Evaluate price action, social saturation, consensus coverage |
| Haluasi premium band | Agent judgment | Assess scarcity, simplicity, forced-buyer dynamics |
| Business reality check | Mixed | Some checks deterministic (Altman Z, revenue trend), viability assessment is judgment |

## Sector And Mechanism Routing

Use this routing when narrative quality depends on mechanism-level details.

1. Map the thesis to a concrete mechanism (rights issue, backdoor cycle, rerating premium, hype phase).
2. Load only the matching specialized references.
3. Evaluate timing, dilution/control implications, and late-cycle risk before final verdict.

Routing defaults:

- Rights issue mechanics: `rights-issue-purpose-and-signal-map.md`
- Backdoor quality and cycle risk: `backdoor-listing-screening.md`
- Premium and priced-in framing: `narrative-premium-and-hype.md`
- IPO analysis: `ipo-analysis.md`

## Workflow

### Phase 1: Parallel Data Collection

Run in parallel:

- `search-documents` for symbol and key themes
- `search-twitter` for current social spread
- `get-stock-keystats` for valuation framing
- `get-stock-governance` for owner and control context

### Phase 2: Sequential Analysis

1. Narrative identification (from `narrative-core-framework.md`).
2. Catalyst mapping (from `narrative-core-framework.md`).
3. Narrative strength scoring (from `narrative-core-framework.md`).
4. Failure-mode assessment (from `narrative-core-framework.md`).
5. Haluasi / narrative-premium assessment if relevant (load `narrative-premium-and-hype.md`).

### Phase 3: Verdict

Produce output per `output-report-template.md`:

- Verdict: `STRONG`, `MODERATE`, `WEAK`, or `BROKEN`
- Key story in 1-2 sentences
- Catalyst timeline
- Primary failure trigger
- Confidence level

## Execution Defaults

- For full analysis, fetch all data sources in parallel.
- Use fail-fast behavior: if document/news retrieval fails, stop and report the missing dependency.
- Load specialized references only when the mechanism is thesis-critical, not by default.
- All output verdicts and labels must use values from `enums-and-glossary.md`.
