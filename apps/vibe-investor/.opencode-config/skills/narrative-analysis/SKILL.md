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
3. internal `analysis` documents (broker research, curated research notes, synthesized insights from our pipeline) — these are our data edge
4. reputable newswire / high-quality media
5. governance and ownership context used as supporting evidence
6. social chatter, forums, rumors, and unsourced propagation

Rules:

- Tier 1-2 can anchor a high-confidence narrative call.
- Tier 3 (`analysis` documents) are the highest-signal non-filing source. Always query for them first (`types: ["analysis"]`). They often contain pre-distilled thesis, catalyst, and valuation work.
- Tier 4 can strengthen or weaken a narrative, but should not overrule formal disclosure on factual claims.
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
- Insider transaction calibration: do not treat insider selling headlines as automatically negative or insider buying as automatically positive. Always normalize the transaction size against the holder's total position before assigning signal weight. A sale of 50M shares by someone holding 5B shares is 1% — that's noise, not distribution. Only flag insider transactions as meaningful when the percentage of holdings sold/bought is material, or when the pattern (repeated, accelerating, clustered timing) tells a story beyond the headline number.
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

- `list-documents` with `types: ["analysis"], symbols: ["{SYMBOL}"]` — read these first, they're the highest-signal source
- `search-documents` for symbol and key themes (broader query across all types)
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

Produce output using the lean narrative template below.

```markdown
## Narrative Analysis: {SYMBOL}

**Score**: {0-100} | **Backbone**: {X}/15 | **Confidence**: {HIGH/MEDIUM/LOW}
**Regime**: {type} | **Stage**: {stage} | **Durability**: {dur} | **Crowding**: {level}

### Story
{1-2 paragraphs: what the narrative is, why it matters, what makes it work or not. Focus on the market pricing angle, catalyst path, and narrative edge — not a company description (that's fundamental.md).}

### Catalysts
| What | When | Verify | Probability | Impact |
|------|------|--------|-------------|--------|
{3-5 catalysts max. Primary catalyst gets 1-2 sentence elaboration if needed.}

### Priced-In
{2-3 sentences: how much of the story is in the price. Reference fundamental.md's fair value as anchor.}

### Tensions
{Optional. Only when there's an active narrative contradiction, cross-lens disagreement, or market mispricing. Each tension: question, both sides, your read. Skip if none.}

### Failure Modes
{3-5 bullet list: how the STORY breaks. Narrative failures, not fundamental failures.}

### Counter-Evidence
{2-4 strongest pieces of evidence AGAINST the thesis. Cite document IDs.}

### Evidence
- Tier 1 (filings): {IDs}
- Tier 2 (research/analysis): {IDs}
- Tier 3 (news): {IDs}

### What Changed
{UPDATE mode only. Append new entries. Cite document IDs.}
- {YYYY-MM-DD}: {what changed, why it matters}
```

Size targets: INITIAL 2,000-5,000 bytes. UPDATE delta 200-800 bytes. Maximum 6,000 bytes — if bigger, something is duplicated.

Field rules:

- Derive `conviction_score` from the `0-15` backbone score, then adjust within the mapped band for stage, durability, crowding, evidence quality, and priced-in risk.
- The plan.md lens summary carries bull/bear factors, catalyst map, and failure risk for parent synthesis. Do not duplicate these in a YAML block inside narrative.md.
- All document IDs must be full, never truncated.

### Sections explicitly NOT in this template

These are owned by other files:

- **Owner And Ownership** → `fundamental.md` Ownership/Governance section. Narrative may reference owner character (aligned/neutral/extractive) in the Story section but does not produce a standalone ownership section.
- **Scenarios** → `plan.md` Active Scenarios. Cross-lens synthesis, not narrative-owned.
- **Invalidation / Kill criteria** → `plan.md` Position section as `Thesis kill`. Narrative owns Failure Modes (how the story breaks), not the mechanical kill criteria.
- **Premium And Priced-In Risk (full section with keystats)** → replaced by 2-3 sentence Priced-In section. Valuation math lives in `fundamental.md`.
- **YAML narrative_assessment block** → eliminated. `plan.md` lens summary carries the structured fields.
- **Backbone Score Breakdown table** → the score is in the header. Show reasoning in the Story section if needed, not a separate table.
- **Narrative Summary / Conclusion / Wrap-up** → the Story section IS the summary.

## Execution Defaults

- For full analysis, fetch hard dependencies in parallel.
- Prefer internal documents and Exa web sources for factual event confirmation and article-level evidence.
- Use `search-twitter` only when social spread, rumor propagation, or saturation is material to the thesis.
- When invoked by a parent workflow, prioritize new evidence, catalyst changes, and thesis-invalidating developments over full report formatting.
- Use fail-fast behavior: if a required dependency retrieval fails, stop and report the missing dependency.
- Load specialized references only when the mechanism is thesis-critical, not by default.

## Writing Protocol

- **INITIAL mode**: use `write` to create the full file from the template.
- **UPDATE mode**: use `edit` to surgically update only what changed:
  - Score in header if changed
  - Append to What Changed section (this is the primary UPDATE output)
  - Update Story paragraph only if the narrative interpretation materially changed
  - Update Catalyst table only if a catalyst status changed (verified, delayed, cancelled)
  - Update Priced-In only if price moved significantly relative to the story
  - Add/update Tensions only if a new tension emerged or an existing one resolved
- **If nothing changed**: don't touch the file. No update is valid.
- **Never rewrite the whole file on UPDATE.** Story, Catalysts, Failure Modes, Counter-Evidence, and Evidence are semi-static — they change on material events, not daily.

## Artifact Persistence

Write `narrative.md` to `memory/symbols/{SYMBOL}/` when the symbol has an existing plan or is in the coverage universe. Otherwise write to `work/`.
