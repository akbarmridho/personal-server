# Trading Plan Template Body

Full template for `memory/symbols/{SYMBOL}/plan.md`. Load when creating or fully rewriting a symbol plan.

```markdown
---
id: {SYMBOL}
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
- Portfolio fit: {0-100} - {heat budget, concentration, correlation, liquidity, and hard-rail headroom — not regime or cash-floor}
- Composite: {0-100} -> {NO_TRADE / WATCHLIST / PILOT / STARTER / STANDARD / HIGH_CONVICTION}
- Aggression multiplier: {0.25-1.5}
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
- Exit review state: {not_in_review / in_review}
- Exit review gate: {price level that must be reclaimed to exit review state, or omit if not in review}
- Exit review count: {0+, number of consecutive desk-checks in exit-review without reclaiming gate}
- Next catalyst: {date/event}
- Add trigger: {what would justify add}
- Reduce trigger: {what would justify trim / reduce}
- Exit trigger: {what would justify full exit}

## Notes
{Additional context, key dates, items to monitor}
```

## Frontmatter Rules

- Include `active_recommendation` when the symbol carries a live `WAIT` recommendation.
- Keep `active_recommendation` limited to the current recommendation lifecycle: `action`, `issued`, `horizon_expires`, `upgrade_trigger`, `downgrade_trigger`, `expiry_action`, `wait_desk_check_count`, `retest_level`, `retest_status`, and `retest_checked`.
- Use `wait_desk_check_count` to track how many desk-checks the same `WAIT` has persisted.
- Use `retest_level`, `retest_status`, and `retest_checked` when the live `WAIT` is anchored to a concrete retest zone.
- Omit `retest_level`, `retest_status`, and `retest_checked` when the live recommendation is not retest-based.
- Omit `active_recommendation` when there is no live recommendation lifecycle to track.
