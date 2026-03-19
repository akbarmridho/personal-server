# Shareholder Structure Framework

Use this framework when ownership structure materially affects governance quality, float quality, supply risk, or minority alignment.

## Objective

Answer:

- who controls the company
- how much stock is realistically available to others
- how concentrated the holder base is
- whether future supply or overhang risk is material
- whether the structure is aligned or dangerous for minorities

This is a structural lens. It does not own price timing, entry, or broker-flow interpretation.

## Holder Taxonomy

Use this house taxonomy:

- `controller_affiliate`
- `management_insider`
- `strategic`
- `domestic_institution`
- `foreign_institution`
- `passive_index`
- `retail_other`
- `nominee_custody_unclear`
- `treasury`

If a holder cannot be categorized honestly, keep the classification uncertain and explain why.

## Core Ownership Outputs

Produce these when the evidence supports them:

- controller identity
- controller / affiliate stake
- largest disclosed holders
- reported free float
- effective float estimate or range
- float tightness state
- concentration metrics: `top_3_pct`, `top_5_pct`, `HHI`
- largest non-controller block when relevant
- overhang / supply-risk events
- minority alignment
- ownership uncertainty notes

Optional secondary outputs:

- narrative hooks such as new strategic holder, float tightening, overhang increase, or control change

These are secondary outputs only. They do not replace narrative-analysis.

## Reported Free Float vs Effective Float

Start with reported free float from available governance/disclosure evidence.

Then assess effective float more conservatively:

- subtract or discount obviously sticky blocks when the evidence supports it
- treat strategic, passive, or ambiguous custody blocks cautiously
- if the estimate is weak, output a range or a categorical state instead of a fake-precise number

Recommended float-tightness states:

- `AMPLE`
- `ADEQUATE`
- `TIGHT`
- `EXTREMELY_TIGHT`

## Concentration And Control

Minimum concentration set:

- `top_3_pct`
- `top_5_pct`
- `HHI`

Interpretation guidance:

- controller dominance matters more than raw top-5 sums
- largest non-controller block can matter more than the controller for minority or float risk
- a thin non-controller base can make the stock structurally fragile even if reported float looks acceptable

## Overhang And Supply Risk

Explicitly scan for:

- rights issue
- placement
- tender offer
- lock-up expiry
- pledge / encumbrance when disclosed
- insider sale
- repeated dilution or refinancing behavior

For each material event, state:

- type
- size or rough scale if known
- expected timing
- whether it is constructive, neutral, or dangerous for minority holders and float quality

## Minority Alignment

Assess:

- control clarity
- affiliate complexity
- RPT / tunneling risk
- controller-vs-minority alignment
- diversity or independence of non-controller holders

Use one explicit result:

- `FAVORABLE`
- `MIXED`
- `WEAK`

## Uncertainty Handling

Uncertainty is first-class.

Flag ambiguity when:

- custody or nominee blocks hide beneficial owners
- holder list coverage is incomplete
- controller relationship is suspected but not proven
- effective float depends on assumptions rather than disclosed facts

Do not infer active smart-money behavior from holder names alone.

## Deterministic vs Judgment Boundary

Deterministic when evidence is strong:

- controller stake
- affiliate stake when disclosed clearly
- reported free float
- top-holder percentages
- `top_3_pct`, `top_5_pct`, `HHI`
- disclosed pledges, tenders, lock-ups, or dilution events

Judgment-heavy:

- effective float estimate or range
- holder-category assignment when labels are ambiguous
- minority alignment
- overhang severity
- custody / beneficial-owner interpretation
