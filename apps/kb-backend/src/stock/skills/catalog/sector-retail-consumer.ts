import type { Skill } from "../types.js";

export const sectorRetailConsumer: Skill = {
  name: "sector-retail-consumer",
  description:
    "Key financial metrics for Retail and FMCG sectors: Inventory turnover (DIO), Receivables (DSO), Payables (DPO), and Cash Conversion Cycle (CCC).",
  content: `# Retail & Consumer Goods (FMCG) Analysis

In the retail and consumer goods sector, efficiency is King. The business is about moving inventory quickly and managing cash flow, rather than just high margins.

---

## 1. The Cash Conversion Cycle (CCC)

The time it takes to convert investments in inventory back into cash.

$$CCC = DIO + DSO - DPO$$

*   **Interpretation**:
    *   **Lower is Better**: Short cycle means fast cash generation.
    *   **Negative is Best**: Company effectively operates on suppliers' money (e.g., receives cash from customers before paying suppliers).

---

## 2. Key Efficiency Metrics

### Days Inventory Outstanding (DIO)
How long inventory stays in the warehouse before being sold.
*   **Formula**: $\\frac{\\text{Average Inventory}}{\\text{COGS}} \\times 365$
*   **Benchmark**: **< 60 days**.
*   **Risk**: High DIO = Dead stock, obsolescence risk, high storage costs.

### Days Sales Outstanding (DSO)
How long it takes to collect cash from customers after a sale.
*   **Formula**: $\\frac{\\text{Average Accounts Receivable}}{\\text{Revenue}} \\times 365$
*   **Benchmark**: **< 60 days**.
*   **Risk**: High DSO = Collection issues, "fake" sales, bad debt risk.
*   **Retail Note**: Pure retailers (minimarkets) often have near-zero DSO (cash sales). Distributors/Wholesalers have higher DSO.

### Days Payable Outstanding (DPO)
How long the company takes to pay its suppliers.
*   **Formula**: $\\frac{\\text{Average Accounts Payable}}{\\text{COGS}} \\times 365$
*   **Strategy**:
    *   **High Power**: Strong companies (e.g., Unilever, Indofood) can force long payment terms on suppliers (High DPO).
    *   **Warning**: If DPO is too high, it might indicate liquidity trouble (inability to pay).

---

## 3. Sector-Specific Considerations

### Margin vs. Volume Game
*   **FMCG/Mini-market**: Low Net Profit Margin (2-5%), High Asset Turnover. Profit comes from volume.
*   **Luxury/Department Store**: Higher Margin, Lower Turnover. Profit comes from premium pricing.

### Same Store Sales Growth (SSSG)
*   **Definition**: Sales growth from existing stores only (excluding new store openings).
*   **Importance**: Shows organic demand. If Revenue grows but SSSG is negative, growth is only from aggressive expansion (which usually cannibalizes margins).

### Seasonality
*   **Ramazan/Lebaran Effect**: Q2 typically peak sales.
*   **Year-End**: Q4 usually strong due to holidays/bonuses.
*   **Analysis**: Compare YoY (Year-on-Year) rather than QoQ (Quarter-on-Quarter) to account for seasonality.
`,
};
