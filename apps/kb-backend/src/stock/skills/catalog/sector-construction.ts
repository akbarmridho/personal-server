import type { Skill } from "../types.js";

export const sectorConstruction: Skill = {
  name: "sector-construction",
  description:
    "Construction sector specifics: key metrics (New Contracts, Order Book, Burn Rate), Understanding high leverage (DER), and cash flow risks (Turnkey vs Progress).",
  content: `# Construction Sector Analysis

The construction sector (BUMN Karya & Private) is characterized by high leverage, thin margins, and heavy dependence on government spending/infrastructure cycles.

---

## 1. Key Performance Metrics

### New Contracts (Kontrak Baru)
*   Value of projects won during the current period.
*   **Indicator**: Future revenue growth potential.

### Order Book
*   Total value of pipeline projects (New Contracts + Carry Over from previous years).
*   **Burn Rate**: Revenue / Order Book. Measures how fast they execute projects.

### Gross Margin
*   Typically very thin (8-12%).
*   **Risk**: Rising raw material costs (steel, cement) can wipe out net profit entirely since contracts are often fixed-price.

---

## 2. Leverage & Solvency Analysis

### High DER is "Normal"
Construction companies operate on debt.
*   **Normal Range**: DER 1.5x - 2.5x.
*   **Danger Zone**: DER > 3x - 5x (High risk of default/restructuring).
*   **Reason**: They pay for materials/labor upfront, get paid later.

### Cash Flow from Operations (CFO)
*   Often negative during expansion phases.
*   **Critical Check**: Does CFO stay negative for multiple years? If yes, the company is burning cash and surviving on new debt (Ponzi-like structure risk).

---

## 3. Payment Schemes & Risk

### Progress Payment (Termin)
*   Paid based on completion % (e.g., 20%, 50%, 100%).
*   **Pros**: Better cash flow for contractor.

### Turnkey Project
*   Contractor finances the ENTIRE project first.
*   Payment received ONLY upon 100% completion.
*   **Risk**: Requires massive debt (Working Capital Credits). If owner delays payment, contractor pays huge interest, eating up all profit.
*   **Note**: Many BUMN Karya issues stemmed from massive Turnkey projects.

---

## 4. WSKT / WIKA Case Study (Lessons Learned)

Why did giants falter?
1.  **Investments vs. Contracting**: They shifted from being just contractors to **Asset Owners** (Toll Roads).
2.  **Mismatch**: Funded long-term assets (Toll Roads break even in 10+ years) with short-term (banking) debt.
3.  **Divestment Fail**: Planned to sell completed toll roads to sovereign funds (INA), but delays caused interest pile-up.

**Investment Insight**:
*   Pure contractors are generally safer than Contractor + Investment Developers in high-interest rate environments.
`,
};
