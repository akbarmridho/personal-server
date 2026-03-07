---
name: narrative-analysis
description: Narrative and catalyst analysis for IDX stocks, including story classification, catalyst mapping, narrative strength scoring, failure-mode detection, and speculative premium assessment.
---

## How To Use This Skill

Use this file as the entrypoint. Do not load all references by default.

1. Classify narrative-analysis intent (desk-check narrative pass, new story scan, catalyst check, priced-in check, failure audit, or digest drafting).
2. Resolve an explicit reference-file list for the selected workflow.
3. Read the selected reference files before running the analysis.
4. Pull MCP data in parallel when running a full analysis.
5. Execute sequential analysis phases.
6. Return a verdict: `STRONG`, `MODERATE`, `WEAK`, or `BROKEN`.

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

Reference boundary:

- References provide doctrine, rubrics, and templates only.
- Workflow execution, persistence, and mutation rules are owned by this skill and the active workflow contract.

## Data Sources And Fail-Fast

Hard dependencies:

| Source | Used for | If unavailable |
|--------|----------|----------------|
| `search-documents`, `list-documents`, `get-document` | Filings, research, news, rumors from internal knowledge sources | Stop |
| `web_search_exa`, `crawling_exa` | External news coverage, source discovery, and page-level confirmation | Stop |
| `get-stock-keystats` | Valuation context and market-cap framing | Stop |
| `get-stock-governance` | Owner behavior, control quality, insider signals | Stop |

Conditional source:

| Source | Used for | If unavailable |
|--------|----------|----------------|
| `search-twitter` | Social narrative spread, rumor propagation, and saturation checks when social behavior is thesis-critical | Stop only when that social check is required for the call |

Stop: if a hard-dependency fetch fails, stop the task and report dependency failure. If a conditional social check is required and fails, stop and report that missing dependency.

Narrative analysis requires complete source material. Internal documents and Exa web coverage anchor the factual event set; social checks are additive when spread and crowd behavior matter.

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
- `web_search_exa` for external news/source discovery
- `get-stock-keystats` for valuation framing
- `get-stock-governance` for owner and control context

Add when relevant:

- `crawling_exa` for selected external pages that materially affect the narrative call
- `search-twitter` for current social spread, rumor transmission, and saturation checks

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

- For full analysis, fetch hard dependencies in parallel.
- Prefer internal documents and Exa web sources for factual event confirmation and article-level evidence.
- Use `search-twitter` only when social spread, rumor propagation, or saturation is material to the thesis.
- When invoked by a parent workflow, prioritize new evidence, catalyst changes, and thesis-invalidating developments over full report formatting. Write retained outputs to the path specified by the active workflow.
- Use fail-fast behavior: if a required dependency retrieval fails, stop and report the missing dependency.
- Load specialized references only when the mechanism is thesis-critical, not by default.
- All output verdicts and labels must use values from `enums-and-glossary.md`.
