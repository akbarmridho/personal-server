# Enums And Glossary

## Objective

Single source of truth for shared verdicts, statuses, and labels used across fundamental-analysis references and the output report template.

## Fundamental Verdict

- `UNDERVALUED`
- `FAIR`
- `OVERVALUED`

## Confidence

- `HIGH`
- `MEDIUM`
- `LOW`

## Financial Health Status

- `HEALTHY`
- `WARNING`
- `DANGER`

## Trend Direction

- `Improving`
- `Stable`
- `Weakening`

## Moat Assessment

- `WIDE`: durable competitive advantage with multi-year evidence
- `NARROW`: some advantage but vulnerable to erosion
- `NONE`: no identifiable moat

## Risk Check Result

- `PASS`: no material concern detected
- `WARNING`: concern present but not disqualifying
- `FAIL`: material risk that should block or heavily discount the thesis

## IDX 2.0 Risk Score (0-12)

Four dimensions scored 0-3 each:

- Flow/distribution risk
- Narrative failure risk
- Liquidity/exit risk
- Dilution/funding risk

Interpretation:

- 0-4: lower risk
- 5-8: medium risk
- 9-12: high risk

## Industry Lifecycle Stage

- `Introduction`: high uncertainty, speculative sizing
- `Growth`: expanding demand, prefer emerging leaders
- `Maturity`: stable demand, efficiency and cash-return focus
- `Decline`: structural contraction, avoid long-duration thesis

## Implementation Note

Enforcement: agent uses these values when filling the output report template. All verdict, status, and label fields in the report must use values from this file. Reference files use these labels but do not redefine them.
