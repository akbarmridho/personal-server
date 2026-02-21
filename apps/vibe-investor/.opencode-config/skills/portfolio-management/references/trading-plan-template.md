# Trading Plan Template

## Objective

Define the required structure for per-symbol trading plans written to `memory/symbols/{SYMBOL}.md`. Every position must have a written plan before entry.

## Template

```markdown
# {SYMBOL} - Trading Plan

**Date**: {YYYY-MM-DD}
**Category**: {CORE / VALUE / GROWTH / SPECULATIVE}
**Timeframe**: {SWING / POSITION / LONG_TERM}

## Thesis
{1-2 sentences: why this stock, what is the edge}

## Tier Alignment
- Flow: {ACCUMULATION / DISTRIBUTION / NEUTRAL}
- Narrative: {STRONG / MODERATE / WEAK}
- Technical: {bullish setup / neutral / bearish}
- Fundamental: {UNDERVALUED / FAIR / OVERVALUED}, MoS: {X%}
- Correlation Role: {DIVERSIFIER / NEUTRAL / CONCENTRATOR}, vs {key holding}: {corr value}
- Conviction: {HIGH / MEDIUM / LOW}

## Plan
- Entry zone: {price range}
- Position size: {X% of portfolio} ({amount})
- Stop loss: {price} (-{X%} from entry)
- Risk per trade: {Rp amount} ({X%} of portfolio)
- Target 1: {price} (+{X%}) - sell {X%}
- Target 2: {price} (+{X%}) - sell {X%}
- Target 3: {price} (+{X%}) - sell remaining
- Progress checkpoint date: {YYYY-MM-DD}
- Progress expectation by checkpoint: {what must be true}
- If checkpoint fails: {hold / trim / exit rule}

## Invalidation
{Specific conditions that invalidate thesis}

## Notes
{Additional context, key dates, items to monitor}
```

## Minimum Required Fields

- Thesis
- Invalidation
- Position size and stop loss
- Timeframe and review cadence
- Progress checkpoint and failure action

No entry should be executed without these fields filled.

## Cross-Skill Dependencies

Tier Alignment fields come from multiple sources:

- Flow, Technical: provided by technical-analysis skill or agent assessment of chart data.
- Fundamental, MoS: provided by fundamental analysis or agent assessment of financials.
- Correlation Role: computed from `fetch-ohlcv` rolling correlation (deterministic).
- Narrative, Conviction: agent judgment synthesizing all inputs.

If a contributing skill is not active, the agent fills the field with its best available assessment and notes the source limitation.

## Implementation Note

Enforcement: agent workflow during New Position Entry (see SKILL.md). The agent loads this template, fills all required fields, and writes to `memory/symbols/{SYMBOL}.md`. Enum values in the template must match `enums-and-glossary.md`.
