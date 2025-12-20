import type { Skill } from "../types.js";

export const sectorShariaBanking: Skill = {
  name: "sector-sharia-banking",
  description:
    "Core principles, transaction contracts (Akad), and specific financial ratios for Sharia (Islamic) banking analysis.",
  content: `
# Sharia Banking Fundamentals

Sharia banking operates under Islamic law, which prohibits interest and focuses on risk-sharing and real-asset-backed transactions.

## Core Prohibitions
To be Sharia-compliant, three elements must be avoided:
1. **Riba (Interest):** Predetermined interest on loans. Profit must come from trade or services, not just lending money.
2. **Gharar (Uncertainty/Speculation):** Transactions involving excessive ambiguity, hidden information, or high speculation (e.g., "pumping" stocks or unregulated crypto).
3. **Maysir (Gambling):** Profit from pure chance or speculative games (e.g., speculative forex trading).

## Transaction Contracts (Akad)
Analysis of Sharia banks requires understanding how they generate revenue without interest:

### 1. Trade & Lease (Fixed Margin)
*   **Murabahah (Cost-Plus Sale):** The bank buys a property/vehicle and sells it to the customer at a markup (margin) agreed upon upfront. The customer pays in installments.
*   **Ijarah (Leasing):** The bank buys an asset and rents it to the customer. Revenue is derived from the "rental margin" rather than interest.

### 2. Profit & Loss Sharing (Variable Margin)
*   **Mudharabah:** A partnership where the bank manages the customer's capital. Profits are shared according to a pre-agreed ratio ($PSR$). If the investment misses targets, the bank (as manager) receives no fee, while the customer (as investor) bears the financial loss.
*   **Musyarakah (Joint Venture):** Both the bank and the customer provide capital. Profits and losses are shared proportionally based on the capital contribution.

### 3. Social Lending
*   **Qardh:** An interest-free loan for social purposes (e.g., medical emergencies). The customer only pays back the principal, plus a small administrative fee.

## Key Performance Ratios
Sharia banks use specific metrics that correspond to conventional banking ratios:

### 1. FDR (Financing to Deposit Ratio)
Equivalent to the Loan to Deposit Ratio ($LDR$). It measures liquidity by comparing total financing to total third-party funds ($DPK$).
$$FDR = \frac{\text{Total Financing}}{\text{Total Third Party Funds (DPK)}} \times 100%$$
*   **Ideal Range:** $90-100%$.

### 2. NPF (Non-Performing Financing)
Equivalent to the Non-Performing Loan ($NPL$) ratio. It measures the quality of the financing portfolio.
$$NPF = \frac{\text{Problematic Financing}}{\text{Total Financing}} \times 100%$$
*   **Standard:** Healthy if $< 5%$; Ideal if $< 3%$.

### 3. PSR (Profit Sharing Ratio)
Unique to Sharia banking, this measures the portion of profit distributed to customers versus the portion kept by the bank.
$$PSR = \frac{\text{Profit Shared to Customers}}{\text{Total Bank Profit}} \times 100%$$
*   **High PSR (> 40%):** Generally more attractive to depositors but may lower bank profitability.

## Governance
Every Sharia bank is overseen by a **Sharia Supervisory Board (DPS)**. These experts ensure every product and investment complies with the rulings (fatwas) of the National Sharia Council (DSN-MUI).
`,
};
