# Company Quality Framework

## Business Model Understanding

Baseline questions:

- What does the company sell and to whom?
- What drives revenue and margin?
- Where are competitive constraints?
- Is the business still structurally relevant?

Basic filters:

- Company operationally real and active
- Bankruptcy risk acceptable
- Business has future runway
- Core business not in structural decline

## Economic Moat

Common moat sources:

- Intangible assets (brand, license, patents)
- Network effects
- Switching costs
- Structural barriers to entry

Financial moat indicators:

- Multi-year positive FCF
- ROE consistently >10%
- Strong margin durability
- Stable or rising market share
- Practical pricing power

Moat erosion signals:

- Share loss, margin compression, disruption exposure, regulatory shifts, rising customer concentration, or aggressive new entrants.

## Industry Lifecycle

| Stage | Profile | Approach |
|------|---------|----------|
| Introduction | High uncertainty | Speculative and small sizing |
| Growth | Expanding demand | Prefer emerging leaders |
| Maturity | Stable demand and slower growth | Efficiency and cash-return focus |
| Decline | Structural contraction | Avoid long-duration thesis |

## Market Structure And Pricing Power

| Structure | Pricing power profile |
|----------|-----------------------|
| Monopoly | High price control |
| Oligopoly | Usually high coordination power |
| Monopolistic competition | Moderate differentiation edge |
| Perfect competition | Low pricing power |

## Ownership And Governance

Checklist:

- Control clarity and free float profile
- Institutional and foreign holder context
- Recent holder changes and implications
- Minority alignment behavior

Important interpretation warning:

- Custody or nominee names can be misread as active directional holders.
- Validate custody vs active-holder interpretation before inferring active accumulation from holder names.

## Management Quality

- Capital allocation discipline
- Related-party transaction quality
- Compensation alignment to performance
- Execution consistency and transparency

## Growth Story And Rerating Potential

- New growth vectors and TAM expansion
- Strategic transition quality
- Catalyst credibility for rerating
- Whether market imagination has room or story is already consensus

## Implementation Note

Enforcement: agent workflow during Phase 2 step 3 (see SKILL.md). Business model and moat assessment are agent judgment. Ownership/governance checks use `get-stock-governance` data. Moat values (`WIDE`/`NARROW`/`NONE`) and lifecycle stages must match `enums-and-glossary.md`.
