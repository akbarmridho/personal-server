import type { Skill } from "../types.js";

export const valuationMethodology: Skill = {
  name: "valuation-methodology",
  description:
    "Comprehensive stock valuation methods including EPS Discounted, Equity Growth, ROE-PBV, DCF, DDM, and Asset-Based approaches with step-by-step calculations and applicability guidance.",
  content: `# Stock Valuation Methodology

This skill provides multiple methods for calculating intrinsic value. Each method has specific use cases depending on company characteristics. Use multiple methods to find consensus value.

---

## 1. Core Concepts

### Market Price vs Intrinsic Value
- **Market Price**: Driven by short-term sentiment, news, emotions. Fluctuates frequently.
- **Intrinsic Value**: Stable figure based on business fundamentals. Forward-looking.
- **Strategy**: Buy when Market Price < Intrinsic Value. Sell when Market Price ≥ Intrinsic Value.

### Margin of Safety (MOS)
The "cushion" between intrinsic value and market price.

$$MOS = \\frac{Intrinsic\\ Value - Market\\ Price}{Intrinsic\\ Value} \\times 100\\%$$

**Interpretation**:
| MOS Range | Assessment | Action |
|-----------|------------|--------|
| < 0% | Overvalued | Avoid / Sell |
| 0% – 30% | Fair Price | Hold |
| > 30% | Undervalued | Buy |

**Risk Adjustment**: For high-risk companies (high debt, cyclical), require larger MOS (~50%).

---

## 2. Method Selection Guide

| Method | Best For | Avoid When |
|--------|----------|------------|
| **EPS Discounted** | Consistent positive profit trends | Erratic or negative earnings |
| **Equity Growth** | Inconsistent profits, positive equity trend | Negative or declining equity |
| **ROE-PBV** | High, stable ROE companies | Volatile or low ROE |
| **DCF** | Positive, predictable free cash flow | Negative or erratic FCF |
| **Asset-Based** | Asset-heavy companies (property) | Service/tech companies |
| **DDM** | Consistent dividend payers | Non-dividend stocks |

---

## 3. EPS Discounted Model

Projects future earnings to determine current value.

### Step-by-Step

**Step 1: Calculate Inputs**
- Current Book Value per Share (BVPS): $BVPS = \\frac{Total\\ Equity}{Shares\\ Outstanding}$
- Current Earnings per Share (EPS): $EPS = \\frac{Net\\ Profit}{Shares\\ Outstanding}$

**Step 2: Determine Growth Rate**
- Calculate CAGR of net profits over last 3–10 years
- **Cap growth at 15%** for conservative estimates

**Step 3: Project Future EPS (5 years)**
\`\`\`
Year 1 EPS = Current EPS × (1 + Growth Rate)
Year 2 EPS = Year 1 EPS × (1 + Growth Rate)
... and so on
\`\`\`

**Step 4: Discount to Present Value**
Use discount rate (typically 7% = inflation + risk premium):
$$PV_{EPS} = \\frac{Future\\ EPS}{(1 + Discount\\ Rate)^n}$$

**Step 5: Calculate Intrinsic Value**
$$Intrinsic\\ Value = BVPS + \\sum{Discounted\\ Future\\ EPS}$$

---

## 4. Equity Growth Model

Projects growth of company's net worth.

### Step-by-Step

**Step 1: Calculate ROE**
$$ROE = \\frac{Net\\ Profit}{Total\\ Equity} \\times 100\\%$$

**Step 2: Project Future BVPS (5 years)**
\`\`\`
Year 1 BVPS = Current BVPS × (1 + ROE)
Year 2 BVPS = Year 1 BVPS × (1 + ROE)
... and so on
\`\`\`

**Step 3: Intrinsic Value**
- Future BVPS at Year 5 serves as intrinsic value
- **Note**: No discounting typically applied as balance sheet items often already reflect inflation

---

## 5. ROE-PBV Model

Assumes direct relationship between efficiency (ROE) and fair valuation (PBV).

### Rule of Thumb

| ROE | Fair PBV |
|-----|----------|
| 10% | 1.0x |
| 20% | 2.0x |
| 30% | 3.0x |

**Formula**:
$$Fair\\ PBV = ROE \\times 10$$

**Intrinsic Value**:
$$Intrinsic\\ Value = Fair\\ PBV \\times BVPS$$

**Assessment**:
- If Market Price < Intrinsic Value → Undervalued
- If Market Price > Intrinsic Value → Overvalued

---

## 6. Discounted Cash Flow (DCF)

Determines present value of enterprise by discounting future cash flows.

### Step 1: Calculate Free Cash Flow (FCF)
$$FCF = Operating\\ Cash\\ Flow - Capital\\ Expenditure$$
$$FCF\\ per\\ Share = \\frac{FCF}{Shares\\ Outstanding}$$

### Step 2: Calculate WACC (Discount Rate)

**Cost of Equity (CAPM)**:
$$Cost\\ of\\ Equity = Risk\\ Free\\ Rate + \\beta \\times (Market\\ Return - Risk\\ Free\\ Rate)$$

**Cost of Debt**:
$$Cost\\ of\\ Debt = (1 - Tax\\ Rate) \\times Long\\ Term\\ Debt\\ Rate$$

**WACC**:
$$WACC = (\\%Equity \\times Cost\\ of\\ Equity) + (\\%Debt \\times Cost\\ of\\ Debt)$$

### Step 3: Calculate Sustainable Growth
$$Sustainable\\ Growth = Sustainable\\ ROE \\times (1 - Dividend\\ Payout\\ Ratio)$$
- Cap at 4% for valuation purposes
- Must be lower than discount rate

### Step 4: Calculate Terminal Value
$$Terminal\\ Value = \\frac{FCF_{final\\ year} \\times (1 + Sustainable\\ Growth)}{WACC - Sustainable\\ Growth}$$

### Step 5: Calculate Intrinsic Value
$$Intrinsic\\ Value = \\sum{PV\\ of\\ Projected\\ FCF} + PV\\ of\\ Terminal\\ Value$$

---

## 7. Dividend Discount Model (DDM)

Estimates value as present value of expected future dividends.

### Adjusted Dividend Calculation
To find more accurate dividend figure, add "Excess Retained" cash:

**Cash Retained**: Net Profit - Cash Dividends Paid

**Cash Required**: Net Profit × Required Retention Ratio
- Required Retention Ratio = 100% - Average Dividend Payout Ratio

**Excess Retained per Share**:
$$Excess\\ Retained = \\frac{Cash\\ Retained - Cash\\ Required}{Shares\\ Outstanding}$$

**Adjusted Dividend**:
$$Adjusted\\ Dividend = DPS + Excess\\ Retained$$

### Intrinsic Value
$$Intrinsic\\ Value = \\frac{Adjusted\\ Dividend \\times (1 + Sustainable\\ Growth)}{WACC - Sustainable\\ Growth}$$

---

## 8. Asset-Based Approach

Used for sectors where asset value is the primary driver (e.g., property).

### Step 1: Calculate Asset Market Value
For property: Landbank (hectares) × Current Market Price per hectare

### Step 2: Calculate Net Debt
$$Net\\ Debt = Interest\\ Bearing\\ Debt + Advance\\ From\\ Customer - Cash$$

### Step 3: Calculate NAV
$$NAV = Asset\\ Market\\ Value - Net\\ Debt$$

### Step 4: NAV per Share
$$NAV\\ per\\ Share = \\frac{NAV}{Shares\\ Outstanding}$$

### Sector Discount
Property sector historically trades at ~48% discount to NAV. Apply sector-appropriate discount.

---

## 9. Tech Sector Valuation

### Pre-Profit Stage (Growth Focus)
**Price to Sales Multiple**:
- Apply peer-average P/S multiple to revenue
- Adjust for net debt (often net cash from IPO)

### Post-Profit Stage
- Use DCF once positive profit and free cash flow achieved
- Account for high cash positions from IPO proceeds

---

## 10. Valuation Notes

### Minimize Subjectivity
- Use multiple methods to find consensus value
- Cross-validate results

### Valuation Barriers
Difficult to value companies with:
- Negative cash flow
- Continuous losses
- Negative equity
- Signs of financial manipulation

### Conservative Assumptions
- Use conservative rather than optimistic growth estimates
- Cap growth rates (typically at 15%)
- Apply appropriate discount rates for risk
`,
};
