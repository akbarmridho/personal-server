# Risk Assessment Framework

## Value Trap Detection

Common trap patterns:

- Low PER from one-off gains, not recurring operations.
- Low PBV with structurally weak ROE.
- High dividend yield with unsustainable payout.
- High ROE driven by excessive leverage.

Check for:

- Revenue decline over multiple years.
- Weak cash conversion despite reported profit.
- Deteriorating competitive position.

## Financial Manipulation Signals

Income statement:

- Revenue growth without matching cash collection.
- OCF diverges persistently from net profit.
- Accounting policy shifts that flatter earnings.

Balance sheet:

- Cash decreases while receivables/inventory inflate.
- DSO or DIO persistently high (practical warning above 60 days, context-dependent).
- Related-party balances or prepayments rising without clear business logic.

## Practical Checklist Before Buying Cheap Names

- Earnings quality is recurring.
- ROE justifies valuation.
- Revenue and margin trend not structurally broken.
- OCF supports reported profits.
- Working-capital metrics not signaling stress.
- Related-party structure not distorting economics.

## IDX 2.0 Risk Framework (0-12)

Score four risks 0-3 each:

- Flow/distribution risk
- Narrative failure risk
- Liquidity/exit risk
- Dilution/funding risk

Interpretation:

- 0-4 lower risk
- 5-8 medium risk
- 9-12 high risk

Hard constraints:

- Extreme flow risk: avoid size-up.
- Extreme liquidity risk: keep very small size.
- Extreme dilution risk: avoid until funding path is clear.

## Altman Z-Score Guide

- >3.0: lower bankruptcy risk
- 1.8-3.0: caution zone
- <1.8: distress zone

Use industry-appropriate variants for non-manufacturing contexts.

## Implementation Note

Enforcement: agent workflow during Phase 2 step 4 (see SKILL.md). Value trap detection and manipulation signal checks use deterministic financial data. IDX 2.0 risk score (0-12) is agent judgment across four dimensions. Altman Z-Score is deterministic. Risk check results (`PASS`/`WARNING`/`FAIL`) must match `enums-and-glossary.md`.
