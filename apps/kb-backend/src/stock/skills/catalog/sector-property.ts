import type { Skill } from "../types.js";

export const sectorProperty: Skill = {
  name: "sector-property",
  description:
    "Property sector specifics: Landbank classification, PSAK 72 revenue recognition rules, Marketing Sales vs Revenue, Adjusted DER, and NAV valuation.",
  content: `# Property Sector Analysis framework

The property sector requires unique accounting adjustments because "Sales" (Marketing Sales) often don't appear in "Revenue" for years due to accounting standards.

---

## 1. Asset Classification: The Landbank

Property companies are essentially land traders. Understand the asset mix:

1.  **Inventory (Persediaan)**: Land with completed/ongoing buildings ready for sale.
2.  **Land Under Development (Landbank)**: Raw land intended for future projects. Top value driver.
3.  **Investment Property**: Recurring income assets (Malls, Office Towers, Hotels) held for rental.
    *   *Valuation Note*: Check if valued at "Cost" (conservative) or "Fair Value" (can inflate equity).

---

## 2. Marketing Sales vs. Revenue (PSAK 72)

**Marketing Sales (Pre-sales)**:
*   The actual "sales" performance on the ground (contracts signed/down payments).
*   **Leading Indicator**: Predicts future accounting revenue.

**Revenue (Accounting)**:
*   **PSAK 72 Rule**: Revenue is recognized **ONLY upon unit handover** (*serah terima*).
*   **Lag Time**: High-rise/Apartments may take 3-4 years from sale to handover. Landed houses take 1-2 years.
*   **Discrepancy**: A company can have record Marketing Sales but low/declining Revenue in the financial statements because projects aren't finished yet.

---

## 3. Financial Statement Adjustments

### Advances from Customers (Uang Muka Pelanggan)
*   Since revenue isn't recognized, cash received from buyers sits in **Liabilities**.
*   **Implication**: High "Liabilities" in property is often a GOOD thing (it represents future revenue).

### Adjusted Debt to Equity Ratio (DER)
Standard DER makes property companies look riskier than they are.

$$Adjusted\\ DER = \\frac{\\text{Total Liabilities} - \\text{Advances from Customers}}{\\text{Total Equity}}$$

*   **Action**: Always use Adjusted DER to assess solvency.

---

## 4. Valuation: Net Asset Value (NAV)

P/E ratio is useless for property developers due to revenue recognition lag. Use PBV or NAV.

### NAV Calculation
1.  **Revalue Assets**: Estimate market value of Landbank (often recorded at historical cost).
    *   *Formula*: $\\text{Land Area} \\times \\text{Current Market Price}$.
2.  **Net Debt**: $\\text{Interest Bearing Debt} - \\text{Cash}$.
3.  **NAV**: $\\text{Revalued Assets} - \\text{Net Debt}$.
4.  **NAV per Share**: $\\frac{\\text{NAV}}{\\text{Total Shares}}$.

### The Discount to NAV
*   Property stocks rarely trade at 1x NAV.
*   **Historical Discount**: Indonesian property sector typically trades at a **~40-60% discount** to NAV.
*   **Target Price**: Apply the historical discount to your calculated NAV. Don't target 1x NAV unless in a massive bull run.

---

## 5. Investment Strategy

*   **Buy on News**: Rate cuts (stimulates mortgages), LTV easing, Tax incentives (Free VAT/PPN DTP).
*   **Recurring Income Buffer**: Companies with high recurring income (Malls/Hospitals) like SMRA or CTRA are safer during property downturns than pure developers.
`,
};
