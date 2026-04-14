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
6. Return one `narrative_assessment` object with a 0-100 `conviction_score` and structured evidence.

## Role in Synthesis

Narrative is the **thesis anchor** in most cases. It defines what the opportunity is, what the catalyst path looks like, and what would break the story.

- Narrative owns thesis identification, catalyst mapping, stage classification, and invalidation conditions.
- All other lenses are interpreted through the lens of the active thesis. If the thesis is gold diversification, weak coal earnings are noise for narrative scoring. If the thesis is coal recovery, weak coal earnings are the signal.
- Narrative score reflects thesis strength and evidence quality, not generic "story excitement."
- When scoring backbone factors, always ask: "Is this data point relevant to the active thesis?" before letting it affect the score.

## Concepts And School Of Thought

- Classify the narrative regime first using the house taxonomy (`THEME_OR_ROTATION`, `TURNAROUND`, `CORPORATE_ACTION`, `POLICY_OR_INDEX_FLOW`, `RERATING_OR_YIELD`, or `SPECULATIVE_HYPE`) before discussing upside.
- Map catalysts as dossiers, not headlines: define what happens, when, how to verify it, success criteria, and probability/impact.
- Separate narrative stage from narrative strength. A story can be strong now but already late or fragile.
- Separate durability from current excitement. Durable narratives deserve different treatment from short-cycle hype.
- Keep narrative strength (0-15) as the backbone score, then state stage, durability, crowding, and premium risk as separate dimensions rather than collapsing everything into a bigger scorecard.
- Score narrative strength (0-15) and failure risk (0-3) as structured judgment, not free-form opinion.
- Decompose price into base value plus narrative premium, but anchor base value to available fundamental context (`fundamental-analysis`, internal research, or `get-stock-keystats`) rather than inventing a standalone valuation engine here.
- Treat crowding and common-knowledge status as first-class risk inputs, not side commentary.
- Route mechanism-heavy cases through dedicated frameworks (rights issue, backdoor, IPO, hype lifecycle) before final assessment.
- Treat narrative as a pricing framework, not a moral/business-quality verdict; without complete source coverage, downgrade confidence.

## Reference Index And Topic Ownership

| File | Topics |
|------|--------|
| [narrative-core-framework.md](references/narrative-core-framework.md) | Business reality check, narrative regime classification, owner character, catalyst dossier structure, stage/strength scoring, priced-in detection, failure triggers, failure risk score (0-3), price-vs-narrative health |
| [narrative-premium-and-hype.md](references/narrative-premium-and-hype.md) | Base value vs narrative premium, certainty curve, haluasi premium bands, hype lifecycle (accumulation → pompom → frying → cuci piring), influencer red flags |
| [rights-issue-purpose-and-signal-map.md](references/rights-issue-purpose-and-signal-map.md) | Rights issue purposes, pricing signals, Indonesia-specific red flags |
| [backdoor-listing-screening.md](references/backdoor-listing-screening.md) | Shell screening criteria, pre-signals, TFF/WTFF late-cycle dynamics, post-injection reality check |
| [ipo-analysis.md](references/ipo-analysis.md) | Why traditional analysis fails for IPOs, underwriter role, manipulation patterns, lock-up dynamics |
| This file (SKILL.md) | Workflow, data sources, operating rules, shared labels, machine-vs-judgment boundary, and final structured output contract |

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

## Evidence Hierarchy

Use this source hierarchy when claims conflict:

1. official filings and formal regulatory disclosures
2. company guidance, formal presentations, and official corporate communication
3. reputable newswire / high-quality media / broker research
4. internal research and vetted contextual analysis
5. governance and ownership context used as supporting evidence
6. social chatter, forums, rumors, and unsourced propagation

Rules:

- Tier 1-2 can anchor a high-confidence narrative call.
- Tier 3-4 can strengthen or weaken a narrative, but should not overrule formal disclosure on factual claims.
- Tier 6 can support crowding or propagation assessment, but cannot validate a narrative by itself.
- If the narrative depends mainly on Tier 6, confidence must remain low.
- If a major claim is contradicted by a stronger evidence tier, downgrade the story or mark it broken.

## Shared Labels

### Narrative Assessment Score

Primary output: `narrative_assessment.conviction_score` on a 0-100 scale.

Score mapping from the backbone `0-15` narrative strength score:

- `0-19`: broken or no credible narrative edge
- `20-39`: weak, stale, or poorly supported
- `40-64`: moderate but delayed, partially priced, or mixed
- `65-84`: strong, fresh, and catalyst-active
- `85-100`: exceptional narrative strength with fresh catalyst, durable support, and limited crowding

Derived summary labels may still be used in prose:

- `STRONG`
- `MODERATE`
- `WEAK`
- `BROKEN`

### Confidence

- `HIGH`
- `MEDIUM`
- `LOW`

### Narrative Regime

- `THEME_OR_ROTATION`: riding macro, sector, commodity, or factor rotation
- `TURNAROUND`: recovery from weak base, earnings repair, or balance-sheet cleanup
- `CORPORATE_ACTION`: structural event such as M&A, spin-off, rights issue, backdoor, or asset injection
- `POLICY_OR_INDEX_FLOW`: regulation, tariff, incentive, or forced-flow inclusion narrative
- `RERATING_OR_YIELD`: conglomerate rerating, holding-company discount closure, or dividend-led demand
- `SPECULATIVE_HYPE`: story-first, weakly anchored, attention-driven narrative

### Narrative Stage

- `EARLY`
- `BUILDING`
- `LATE`
- `EXHAUSTED`

### Durability

- `LOW`
- `MEDIUM`
- `HIGH`

### Crowding

- `LOW`
- `MEDIUM`
- `HIGH`

Crowding is a supporting risk dimension, not primary proof of the story.

### Evidence Quality

- `HIGH`
- `MEDIUM`
- `LOW`

### Narrative Strength Score (0-15)

Five factors scored `0-3` each:

- Freshness
- Catalyst quality
- Fundamental support (scored against the active thesis, not current earnings)
- Catalyst proximity
- Evidence quality

This is the backbone narrative score. Stage, durability, crowding, and premium risk are separate dimensions — do not collapse them into the backbone.

### Failure Risk Score (0-3)

- `0`: low
- `1`: moderate
- `2`: high
- `3`: critical

### Business Excitement

- `high`
- `moderate`
- `low`

### Owner Character

- `aligned`
- `neutral`
- `extractive`

### Priced-In Status

- `no`
- `partial`
- `full`

### Haluasi Premium Band

- `Moderate`
- `High`
- `Extreme`

## Operating Rules

- Narrative is a pricing regime, not a fundamental verdict. A strong narrative on a weak business is still a valid analytical finding.
- Always separate base value from narrative premium when assessing price.
- Base value must be anchored to available fundamental context or explicit house research. If that anchor is weak, say so and downgrade conviction on premium claims.
- Prefer explicit catalyst timelines and invalidation triggers over vague narrative opinions.
- Always look for disconfirming evidence before finalizing the call. Do not stop at supportive evidence only.
- Always state the narrative stage (`EARLY`, `BUILDING`, `LATE`, or `EXHAUSTED`) and durability (`LOW`, `MEDIUM`, `HIGH`) explicitly.
- Always state crowding level and evidence quality explicitly.
- Crowding evidence is supporting evidence only. Social spread, media repetition, or ownership concentration can strengthen or weaken a call, but they cannot prove the story by themselves.
- If a story is consensus and fully priced, say so — do not manufacture upside.
- Late-cycle and exit-liquidity risk must be flagged when detected, even if the narrative is still "intact."
- All derived labels and structured status values must use the values defined in this file.

## Machine vs Judgment Boundary

This boundary clarifies field ownership only. It does not imply a separate preprocessing pipeline or automated narrative-scoring engine.

| Check | Type | How |
|-------|------|-----|
| Catalyst proximity (date-based) | Deterministic | Calendar dates from filings/announcements |
| Catalyst dossier fields | Mixed | Dates and source links deterministic; relevance, success criteria, probability, and impact require judgment |
| Narrative strength score (0-15) | Structured judgment | Backbone score; agent scores 5 factors using rubric from `narrative-core-framework.md` |
| Failure risk score (0-3) | Structured judgment | Agent scores using framework from `narrative-core-framework.md` |
| Narrative regime classification | Agent judgment | Classify from source material and context using the compact house taxonomy |
| Narrative stage | Agent judgment | Classify as `EARLY`, `BUILDING`, `LATE`, or `EXHAUSTED` from adoption and crowding context |
| Durability | Agent judgment | Assess whether the story is short-cycle, medium-duration, or structurally persistent |
| Crowding level | Mixed | Use social/coverage/consensus evidence as support, then judge final saturation state; crowding alone cannot validate a narrative |
| Evidence quality | Mixed | Judge final quality using source hierarchy and breadth of support |
| Business excitement | Agent judgment | Assess optionality and expansion logic without turning it into a full valuation claim |
| Owner character assessment | Agent judgment | Synthesize governance data, fundraising history, minority treatment |
| Base-value anchor | Mixed | Pull from available fundamental context or keystats, then judge whether the anchor is strong enough for premium analysis |
| Priced-in determination | Agent judgment | Evaluate price action, social saturation, consensus coverage, and distance from the base-value anchor |
| Haluasi premium band | Agent judgment | Assess scarcity, simplicity, forced-buyer dynamics |
| Business reality check | Mixed | Some checks deterministic (Altman Z, revenue trend), viability assessment is judgment |
| Invalidation or kill criteria | Agent judgment | Define explicit conditions that would break the story rather than vague caution text |

## Sector And Mechanism Routing

Use this routing when narrative quality depends on mechanism-level details.

1. Map the thesis to a concrete mechanism (rights issue, backdoor cycle, rerating premium, hype phase).
2. Load only the matching specialized references.
3. Evaluate timing, dilution/control implications, and late-cycle risk before final assessment.

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
2. Catalyst dossier mapping (from `narrative-core-framework.md`): for each catalyst, define `what`, `when`, `how_to_verify`, `success_criteria`, `probability`, and `impact`.
3. Narrative stage and crowding assessment.
4. Counter-evidence check: explicitly seek the strongest disconfirming evidence, contradictory filings, weak execution signals, or consensus-overcrowding facts before finalizing the view.
5. Narrative strength and durability scoring (from `narrative-core-framework.md`), keeping the `0-15` score as the backbone and reporting stage, durability, crowding, and premium risk separately.
6. Failure-mode assessment and explicit invalidation or kill criteria (from `narrative-core-framework.md`).
7. Haluasi / narrative-premium assessment if relevant (load `narrative-premium-and-hype.md`), anchored to available fundamental base-value context rather than standalone narrative valuation.
8. When the story is path-dependent, define a small optional scenario map with named branches, trigger/evidence, narrative implication, and optional rough likelihood.

### Phase 3: Narrative Assessment

Produce output using this structure:

```markdown
## Narrative Analysis: {SYMBOL}

**Narrative Conviction:** {0-100}
**Backbone Strength Score:** {X}/15
**Confidence:** {HIGH / MEDIUM / LOW}
**Evidence Quality:** {HIGH / MEDIUM / LOW}

### Current Narrative
- Regime: {THEME_OR_ROTATION / TURNAROUND / CORPORATE_ACTION / POLICY_OR_INDEX_FLOW / RERATING_OR_YIELD / SPECULATIVE_HYPE}
- Stage: {EARLY / BUILDING / LATE / EXHAUSTED}
- Strength: {X}/15
- Durability: {LOW / MEDIUM / HIGH}
- Crowding: {LOW / MEDIUM / HIGH}
- Story: {1-2 sentence summary}
- Business excitement: {high / moderate / low}

### Owner And Ownership
- Owner character: {aligned / neutral / extractive}
- Key shareholders: {major holders and recent shifts}

### Catalysts
| What | When | How to verify | Success criteria | Probability | Impact |
|------|------|---------------|------------------|-------------|--------|
| ... | ... | ... | ... | ... | ... |

### Premium And Priced-In Risk
- Base-value anchor: {fundamental-analysis / keystats / internal research / weak-or-none}
- Priced in: {no / partial / full}
- Premium risk: {Moderate / High / Extreme}
- Current premium vs base-value context: {brief note anchored to the chosen base-value source}
- Downside if break: {estimated drawdown range}

### Invalidation
- Primary failure trigger: {explicit invalidation}
- Kill criteria: {clear conditions that break the story}
- Failure risk score: {0-3}
- Binary dependency: {yes/no}

### Scenarios
Optional. Use only when one catalyst path is not enough.

| Scenario | Trigger / evidence | Narrative implication | Likelihood |
|---|---|---|---|
| ... | ... | ... | ... |
```

Machine-readable output contract:

```yaml
narrative_assessment:
  conviction_score: 78
  confidence: HIGH
  bull_factors: []
  bear_factors: []
  catalyst_map: {}
  failure_risk: {}
```

Field rules:

- Derive `conviction_score` from the `0-15` backbone score, then adjust within the mapped band for stage, durability, crowding, evidence quality, and priced-in risk.
- `bull_factors` and `bear_factors` must be short, evidence-backed bullets.
- `catalyst_map` should expose the highest-signal catalyst dossier fields and timing.
- `failure_risk` should include the `0-3` failure score, primary failure trigger, and kill criteria.

## Execution Defaults

- For full analysis, fetch hard dependencies in parallel.
- Prefer internal documents and Exa web sources for factual event confirmation and article-level evidence.
- Use `search-twitter` only when social spread, rumor propagation, or saturation is material to the thesis.
- When invoked by a parent workflow, prioritize new evidence, catalyst changes, and thesis-invalidating developments over full report formatting.
- Use fail-fast behavior: if a required dependency retrieval fails, stop and report the missing dependency.
- Load specialized references only when the mechanism is thesis-critical, not by default.
- Output must be structured enough for parent synthesis. Do not stop at prose verdicts when the workflow needs machine-readable narrative fields.

## Artifact Persistence

Write the output report as `narrative.md` to `memory/symbols/{SYMBOL}/` when the symbol has an existing plan or is in the coverage universe. Otherwise write to `work/`.
