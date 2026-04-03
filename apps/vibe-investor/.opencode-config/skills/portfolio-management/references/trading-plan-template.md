# Trading Plan Template

## Objective

Define the required structure for per-symbol trading plans. Every position must have a written plan before entry, and every aggressive add must still satisfy the same underwriting standard.

## Operating Discipline

### Trade Classification Gate

Before endorsing any new buy, add, or hold escalation, explicitly classify the trade as one of:

- `THESIS`
- `TACTICAL`
- `SPECULATION`

Use:

- `THESIS` for durable multi-driver views with higher-tier evidence and longer holding tolerance
- `TACTICAL` for setup-driven or catalyst-window trades with shorter holding intent
- `SPECULATION` for low-evidence, rumor-led, or optionality-heavy trades where uncertainty dominates

Discipline:

- Do not let these categories blur.
- If a trade changes category, say so explicitly.
- `SPECULATION` should not silently drift into `THESIS` because price moved favorably first.

### Evidence Hierarchy

Always grade thesis quality using this order:

1. official filings / company disclosures
2. company profile / financials / hard operating data
3. internal analysis documents
4. external news / web sources
5. social discussion
6. rumor

Rules:

- Do not treat rumor as the base thesis unless the trade is explicitly labeled `SPECULATION`.
- Treat rumor as optionality unless supported by higher-tier evidence.
- If size is high while evidence quality is low, warn clearly.
- Size must scale with evidence quality, not excitement.

### Invalidation And Winner Discipline

- If technical structure breaks, say it clearly.
- Do not let narrative hope override invalidation.
- No averaging down below broken structure unless the evidence is better than before and chart / structure repair is visible.
- Build and reduce size in tranches, not in an all-in / all-out style by default.
- Add only when thesis and structure remain valid and either the prior tranche is working or the plan explicitly allows a staged pullback add near a predefined favorable zone with unchanged invalidation.
- Reduce progressively when evidence weakens, even before full invalidation, if the plan defines that downgrade path.
- Require staged trim logic for trades with clear upside targets.
- Warn against target drift after public or planned targets are reached.
- Do not let a winning trade silently mutate into a round-trip loser.
- If the trade requires active monitoring and the investor is unlikely to provide it, reduce aggression.

## Template

```markdown
---
id: {SYMBOL}
scope: symbol
symbol: {SYMBOL}
watchlist_status: {WATCHING / READY / ACTIVE / REMOVED}
trade_classification: {THESIS / TACTICAL / SPECULATION}
holding_mode: {TACTICAL / THESIS / HYBRID}
thesis_id: {THESIS_ID}
last_reviewed: {YYYY-MM-DD}
next_review: {YYYY-MM-DD}
leader: {true / false}
tags: [{TAG_1}, {TAG_2}]
active_recommendation:
  action: {WAIT}
  issued: {YYYY-MM-DD}
  horizon_expires: {YYYY-MM-DD}
  upgrade_trigger: {Concrete condition that upgrades WAIT to BUY/HOLD}
  downgrade_trigger: {Concrete condition that downgrades or removes the setup}
  expiry_action: {Re-underwrite with fresh levels or downgrade to WATCHING}
  wait_desk_check_count: {0+}
  retest_level: {PRICE}
  retest_status: {not_tested / tested_held / tested_failed}
  retest_checked: {YYYY-MM-DD}
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
- Portfolio fit: {0-100} - {heat, concentration, liquidity, and cash-budget summary}
- Composite: {0-100} -> {NO_TRADE / WATCHLIST / PILOT / STARTER / STANDARD / HIGH_CONVICTION}
- Aggression multiplier: {0.1-1.5}
- Final size: {X%}

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
{Additional context, key dates, items to monitor}
```

Frontmatter rules:

- Include `active_recommendation` when the symbol carries a live `WAIT` recommendation.
- Keep `active_recommendation` limited to the current recommendation lifecycle: `action`, `issued`, `horizon_expires`, `upgrade_trigger`, `downgrade_trigger`, `expiry_action`, `wait_desk_check_count`, `retest_level`, `retest_status`, and `retest_checked`.
- Use `wait_desk_check_count` to track how many desk-checks the same `WAIT` has persisted.
- Use `retest_level`, `retest_status`, and `retest_checked` when the live `WAIT` is anchored to a concrete retest zone.
- Omit `retest_level`, `retest_status`, and `retest_checked` when the live recommendation is not retest-based.
- Omit `active_recommendation` when there is no live recommendation lifecycle to track.

## Minimum Required Fields

- Trade Classification
- Entry type
- Thesis
- Catalyst
- Invalidation
- Expected holding period
- Position size and stop loss
- Expected R:R
- Entry build
- For `PILOT`: Reduced pilot gates used, Scale-up trigger, Pilot expiry
- Size reason
- Monitoring requirement
- Timeframe, `Last Reviewed`, and review cadence
- Progress checkpoint and failure action
- Trade-management policy (`Holding mode` + `Final exit precedence`)

No entry should be executed without these fields filled.

If one or more fields are missing:

- treat the trade as underdefined
- downgrade conviction
- avoid presenting it as fully underwritten

## Cross-Skill Dependencies

Lens score fields come from multiple sources:

- Technical score: `technical_assessment.conviction_score` plus the parent workflow's one-line driver summary.
- Flow score: `flow_assessment.conviction_score` plus sponsor/trust/timing context from `flow_context`.
- Narrative score: `narrative_assessment.conviction_score` plus catalyst and failure-risk context.
- Fundamental score: `fundamental_assessment.conviction_score` plus valuation anchor / quality context when the fundamental lens is loaded.
- Portfolio fit score, composite score, action tier, aggression multiplier, and final size: parent workflow synthesis using `portfolio_constraints` and the composite scoring contract.
- Correlation Role: computed from `fetch-ohlcv` rolling correlation (deterministic) and reflected in the portfolio-fit summary.

If a contributing skill is not active, the agent fills the field with its best available assessment and notes the source limitation.

Default holding-mode inference for first-pass workflows:

- `CORE` + `LONG_TERM` -> `THESIS`
- `SPECULATIVE` + `SWING` -> `TACTICAL`
- everything else -> `HYBRID`

The workflow may override this when the actual operating intent differs.
