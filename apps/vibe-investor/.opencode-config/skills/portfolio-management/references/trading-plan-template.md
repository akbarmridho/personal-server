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
- Require staged trim logic for trades with clear upside targets.
- Warn against target drift after public or planned targets are reached.
- Do not let a winning trade silently mutate into a round-trip loser.
- If the trade requires active monitoring and the investor is unlikely to provide it, reduce aggression.

## Template

```markdown
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
- Size reason: {why this size is justified relative to evidence quality, liquidity, and monitoring capacity}
- Stop loss: {price} (-{X%} from entry)
- Risk per trade: {Rp amount} ({X%} of portfolio)
- Target 1: {price} (+{X%}) - sell {X%}
- Target 2: {price} (+{X%}) - sell {X%}
- Target 3: {price} (+{X%}) - sell remaining
- Monitoring requirement: {LOW / MEDIUM / HIGH} + {what must actually be monitored}
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

## Open Position Monitoring
- Thesis status: {intact / improving / degrading / invalidated}
- Next catalyst: {date/event}
- Add trigger: {what would justify add}
- Reduce trigger: {what would justify trim / reduce}
- Exit trigger: {what would justify full exit}

## Notes
{Additional context, key dates, items to monitor}
```

## Minimum Required Fields

- Trade Classification
- Thesis
- Catalyst
- Invalidation
- Expected holding period
- Position size and stop loss
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
