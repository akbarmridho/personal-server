# Trading Plan Template

## Objective

Define the required structure for per-symbol trading plans. Every position must have a written plan before entry, and every aggressive add must still satisfy the same underwriting standard.

## Operating Discipline

### Trade Classification Gate

Before endorsing any new buy, add, or hold escalation, explicitly classify the trade as one of:

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

No entry should be executed without these fields filled. If one or more fields are missing, treat the trade as underdefined, downgrade conviction, and avoid presenting it as fully underwritten.

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

For the full template body (frontmatter schema, all plan sections, and frontmatter rules), see `references/trading-plan-template-body.md`. Load it when creating or fully rewriting a symbol plan.
