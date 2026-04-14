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

- `plan.md` — operating plan (template below)
- `technical.md` — TA skill output
- `flow.md` — flow skill output
- `narrative.md` — narrative skill output
- `fundamental.md` — fundamental skill output
- `*_ta_context.json` — deterministic TA preprocessing
- `*_flow_context.json` — deterministic flow preprocessing
- chart PNGs — visual evidence from TA skill

Workflows that review a symbol must produce any missing artifacts, not skip them. `ARCHIVED` symbols are exempt — they keep whatever they had at time of archival.

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
{What should happen, by when, and why it matters}

## Active Scenarios
{Optional. Use only when one linear plan is not enough. Keep 2-4 decision-relevant branches with scenario name, trigger/evidence, operating implication, and optional rough likelihood.}

## Lens Scores
- Technical: {0-100} - {one-line score driver summary}
- Flow: {0-100} - {one-line score driver summary}
- Narrative: {0-100} - {one-line score driver summary}
- Fundamental: {0-100} - {valuation anchor / quality summary}
- Portfolio fit: {0-100} - {heat budget, concentration, correlation, liquidity, and hard-rail headroom}

## Plan
- Entry type: {FULL / PILOT}
- Entry zone: {price range}
- Position size: {X% of portfolio} ({amount})
- Entry build: {initial tranche, add conditions, and max exposure condition}
- Reduced pilot gates used: {Required for PILOT; omit for FULL}
- Scale-up trigger: {Required for PILOT; omit for FULL}
- Pilot expiry: {Required for PILOT; omit for FULL}
- Size reason: {why this size is justified relative to evidence quality, liquidity, and monitoring capacity}
- Stop loss: {price} (-{X%} from entry)
- Risk per trade: {Rp amount} ({X%} of portfolio)
- Target 1: {price} (+{X%}) - sell {X%}
- Target 2: {price} (+{X%}) - sell {X%}
- Target 3: {price} (+{X%}) - sell remaining
- Expected R:R: {X:1} (entry to T1), {X:1} (entry to T2), {X:1} (entry to T3)
- Monitoring requirement: {LOW / MEDIUM / HIGH} + {what must actually be monitored}
- Progress checkpoint date: {YYYY-MM-DD}
- Progress expectation by checkpoint: {what must be true}
- If checkpoint fails: {hold / trim / exit rule}

## Trade Management
- Holding mode: {TACTICAL / THESIS / HYBRID}
- Technical trail mode: {STRUCTURE / ZONE / MA / ATR}
- Technical plan role: {primary exit engine / trim-only / monitoring-only}
- Reduction ladder: {what causes trim to half, trim to starter, or full exit}
- Early trim rule: {what gets sold at T1 / T2}
- Runner policy: {how the remainder is handled}
- Final exit precedence: {hard invalidation > portfolio hard rail or size-cap constraint > thesis/non-TA exit > technical harvest/trail}
- Non-TA exit drivers: {valuation / catalyst / flow / thesis aging / opportunity cost}

## Invalidation
{Specific conditions that invalidate thesis}

## Open Position Monitoring
- Thesis status: {intact / improving / degrading / invalidated}
- Active scenario: {scenario name or single-path setup}
- Scenario switch trigger: {what would move the operating plan to another branch}
- Next catalyst: {date/event}
- Add trigger: {what would justify add}
- Reduce trigger: {what would justify trim / reduce}
- Exit trigger: {what would justify full exit}

## Notes
{Durable qualitative context: governance flags, ownership quirks, sector dynamics, structural considerations that don't fit in structured fields above. Not for transient updates — those go in Digest Sync.}

## Digest Sync
{Dated evidence trail from desk-checks and reviews. Each entry: date, source workflow, what changed and why.}
- {YYYY-MM-DD}: {workflow} — {what changed, source reference}
```
