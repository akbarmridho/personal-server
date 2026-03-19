# Valuation Method Selection

## First Principles

- Pick the method that matches how the business creates value.
- Use the simplest method that captures the economics honestly.
- Choose a primary method, then add one or two secondary checks with different failure modes.
- Reject method convenience. A familiar method can still be the wrong one.

## Selection Logic

| Business shape | Primary method | Secondary check | Why |
|---|---|---|---|
| Predictable operating company with positive cash flow | `DCF (FCFF)` | `EV/EBITDA` or `P/E` | Cash-generation business with forecastable reinvestment |
| Stable-leverage company where equity cash flow is decision-relevant | `DCF (FCFE)` | `P/E` | Useful when equity-holder cash flow is visible and leverage is not shifting |
| Mature dividend payer | `DDM` | `P/E` or `DCF` | Dividends are a real output of capital allocation |
| Bank / insurer | `Justified P/B` plus `DDM` | Peer `P/E` or peer `P/B` | Book value, sustainable `ROE`, and payout matter more than EBITDA |
| Asset-backed / property / REIT / holding | `NAV` or `SOTP` | `DCF` when operating cash flow matters | Assets or stakes anchor value directly |
| Mature capital-intensive business | `EV/EBITDA` | `DCF` | Better cross-capital-structure comparison than `P/E` |
| Cyclical / commodity | `Normalized EV/EBITDA` or `Normalized P/E` | `DCF` on normalized assumptions | Spot-year earnings distort value |
| Conglomerate | `SOTP` | Holdco sanity check | Mixed economics require mixed methods |
| Early-growth / pre-profit | `EV/Revenue` or scenario `DCF` | `SOTP` if segments differ materially | Current earnings do not represent future economics |
| Mechanism-led case | Mechanism math first | Trading multiple later | Event structure changes per-share economics before market multiple matters |

## Primary Method Triggers

### Use `DCF`

- future cash generation can be modeled without heroic forecasting
- margin structure and reinvestment path are understandable
- value depends on compounding operating cash flow over time

### Use `DDM`

- dividends are stable, intentional, and capacity-backed
- the business is mature enough that payout is the right equity lens
- especially relevant for banks, insurers, REIT-like yield stories

### Use `P/E`

- earnings are real, recurring, and not heavily distorted
- the company is already profitable
- peer comparison is meaningful inside the same sector and cycle context

### Use `EV/EBITDA`

- EBITDA is economically meaningful
- debt load differs across peers
- depreciation, tax, and capital structure make `P/E` less comparable

### Use `P/B` or `Justified P/B`

- book value represents real economic capital
- returns on capital explain deserved premium or discount
- especially relevant for banks, insurers, and some asset-backed businesses

### Use `NAV`

- the asset base itself is the value anchor
- appraisal, reserve, or replacement logic matters more than near-term earnings

### Use `SOTP`

- segments have different drivers, peers, or appropriate methods
- holdco complexity hides segment value

### Use `EV/Revenue`

- the business is not yet profit-mature
- current revenue quality says more than current earnings
- margin potential and monetization path can still be framed credibly

### Use `LBO`

- the question is maximum payable price under leverage and target returns
- acquisition financing structure is part of the valuation logic

## Wrong-Method Exclusions

- Do not use `EV/EBITDA` for banks or insurers.
- Do not use spot-year `P/E` for cyclicals at peak earnings.
- Do not use `DDM` when payout is opportunistic or capital is constrained.
- Do not use `P/B` for intangible-heavy growth names as a primary anchor.
- Do not use `DCF` when the explicit-period build is mostly fiction.
- Do not use a single blended multiple for a conglomerate.
- Do not use peer multiples alone for recap, rights issue, or dilution cases.

## Primary And Secondary Check Discipline

- Primary method should explain most of the economics.
- Secondary method should fail differently from the primary method.
- If both methods depend on the same weak assumption, they are not real cross-checks.
- If the business model only supports one honest method, say that clearly and lower precision.

## Mode Notes

- `FULL_REVIEW`: select one primary method and at least one secondary check when possible.
- `VALUATION_ONLY`: use the smallest credible method set that still avoids category mistakes.
- `SECTOR_REVIEW`: focus on method fit by sub-model and justified premium or discount ranges.
- `MECHANISM_REVIEW`: start with event math, then use methods that reflect the post-event reality.
