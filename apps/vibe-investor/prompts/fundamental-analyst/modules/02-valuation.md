# Valuation Methodology

This module provides multiple methods for calculating intrinsic value. Each method has specific use cases depending on company characteristics. Use multiple methods to find consensus value.

## 1. Core Concepts

### Market Price vs Intrinsic Value

- **Market Price**: Driven by short-term sentiment, news, emotions. Fluctuates frequently.
- **Intrinsic Value**: Stable figure based on business fundamentals. Forward-looking.
- **Strategy**: Buy when Market Price < Intrinsic Value. Sell when Market Price >= Intrinsic Value.
- **Stock Market 2.0 Reality**: In the current IDX environment, intrinsic value serves as a FILTER (Tier 4), not a price driver. A stock can stay below intrinsic value for extended periods if flow and narrative don't support it.

### Margin of Safety (MOS)

The "cushion" between intrinsic value and market price.

**Formula**: MOS = ((Intrinsic Value - Market Price) / Intrinsic Value) × 100%

| MOS Range | Assessment | Action |
|-----------|------------|--------|
| < 0% | Overvalued | Avoid / Sell |
| 0% - 30% | Fair Price | Hold |
| > 30% | Undervalued | Buy (if other factors align) |

**Risk Adjustment**: For high-risk companies (high debt, cyclical), require larger MOS (~50%).

## 2. Method Selection Guide

| Method | Best For | Avoid When |
|--------|----------|------------|
| **EPS Discounted** | Consistent positive profit trends | Erratic or negative earnings |
| **Equity Growth** | Inconsistent profits, positive equity trend | Negative or declining equity |
| **ROE-PBV** | High, stable ROE companies | Volatile or low ROE |
| **DCF** | Positive, predictable free cash flow | Negative or erratic FCF |
| **Asset-Based** | Asset-heavy companies (property) | Service/tech companies |
| **DDM** | Consistent dividend payers | Non-dividend stocks |
| **P/S (Tech)** | Pre-profit tech companies | Profitable mature companies |

## 3. EPS Discounted Model

Projects future earnings to determine current value.

**Step 1: Calculate Inputs**

- Current BVPS = Total Equity / Shares Outstanding
- Current EPS = Net Profit / Shares Outstanding

**Step 2: Determine Growth Rate**

- Calculate CAGR of net profits over last 3-10 years
- **Cap growth at 15%** for conservative estimates

**Step 3: Project Future EPS (5 years)**

- Year N EPS = Previous Year EPS × (1 + Growth Rate)

**Step 4: Discount to Present Value**

- Use discount rate (typically 7% = inflation + risk premium)
- PV of EPS = Future EPS / (1 + Discount Rate)^n

**Step 5: Calculate Intrinsic Value**

- Intrinsic Value = BVPS + Sum of Discounted Future EPS

## 4. Equity Growth Model

Projects growth of company's net worth.

**Step 1: Calculate ROE**

- ROE = (Net Profit / Total Equity) × 100%

**Step 2: Project Future BVPS (5 years)**

- Year N BVPS = Previous Year BVPS × (1 + ROE)

**Step 3: Intrinsic Value**

- Future BVPS at Year 5 serves as intrinsic value
- No discounting typically applied as balance sheet items often already reflect inflation

## 5. ROE-PBV Model

Assumes direct relationship between efficiency (ROE) and fair valuation (PBV).

### Rule of Thumb

| ROE | Fair PBV |
|-----|----------|
| 10% | 1.0x |
| 20% | 2.0x |
| 30% | 3.0x |

**Formula**: Fair PBV = ROE × 10

**Intrinsic Value**: Fair PBV × BVPS

**Assessment**:

- If Market Price < Intrinsic Value -> Undervalued
- If Market Price > Intrinsic Value -> Overvalued

**Value Trap Check**: Low PBV with Low ROE is NOT a bargain. If actual PBV > Fair PBV, the stock may actually be overvalued despite appearing "cheap."

## 6. Discounted Cash Flow (DCF)

Determines present value of enterprise by discounting future cash flows.

**Step 1: Calculate Free Cash Flow (FCF)**

- FCF = Operating Cash Flow - Capital Expenditure
- FCF per Share = FCF / Shares Outstanding

**Step 2: Calculate WACC (Discount Rate)**

- Cost of Equity (CAPM) = Risk Free Rate + Beta × (Market Return - Risk Free Rate)
- Cost of Debt = (1 - Tax Rate) × Long Term Debt Rate
- WACC = (%Equity × Cost of Equity) + (%Debt × Cost of Debt)

**Step 3: Calculate Sustainable Growth**

- Sustainable Growth = Sustainable ROE × (1 - Dividend Payout Ratio)
- Cap at 4% for valuation purposes
- Must be lower than discount rate

**Step 4: Calculate Terminal Value**

- Terminal Value = (FCF final year × (1 + Sustainable Growth)) / (WACC - Sustainable Growth)

**Step 5: Calculate Intrinsic Value**

- Intrinsic Value = Sum of PV of Projected FCF + PV of Terminal Value

## 7. Dividend Discount Model (DDM)

Estimates value as present value of expected future dividends.

**Adjusted Dividend Calculation:**

- Cash Retained = Net Profit - Cash Dividends Paid
- Cash Required = Net Profit × Required Retention Ratio
- Required Retention Ratio = 100% - Average Dividend Payout Ratio
- Excess Retained per Share = (Cash Retained - Cash Required) / Shares Outstanding
- Adjusted Dividend = DPS + Excess Retained

**Intrinsic Value:**

- Intrinsic Value = (Adjusted Dividend × (1 + Sustainable Growth)) / (WACC - Sustainable Growth)

## 8. Asset-Based Approach

Used for sectors where asset value is the primary driver (e.g., property).

**Step 1:** Calculate Asset Market Value (e.g., Landbank × Current Market Price per hectare)
**Step 2:** Calculate Net Debt = Interest Bearing Debt + Advances from Customers - Cash
**Step 3:** NAV = Asset Market Value - Net Debt
**Step 4:** NAV per Share = NAV / Shares Outstanding

**Sector Discount**: Property sector historically trades at ~40-60% discount to NAV. Apply sector-appropriate discount.

## 9. Cross-Validation & Consensus

### Multi-Method Approach

- Always use at least 2-3 methods for the same stock
- Weight methods based on company characteristics
- If methods diverge significantly, investigate why

### Conservative Assumptions

- Use conservative rather than optimistic growth estimates
- Cap growth rates (typically at 15%)
- Apply appropriate discount rates for risk
- Prefer historical averages over management guidance

### Valuation Barriers (Difficult to Value)

- Negative cash flow companies
- Continuous losses
- Negative equity
- Signs of financial manipulation
- Pre-revenue companies (use qualitative assessment)
