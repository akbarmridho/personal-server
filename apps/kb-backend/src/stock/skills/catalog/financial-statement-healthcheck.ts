import type { Skill } from "../types.js";

export const financiaStatementlHealthCheck: Skill = {
  name: "financial-statement-health-check",
  description:
    "A comprehensive checklist for identifying red flags and verifying the integrity of financial statements across the Balance Sheet, Income Statement, and Cash Flow Statement.",
  content: `
# Financial Statement Health Checklist

This skill provides a framework for analyzing the quality of a company's financial health. It combines standard accounting checks with "value investor" perspectives to distinguish between accounting anomalies and true business performance.

## 1. Balance Sheet Checklist: Structure & Solvency

### **Asset Alignment & Business Model**
* **Investor vs. Accountant View:** Re-categorize assets to reflect the business model. Split assets into **Working Capital** (cash, receivables, inventory) and **Fixed Assets** (infrastructure).
* **Industry Consistency:**
    * **Heavy Industry (e.g., Coal Mining):** Should show high Fixed Assets (infrastructure).
    * **Financial/Service (e.g., Banks):** Should show high Working Capital (money flow).
    * *Red Flag:* Significant misalignment between asset allocation and the specific industry requirements.

### **Liquidity & Quality**
* **Current Ratio Check:** Verify if $\text{Current Assets} < \text{Current Liabilities}$.
* **Quick Ratio Check:** Ensure $\text{Quick Ratio} < 0.5$ (conservative liquidity assessment).
* **Asset Quality:**
    * **Inventory Control:** The percentage increase in inventory should be lower than the percentage increase in profit ($%\\Delta \text{Inventory} < \text{Profit Growth}$).
    * **Other Assets Limit:** "Other Assets" (Aset Lain-lain) should not exceed $5%$ of Total Assets.

### **Debt Composition & Equity**
* **Debt Classification:** Not all debt is equal. Distinguish between:
    * **Business Payables:** Interest-free credit from suppliers (Good debt indicating bargaining power).
    * **Business Loans:** Interest-bearing debt (Bad debt if excessive).
    * *Insight:* A high Debt-to-Equity Ratio (DER) may be acceptable if primarily composed of business payables.
* **Equity Source:** Verify if equity growth is driven by **Accumulated Profits** (Organic) or **Capital Injections** (Rights Issues/Private Placements).

## 2. Income Statement Checklist: True Earnings

### **Revenue & Segment Analysis**
* **Source Verification:** Analyze **Footnotes** to break down revenue by segment. Ensure the "Main Business" is the primary revenue driver, not unrelated side ventures (e.g., an investment firm deriving 50% revenue from electricity sales).
* **Commodity Sensitivity:** Identify if the company is a beneficiary or victim of raw material price hikes (e.g., Coal price hike benefits miners but hurts cement companies due to rising COGS).

### **Efficiency, Costs & Margins**
* **COGS Structure:**
    * **Fixed Costs:** Depreciation/Factory overhead (constant regardless of sales).
    * **Variable Costs:** Raw materials (scales with volume).
    * *Warning:* Rising COGS with stagnant revenue suggests inefficiency or inability to pass costs to consumers.
* **Margin vs. Turnover:**
    * **Luxury/Property:** High Margin, Low Turnover.
    * **Retail/Consumer Goods:** Low Margin, High Turnover.
* **SGA Efficiency:**
    * **Marketing:** High ad spend must correlate with revenue growth.
    * **General/Admin:** Monitor head office costs to prevent management wastefulness.

### **Earnings Quality**
* **The "Other Income" Trap:**
    * Exclude one-time events (Asset sales, "One Time Revenue", divestitures of business segments) from long-term valuation.
    * Ignore FX Gains/Losses as they are often "virtual" or temporary.
* **Profitability Floor:** Net Profit Margin (NPM) should be greater than $2%$.

## 3. Cash Flow Statement Checklist: The "Blood" of the Business

### **Cash Flow vs. Accounting Profit**
* **Reality Check:** Accounting profit is an opinion; Cash is a fact. High accounting profits must be validated by high **Operating Cash Flows**.
* **Value Trap Avoidance:** Discrepancies between Net Income and Operating Cash Flow indicate "Paper Profits" rather than actual liquidity.

### **Solvency & Sustainability**
* **Repayment Capacity:** It should not take more than 10 years to pay off total debt using operating cash flow.
* **Cash Flow to Debt Ratio:** $\\frac{\text{Operating Cash Flow}}{\text{Total Debt}} < 0.1$ is a potential warning sign.
* **Source of Cash:** Cash flow increases should originate from core business operations, not from capital injections (share issuance) or increased borrowing.

### **Shareholder Value**
* **Dividend Coverage:** Dividends paid should not exceed Free Cash Flow (FCF).
* **Dilution:** Avoid companies that are overly aggressive with Stock-Based Compensation (SBC) for employees.

## Key Formulas
* **Current Ratio:** $$\text{Current Ratio} = \\frac{\text{Current Assets}}{\text{Current Liabilities}}$$
* **Net Profit Margin:** $$\text{NPM} = \\frac{\text{Net Income}}{\text{Revenue}} \\times 100%$$
* **Cash Flow to Debt:** $$\text{CF to Debt Ratio} = \\frac{\text{Operating Cash Flow}}{\text{Total Debt}}$$
`,
};
