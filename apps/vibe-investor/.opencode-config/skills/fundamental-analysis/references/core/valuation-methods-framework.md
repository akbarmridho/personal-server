# Valuation Methods Framework

## Core Principles

- Valuation follows business-model fit. Do not pick the method first and rationalize later.
- Intrinsic value is a range, not a single precise point.
- Margin of Safety (`MoS`) = (`IV - Price`) / `IV`.
- `MoS` only matters after business quality, financial quality, and accounting quality pass.
- Use 2 methods minimum when a credible secondary check exists.
- Weight methods by fitness and evidence quality, not by equal averaging by default.

## Method Selection Matrix

| Business type | Primary method | Secondary check | Avoid or demote |
|---|---|---|---|
| Predictable operating business with positive cash generation | DCF (`FCFF`) | EV/EBITDA or P/E | DDM as primary |
| Stable leverage and equity-holder cash flow visibility | DCF (`FCFE`) | P/E | `FCFE` if leverage is moving materially |
| Mature dividend payer with durable payout | DDM | P/E or DCF | DDM if payout is discretionary or fragile |
| Bank or insurer | Justified `P/B` plus DDM | Peer P/E or peer P/B | EV/EBITDA, generic DCF |
| Asset-heavy or asset-transparent business | NAV / asset-based | DCF or EV/EBITDA | P/B for intangible-heavy names |
| Mature operating business with comparable margins | EV/EBITDA | DCF | P/E when leverage or depreciation distorts comparability |
| Cyclical commodity or heavy-industry name | Mid-cycle EV/EBITDA or normalized P/E | DCF on normalized assumptions | Spot-year P/E |
| Conglomerate / multi-segment group | SOTP | Holding-level sanity check | Single blended multiple |
| Pre-profit or early monetization growth company | EV/Revenue or scenario DCF | SOTP for mixed models | EV/EBITDA, straight P/E |
| Mechanism-led case: recap, rights issue, LBO, spin, asset sale | Mechanism-specific math (`SOTP`, `LBO`, dilution, NAV) | DCF if post-event economics are stable | Generic peer multiple without event mechanics |

## Assumption Discipline

- Start from current operating facts, not promotional guidance.
- Use explicit drivers: revenue, margin, reinvestment, working capital, capital structure, and payout.
- Use normalized earnings or margins for cyclical businesses.
- Keep terminal growth below discount rate and tied to long-run economic reality.
- State whether terminal value is a minority or majority of total value.
- Use sensitivity analysis when small changes in `WACC`, `CoE`, or terminal growth swing the result materially.
- Match numerator and denominator: `EV` with operating metrics, equity value with equity metrics.
- Peer multiples require comparable business mix, geography, margin structure, and cycle position.
- For financials, tie valuation to sustainable `ROE`, asset quality, capital adequacy, and payout capacity.
- For growth names, show the path from revenue growth to acceptable unit economics and cash generation.

## Method Playbooks

### DCF

Use when:

- operating cash flow is positive or credibly normalizable
- reinvestment needs can be modeled
- medium-term economics are reasonably forecastable

Build rules:

- prefer `FCFF` for most operating businesses
- use `FCFE` only when leverage is stable and equity cash flow is the real decision lens
- justify `WACC` or `CoE` components explicitly
- show terminal value method and sensitivity

Stop or downgrade when:

- the model depends on heroic terminal growth or margin expansion
- terminal value dominates and the explanation is weak
- cash flow is too unstable for a credible explicit-period build

### DDM

Use when:

- dividends are a real capital-allocation output, not incidental
- payout is durable and capital needs are clear
- financials or yield-oriented names have stable dividend policy

Build rules:

- use Gordon Growth only when a stable long-run growth assumption is credible
- use multi-stage DDM when growth is clearly transitioning
- check payout ratio, capital adequacy, and earnings quality first

Stop or downgrade when:

- dividend policy is discretionary, erratic, or balance-sheet-constrained
- growth exceeds what retention and `ROE` can support

### P/E

Use when:

- earnings are real, recurring, and comparable
- the business is already profitable

Build rules:

- choose the right flavor: trailing, forward, or normalized
- for cyclicals, prefer normalized or mid-cycle earnings
- cross-check cash flow against earnings quality

Stop or downgrade when:

- comparing across sectors without context
- using peak-cycle earnings as if they were sustainable
- using forward estimates without sanity-checking optimism

### EV/EBITDA

Use when:

- EBITDA is meaningful and capital structures differ
- the business is mature enough for operating-metric comparison

Build rules:

- calculate `EV` correctly, including debt, cash, and minority interest when relevant
- select peers with comparable margin, capex burden, and cycle position
- remember EBITDA is not free cash flow

Stop or downgrade when:

- the business is a bank, insurer, or another model where EBITDA is not meaningful
- capex intensity or working-capital swings make EBITDA a poor cash proxy

### P/B, Justified P/B, and ROIC

Use when:

- book value is economically meaningful
- the sector is financials, property, or another asset-backed model

Build rules:

- interpret `P/B` through `ROE` or `ROIC`, not in isolation
- for banks, anchor to sustainable `ROE`, asset quality, and `CoE`
- separate high returns driven by moat from high returns driven by leverage

Stop or downgrade when:

- the balance sheet is questionable
- book value is dominated by weak-quality assets or intangibles that do not anchor value

### NAV

Use when:

- assets can be marked or estimated with reasonable confidence
- replacement value, liquidation value, or appraised value is central

Build rules:

- mark assets realistically
- subtract all relevant liabilities
- apply appropriate holdco, liquidity, tax, or realization discounts

Stop or downgrade when:

- asset values are stale, promotional, or unsupported
- liabilities, tax leakage, or discount-to-realization are ignored

### SOTP

Use when:

- segments have materially different economics or valuation bases
- the market may be obscuring value through complexity

Build rules:

- value each segment with the method that fits that segment
- apply ownership stakes correctly
- subtract holdco debt, minority claims, tax leakage, and corporate overhead
- consider a governance and complexity discount

Stop or downgrade when:

- segment disclosures are too weak
- holding-level burdens are ignored

### EV/Revenue and Scenario Valuation

Use when:

- the company is early-growth or not yet profit-mature
- revenue quality and future margin structure matter more than current earnings

Build rules:

- use `Rule of 40` or another quality lens to distinguish good growth from low-quality growth
- prefer scenario-weighted valuation over single-point precision
- state what must be true operationally in each scenario

Stop or downgrade when:

- revenue has weak unit economics, low take rate durability, or unclear monetization
- dilution, cash burn, or funding risk is ignored

## Sector Fit

| Sector or model | Stronger methods | Special checks |
|---|---|---|
| Banks | Justified `P/B`, DDM, peer P/E | `NPL`, `CKPN`, capital ratios, funding franchise |
| Insurance | `P/B`, adjusted earnings, dividend lens | Reserve quality, investment marks, capital adequacy |
| Telecom / utilities | DCF, EV/EBITDA | Regulation, capex, debt, maturity |
| Consumer quality compounders | DCF, P/E, EV/EBITDA | Premium justified by moat and reinvestment runway |
| Property / REIT / holding | NAV, SOTP | Appraisal realism, debt, tax leakage |
| Mining / coal / commodity | Normalized EV/EBITDA, normalized P/E, NAV for reserves | Strip-price realism, reserve life, cycle normalization |
| Tech / growth | EV/Revenue, scenario DCF, SOTP | Monetization quality, burn, dilution, path to margins |
| Conglomerates | SOTP | Ownership stakes, holdco burdens, discount to parts |

## Reconciliation Rules

- Investigate disagreement before summarizing it.
- Prefer the method that best matches the business economics.
- Demote methods with weaker assumptions to a loose check, not an equal-weight anchor.
- If peer and intrinsic methods disagree, state whether the gap comes from market premium, cycle position, or model assumptions.
- For high-uncertainty names, convert disagreement into scenarios instead of forcing convergence.
- For financials, let sustainable `ROE`, asset quality, and capital strength outrank near-term earnings noise.
- For mechanism reviews, reconcile transaction math before comparing with trading multiples.

## Hard Failure Cases

- Wrong method for the business model.
- One fragile method used as the sole anchor when a credible second method exists.
- Heroic terminal assumptions or false precision.
- Peak-cycle earnings treated as normal.
- Earnings-based multiple used when cash flow or asset quality contradicts earnings.
- Dividend model used without payout durability.
- SOTP or NAV that ignores debt, minority interest, tax leakage, or overhead.
- Growth valuation that ignores dilution or funding risk.
