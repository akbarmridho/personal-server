# Symbol Memory Contract

Use `memory/symbols/{SYMBOL}/plan.md` for durable per-symbol operating plans.

New symbol plans should start with YAML frontmatter:

```yaml
---
id: {SYMBOL}
watchlist_status: {ARCHIVED | WATCHING | READY | ACTIVE}
trade_classification: {THESIS | TACTICAL | SPECULATION}
thesis_id: [{thesis-id}, ...] or []
last_reviewed: {YYYY-MM-DD}
---
```

Rules:

- Keep the schema small and strict. `id` doubles as the symbol ticker. `scope` is implicit from file location.
- When an older symbol plan is edited, remove legacy `scope`, `symbol`, `leader`, `tags`, and other fields not in the current schema.
- `watchlist_status` is the durable watchlist label for the symbol. Valid values: `ARCHIVED`, `WATCHING`, `READY`, `ACTIVE`.
- `ARCHIVED`: reference material from one-off analysis or retired names. Not actively tracked. Resurfaced only on digest match or deep-review sweep.
- `WATCHING`: thesis interesting but not actionable yet, or position exited but name still worth tracking.
- `READY`: trigger conditions are close, plan prepared.
- `ACTIVE`: position is open.
- When a position is exited, set `watchlist_status` to `WATCHING`. The symbol stays on the watchlist for future monitoring — exiting a position does not mean removing the name. Use `ARCHIVED` instead if the name no longer warrants active monitoring.
- Do not store live fills, current P/L, or temporary execution state here.

## Required Artifacts

Every symbol directory (`memory/symbols/{SYMBOL}/`) must contain all of these:

- `plan.md` — consolidated operating plan with all four lens summaries (template below)
- `narrative.md` — narrative skill output (full analysis, evidence, catalyst dossier)
- `fundamental.md` — fundamental skill output (full analysis, governance, valuation)
- `*_ta_context.json` — deterministic TA preprocessing (system of record for TA structured data)
- `*_flow_context.json` — deterministic flow preprocessing (system of record for flow structured data)
- chart PNGs — visual evidence from TA skill

Workflows that review a symbol must produce any missing artifacts, not skip them. `ARCHIVED` symbols are exempt — they keep whatever they had at time of archival.

## Statefulness

**`plan.md` is a living document, not a daily report.** It materializes the AI's accumulated understanding of a symbol across sessions. Per-lens History subsections record what the AI thought, when, and why — so the next session builds on prior reasoning instead of starting from scratch.

- **Never overwrite the file on UPDATE.** Use surgical `edit` calls to update only what changed. Use `write` only on INITIAL (file doesn't exist).
- **No update is a valid outcome.** If nothing material changed, bump `last_reviewed` and stop.
- **Build on prior reasoning.** New history entries must reference what was said before.
- **Preserve evidence trail.** Document IDs and source references are permanent — never remove them during compaction.

## File Architecture

Three files per symbol, complementary, not standalone. No content duplicated across them.

- **`plan.md`** — the hub. Read first every session. Contains lens summaries (3-5 sentences + Bull/Bear each), per-lens reasoning history, Active Scenarios (cross-lens, ONLY place scenarios live), Position management + thesis kill (cross-lens, ONLY place these live), top-level history.
- **`narrative.md`** — evidence file for the story. Full story interpretation, catalyst dossier, bull case, failure modes, counter-evidence, document ID citations, What Changed.
- **`fundamental.md`** — evidence file for the numbers. Business quality, financials, valuation, Ownership & Governance (single source of truth), strengths, red flags, document ID citations, What Changed.

Data flow (one direction only): `ta_context.json` → `plan.md`, `flow_context.json` → `plan.md`, `narrative.md` → `plan.md` (summary), `fundamental.md` → `plan.md` (summary), `fundamental.md` → `narrative.md` (Priced-In references fair value). Nothing flows backward.

Context JSONs are the system of record for structured data (levels, metrics, series, red flags, setup details). The plan contains only what the LLM uniquely contributes: interpretation, reasoning, delta, tensions, and synthesis. Never restate what's already in the JSON.

## Edit-First Protocol

### INITIAL mode (file doesn't exist)

Use `write` to create the full file from the template.

### UPDATE mode (file exists)

Use `edit` for surgical changes. **Never use `write` to overwrite an existing plan.md.**

Typical UPDATE edits:

1. Frontmatter `last_reviewed` date bump.
2. Lens score change in section header (e.g., `## Technical (52)` → `## Technical (48)`).
3. Lens state paragraph — ONLY if interpretation materially changed. If only the score shifted a few points, update header + append history entry.
4. History append — new dated entry after the last entry in the relevant `#### History` subsection.
5. Position updates — specific lines (stop, trail, targets) only if changed.
6. Scenario updates — specific table rows only if evidence shifted.
7. Top-level History append — only if a cross-cutting event occurred.

Do NOT on UPDATE: rewrite Thesis, Catalyst, or Notes sections (they change on events, not daily). Do not rewrite unchanged lens paragraphs. Do not append "unchanged" history entries. Do not touch sections where nothing changed.

## Lens Summary Rules

Every lens summary in plan.md MUST have explicit `Bull:` and `Bear:` lines. No exceptions. If no bull factors exist, write "Bull: none identified."

What goes in the lens summary (LLM-unique interpretation only):

- Score + role assignment
- Current state interpretation (what the data means for the thesis)
- Bull/bear factors curated for this thesis
- Monitoring triggers
- Key levels and invalidation (for TA)
- Participant read (for flow)

What stays in the context JSON (never restate in plan): full level maps, MA posture details, Wyckoff phase history, VPVR coordinates, setup scores, red flag codes, core metrics tables, persistence driver tables, concentration metrics, trust regime rationale, divergence state details.

## History Rules

### Per-lens history (inside each lens section)

- Each entry: date, score, 1-3 sentences of REASONING in first person.
- Build on prior entries or explicitly disagree.
- Cite document IDs when a document changed the read.
- Do not write an entry if nothing changed. Silence means "prior read still holds."
- Compaction: when entries exceed ~7, summarize older entries into a "prior context" paragraph and keep the last 5 detailed. Preserve all document IDs during compaction.

### Top-level History (bottom of plan)

- Cross-cutting events only: entries, exits, adds, trims, human decisions, thesis-level status changes.
- NOT for lens score updates. NOT for "nothing changed."
- Compaction: summarize older entries when exceeding ~10. Preserve document IDs.

## Symbol Plan Body Template

All agents (parent and subagent) writing or rewriting `plan.md` must follow this structure. Read this before creating or updating any symbol plan.

```markdown
---
id: {SYMBOL}
watchlist_status: {ARCHIVED / WATCHING / READY / ACTIVE}
trade_classification: {THESIS / TACTICAL / SPECULATION}
thesis_id: [{THESIS_ID}]
last_reviewed: {YYYY-MM-DD}
---

# {SYMBOL} - Trading Plan

**Date**: {YYYY-MM-DD}
**Last Reviewed**: {YYYY-MM-DD}
**Category**: {CORE / VALUE / GROWTH / SPECULATIVE}
**Trade Classification**: {THESIS / TACTICAL / SPECULATION}
**Timeframe**: {SWING / POSITION / LONG_TERM}
**Expected Holding Period**: {days / weeks / months}
**Review Cadence**: {WEEKLY / MONTHLY / QUARTERLY}
**Evidence Grade**: {1 / 2 / 3 / 4 / 5 / 6}

## Thesis
{1-2 sentences: why this stock, what is the edge}

## Catalyst
{What should happen, by when, and why it matters. Bullet list.}

## Active Scenarios
{2-4 decision-relevant branches. Table: scenario, trigger/evidence, implication, likelihood.}

## Technical ({score}) — {role}
→ `{SYMBOL}_ta_context.json`

{Current state paragraph: 3-5 sentences of INTERPRETATION — what the chart means for the thesis. Not a restatement of the JSON.}

Bull: {factors}
Bear: {factors}

{Key levels: invalidation, stop, targets, R:R.}

Monitoring:
- Upgrade if: {condition}
- Downgrade if: {condition}
- Exit if: {condition}

#### TA History
- {YYYY-MM-DD}: {score}. {1-3 sentences of reasoning. Reference prior entries. Cite document IDs if relevant.}

## Flow ({score}) — {role}
→ `{SYMBOL}_flow_context.json`

{Current state paragraph: 3-5 sentences of INTERPRETATION — verdict, CADI, persistence, participant flow, trust.}

Monitoring:
- Confirm if: {condition}
- Weaken if: {condition}
- Invalidate if: {condition}

#### Flow History
- {YYYY-MM-DD}: {score}. {reasoning chain.}

## Narrative ({score}) — {role}
→ `narrative.md`

{3-5 sentence summary. Bull/bear. Kill criteria.}

#### Narrative History
- {YYYY-MM-DD}: {score}. {reasoning chain. Cite document IDs when new evidence changed the read.}

## Fundamental ({score}) — {role}
→ `fundamental.md`

{3-5 sentence summary.}

#### Fundamental History
- {YYYY-MM-DD}: {score}. {reasoning chain. Cite document IDs.}

## Position

{For ACTIVE:}
- Entry: {type, zone, size, avg price, lots}
- Size reason: {why this size}
- Stop: {level} | Trail: {level, mode}
- Targets: T1 {price} ({action}) | T2 {price} ({action})
- R:R: {from current trail}
- Add rule: {condition}
- Trim rule: {condition}
- Exit rule: {precedence chain}
- Thesis kill: {conditions}
- Checkpoint: {date} — {expectations, failure action}

{For WATCHING:}
- Re-entry conditions: {what must align}
- Entry zone: {range} | Stop: {level} | Targets: {levels}
- Thesis kill: {conditions}

## Notes
{2-5 bullets of durable structural facts only. NOT for session-specific observations, lens findings, or catalyst updates.}

## History
{Cross-cutting events: entries, exits, adds, trims, human decisions, thesis-level changes. NOT for lens score updates.}
- {YYYY-MM-DD}: {event} — {what and why}
```
