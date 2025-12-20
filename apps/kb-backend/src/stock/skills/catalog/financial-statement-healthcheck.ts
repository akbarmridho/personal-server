import type { Skill } from "../types.js";

export const financiaStatementlHealthCheck: Skill = {
  name: "financial-statement-health-check",
  description:
    "A comprehensive checklist for identifying red flags and verifying the integrity of financial statements across the Balance Sheet, Income Statement, and Cash Flow Statement.",
  content: `
# Financial Statement Health Checklist

This skill provides a framework for analyzing the quality of a company's financial health by examining key accounting relationships and detecting potential red flags.

## 1. Balance Sheet Checklist
*   **Liquidity Ratios:**
    *   **Current Ratio Check:** Verify if $\text{Current Assets} < \text{Current Liabilities}$.
    *   **Quick Ratio Check:** Ensure $\text{Quick Ratio} < 0.5$ (conservative liquidity assessment).
*   **Asset Quality:**
    *   **Inventory Control:** The percentage increase in inventory should be lower than the percentage increase in profit ($%Delta \text{Inventory} < \text{Profit Growth}$).
    *   **Other Assets Limit:** "Other Assets" (Aset Lain-lain) should not exceed $5%$ of Total Assets.

## 2. Income Statement Checklist
*   **Earnings Quality:**
    *   Ensure drastic profit increases are not driven by one-time events like asset sales or foreign exchange (FX) gains.
    *   Exclude "One Time Revenue" or profits from selling business segments from long-term valuations.
*   **Cash Flow Alignment:** High accounting profits must be supported by high Operating Cash Flows.
*   **Efficiency & Margins:**
    *   **Receivables:** Days Sales Outstanding (DSO) should be less than 90 days.
    *   **Profitability:** Net Profit Margin (NPM) should be greater than $2%$.
    *   **Cost Management:** Operating Expenses should not grow at a faster rate than Revenue growth.

## 3. Cash Flow Statement Checklist
*   **Solvency & Debt:**
    *   **Repayment Capacity:** It should not take more than 10 years to pay off total debt using operating cash flow.
    *   **Cash Flow to Debt Ratio:** $\frac{\text{Operating Cash Flow}}{\text{Total Debt}} < 0.1$ is a potential warning sign.
*   **Sustainability:**
    *   **Source of Cash:** Cash flow increases should originate from core business operations, not from capital injections (share issuance) or increased borrowing.
    *   **Sales Consistency:** Operations cash flow should be consistent with sales trends.
*   **Shareholder Value:**
    *   **Dividend Coverage:** Dividends paid should not exceed Free Cash Flow (FCF).
    *   **Dilution:** Avoid companies that are overly aggressive with Stock-Based Compensation (SBC) for employees.

## Key Formulas
*   **Current Ratio:** $$\text{Current Ratio} = \frac{\text{Current Assets}}{\text{Current Liabilities}}$$
*   **Net Profit Margin:** $$\text{NPM} = \frac{\text{Net Income}}{\text{Revenue}} \times 100%$$
*   **Cash Flow to Debt:** $$\text{CF to Debt Ratio} = \frac{\text{Operating Cash Flow}}{\text{Total Debt}}$$
`,
};
