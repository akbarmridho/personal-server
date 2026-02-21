# Narrative Core Framework

---

# Narrative Identification Framework

## Step 1: Business Reality Check

Before story analysis, confirm business viability.

| Question | Red flag if |
|----------|-------------|
| Does business actually operate? | Shell with no real operations |
| Bankruptcy risk manageable? | Altman Z-score < 1.8 |
| Long-term relevance intact? | Obsolete product, shrinking market |
| Revenue trajectory healthy? | Multi-year decline without recovery plan |
| Revenue model clear? | Unclear monetization, paper-profit profile |

## Step 2: Classify Narrative Type

| Type | Description | Typical examples |
|------|-------------|------------------|
| Thematic play | Riding macro/sector theme | EV chain, data center, energy transition |
| Earnings turnaround | Recovery from weak base | Margin expansion, debt reduction |
| Corporate action | Structural event | M&A, spin-off, rights issue |
| Sector rotation | Capital rotation across sectors | Rate-cut beneficiaries, commodities |
| Policy beneficiary | Regulation-driven uplift | Incentives, tariff changes |
| MSCI/index inclusion | Forced-buying narrative | MSCI review, LQ45 inclusion |
| Conglomerate rerating | Group restructuring story | Asset spin-off, strategic pivot |
| Dividend play | Payout-driven demand | High/special dividend cycle |
| Speculative/hype | Story-first, weak numbers | Viral influencer campaign |

## Step 3: Growth Excitement Test

- Is there future optionality the market can imagine?
- Is there expansion logic beyond stable status quo?
- Mature but stable names can still work, but rerating velocity is usually lower.

## Step 4: Owner Character Assessment

| Question | Bullish signal | Bearish signal |
|----------|----------------|----------------|
| Owner objective | Long-term value build | Cash extraction behavior |
| Dividend policy | Consistent and rational | Persistently low payout despite profits |
| Fundraising behavior | Rare and purpose-driven | Repeated dilutive actions |
| Minority alignment | Transparent and fair | Aggressive control-first behavior |

## Step 5: Ownership Map

| Check | Signal |
|------|--------|
| Institutional holders | Validation and stability |
| Foreign presence | External confidence signal |
| Control clarity | Strategic direction visibility |
| Recent ownership shifts | Possible narrative regime change |

---

# Catalyst Mapping Framework

## Catalyst Calendar

Map known and potential catalysts with expected timing.

| Catalyst type | Typical timing | Typical impact |
|---------------|----------------|----------------|
| Quarterly earnings | ~30-45 days post quarter | Beat/miss, guidance change |
| Annual report | Q1 following year | Full-year quality and payout context |
| RUPS | Q2-Q3 | Dividend approval, board and strategic agenda |
| LQ45/IDX rebalancing | Feb and Aug | Forced buying/selling windows |
| MSCI rebalancing | Feb, May, Aug, Nov | Foreign fund-flow catalyst |
| Regulatory decisions | Variable | Licensing/policy/tariff repricing |
| Commodity triggers | Ongoing | Price pass-through to earnings narrative |
| Corporate actions | As announced | Rights issue, split, M&A, spin-off |
| IPO lock-up expiry | 6-12 months post IPO | Supply overhang risk |
| Debt maturity | Company specific | Refinancing/liquidity stress event |

## Catalyst Proximity Rule

- <1 month: imminent, often partially pre-positioned.
- 1-3 months: best setup window if narrative is still under-owned.
- >6 months: story can stale or be displaced by new narratives.

## Corporate Action Mechanics (IDX)

When thesis depends on corporate actions, load the corresponding references:

- [Rights issue purpose and signal map](rights-issue-purpose-and-signal-map.md)
- [Backdoor listing screening](backdoor-listing-screening.md)

---

# Narrative Strength And Priced-In Tests

## Strength Scoring Matrix (0-15)

| Factor | Score | Criteria |
|--------|-------|----------|
| Freshness | 0-3 | 0 stale, 3 brand new |
| Market awareness | 0-3 | 0 everyone knows, 3 under-owned |
| Fundamental support | 0-3 | 0 pure hype, 3 strong evidence |
| Catalyst proximity | 0-3 | 0 none, 3 imminent (<1 month) |
| Flow alignment | 0-3 | 0 visible distribution, 3 clear accumulation |

## Interpretation

| Score | Verdict | Implication |
|------|---------|-------------|
| 12-15 | STRONG | Fresh, supported, catalyst-active |
| 8-11 | MODERATE | Real story but partially priced/delayed catalyst |
| 4-7 | WEAK | Stale or weakly supported narrative |
| 0-3 | BROKEN | No credible narrative edge |

## Priced-In Detection

A story is likely priced in when:

- Price already repriced materially ahead of catalyst.
- Social discussion is saturated.
- Research notes already consensus the same thesis.
- Valuation already embeds expected catalyst outcome.

Core test:

- If catalyst happens exactly as expected, is there still material upside?
- If no, upside asymmetry is weak.

---

# Narrative Failure And Risk Scoring

## What Breaks The Story

| Narrative type | Typical failure trigger |
|----------------|-------------------------|
| Thematic play | Theme fades or demand assumptions fail |
| Earnings turnaround | Next earnings disconfirm recovery |
| Corporate action | Deal canceled/blocked or terms worsen |
| Sector rotation | Macro regime shifts against the sector |
| Policy beneficiary | Policy delayed/reversed/weaker than expected |
| MSCI/index | Inclusion fails or expected flow does not materialize |
| Conglomerate rerating | Strategic pivot execution breaks |
| Dividend play | Payout below expectations |
| Speculative/hype | No real business follow-through |

## Failure Risk Score (0-3)

| Score | Level | Description |
|------|-------|-------------|
| 0 | Low | Multiple independent catalysts, resilient thesis |
| 1 | Moderate | 2-3 dependencies with partial redundancy |
| 2 | High | Single-key catalyst, binary setup |
| 3 | Critical | Visible cracks, narrative already degrading |

## Price Behavior vs Narrative Health

| Price behavior | Narrative state | Reading |
|---------------|-----------------|---------|
| Price up + narrative fresh | Healthy | Normal markup |
| Price flat + narrative fresh | Early skepticism/positioning | Needs confirmation |
| Price up + narrative aging | Late stage | De-risking candidate |
| Price down + narrative intact | Either opportunity or early failure | Validate with evidence |
| Price down + narrative broken | Confirmed failure | Exit/avoid |

## Failure Discipline

- Define invalidation before acting.
- If primary invalidation hits, downgrade verdict immediately.
- Do not rely on social momentum after fundamental or governance failure.

## Implementation Note

Enforcement: agent workflow during Phase 2 steps 1-4 (see SKILL.md). Business reality check uses `get-stock-keystats` data where available. Narrative type classification, owner character assessment, catalyst impact, strength scoring, and failure risk scoring are agent judgment. Catalyst dates are deterministic when sourced from filings/announcements. All labels and score values must match `enums-and-glossary.md`.
