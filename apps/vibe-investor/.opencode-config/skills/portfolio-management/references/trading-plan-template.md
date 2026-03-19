# Trading Plan Template

## Objective

Define the required structure for per-symbol trading plans. Every position must have a written plan before entry.

## Template

```markdown
# {SYMBOL} - Trading Plan

**Date**: {YYYY-MM-DD}
**Last Reviewed**: {YYYY-MM-DD}
**Category**: {CORE / VALUE / GROWTH / SPECULATIVE}
**Timeframe**: {SWING / POSITION / LONG_TERM}
**Review Cadence**: {WEEKLY / MONTHLY / QUARTERLY}

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

## Trade Management
- Holding mode: {TACTICAL / THESIS / HYBRID}
- Technical trail mode: {STRUCTURE / ZONE / MA / ATR}
- Technical plan role: {primary exit engine / trim-only / monitoring-only}
- Early trim rule: {what gets sold at T1 / T2}
- Runner policy: {how the remainder is handled}
- Final exit precedence: {hard invalidation > portfolio risk > thesis/non-TA exit > technical harvest/trail}
- Non-TA exit drivers: {valuation / catalyst / flow / thesis aging / opportunity cost}

## Invalidation
{Specific conditions that invalidate thesis}

## Notes
{Additional context, key dates, items to monitor}
```

## Minimum Required Fields

- Thesis
- Invalidation
- Position size and stop loss
- Timeframe, `Last Reviewed`, and review cadence
- Progress checkpoint and failure action
- Trade-management policy (`Holding mode` + `Final exit precedence`)

No entry should be executed without these fields filled.

## Cross-Skill Dependencies

Tier Alignment fields come from multiple sources:

- Flow, Technical: provided by technical-analysis skill or agent assessment of chart data.
- Fundamental, MoS: provided by fundamental analysis or agent assessment of financials.
- Correlation Role: computed from `fetch-ohlcv` rolling correlation (deterministic).
- Narrative, Conviction: agent judgment synthesizing all inputs.

If a contributing skill is not active, the agent fills the field with its best available assessment and notes the source limitation.

Default holding-mode inference for first-pass workflows:

- `CORE` + `LONG_TERM` -> `THESIS`
- `SPECULATIVE` + `SWING` -> `TACTICAL`
- everything else -> `HYBRID`

The workflow may override this when the actual operating intent differs.
