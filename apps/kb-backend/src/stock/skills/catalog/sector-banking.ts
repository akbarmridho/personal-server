import type { Skill } from "../types.js";

export const sectorBanking: Skill = {
  name: "sector-banking",
  description:
    "Comprehensive guide to banking business models, funding structures, and key financial ratios like CASA, NIM, LDR, and CAR.",
  content: `
# Banking Sector Analysis Fundamentals

The core business of a bank is acting as a financial intermediary—effectively "buying and selling money." They collect funds from depositors at lower interest rates and distribute them to borrowers at higher interest rates.

### 1. Core Revenue Streams
*   **Net Interest Income (NII):** The difference between interest earned from loans (Lending) and interest paid to depositors (Funding).
*   **Fee-Based Income (Non-Interest Income):** Revenue from administrative fees, transfers, bancassurance commissions, and wealth management fees.

### 2. Funding Structure (Third-Party Funds / DPK)
Banks collect money through three main products with varying costs:
*   **Giro (Current Account):** Lowest interest rate ($0.1% - 0.5%$), used for high-frequency business transactions.
*   **Tabungan (Savings):** Moderate interest rate ($1% - 2%$).
*   **Deposito (Time Deposit):** Highest interest rate ($4% - 6%$), locked for a specific period.

### 3. Key Financial Ratios

#### CASA Ratio (Current Account Saving Account)
Measures the proportion of "cheap funds" (Giro + Savings) relative to total deposits.
$$CASA Ratio = \frac{Saldo Giro + Saldo Tabungan}{Total Dana Pihak Ketiga (DPK)} \times 100%$$
*   **Higher CASA:** Lower **Cost of Fund (CoF)**, leading to wider profit margins.

#### NIM (Net Interest Margin)
Measures the efficiency of a bank in deploying its funds to generate income.
$$NIM = \frac{Net Interest Income}{Total Earning Assets} \times 100%$$
*   **Higher NIM:** Indicates the bank is highly profitable in its lending activities.

#### LDR (Loan to Deposit Ratio)
Measures liquidity by comparing total loans to total deposits.
$$LDR = \frac{Total Loans}{Total DPK} \times 100%$$
*   **Ideal Range:** $80% - 92%$.
*   **Too High (>100%):** Aggressive lending, potential liquidity risk.
*   **Too Low (<75%):** Conservative, idle funds, inefficient.

#### CAR (Capital Adequacy Ratio)
Measures the bank's capital strength to absorb potential losses.
$$CAR = \frac{Capital}{Total Risk-Weighted Assets} \times 100%$$
*   **Minimum Requirement:** $8%$ (in Indonesia). Higher CAR indicates a safer bank.

### 4. Risk and Efficiency Ratios

#### NPL (Non-Performing Loan)
Measures the percentage of "bad" or risky loans. 
*   **NPL Gross:** Total problematic loans (Level 3-5) before reserves.
*   **NPL Net:** Problematic loans after deducting specific reserves (**CKPN**).
*   **Limit:** Bank Indonesia typically expects NPL Gross to stay below $5%$.

#### BOPO & CIR
Focuses on operational efficiency.
*   **BOPO:** Operating Expenses / Operating Income. A lower ratio (e.g., $80%$) is more efficient than a higher one (e.g., $95%$).
*   **CIR (Cost to Income Ratio):** Similar to BOPO but usually excludes loan loss provisions (**CKPN**).

#### PPOP (Pre-Provision Operating Profit)
Reflects the core business strength before accounting for credit risk reserves.
$$PPOP = (Net Interest Income + Non-Interest Income) - Operating Expenses$$

### 5. Regulatory Requirements
*   **GWM (Giro Wajib Minimum):** Minimum reserve requirements held at the Central Bank to ensure liquidity.
*   **BMPK:** Legal lending limits to single borrowers ($20%$) or groups ($25%$) to prevent concentration risk.
`,
};
