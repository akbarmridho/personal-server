import type { Skill } from "../types.js";

export const fundamentalAnalysisNarrative: Skill = {
  name: "fundamental-analysis-narrative",
  description:
    "Structured checklist for fundamental stock analysis in narrative POV: business reality, future, owners, ownership map, and price behavior.",
  content: `
## Fundamental Analysis Checklist

### 1. Basic Filters

- **Company existence**
  - Does the company actually exist and operate today?

- **Bankruptcy risk**
  - Could the company realistically go bankrupt? (check Altman Z-score)
  - Z-score interpretation:
    - > 3.0 (Safe Zone): Financially healthy, low bankruptcy risk
    - 1.8 - 3.0 (Grey Zone): Caution needed, warning signs appearing
    - < 1.8 (Distress Zone): High probability of bankruptcy

- **Future prospects**
  - Does the company have a long-term future?

- **Business growth**
  - Is the business still growing?

- **Business model understanding**
  - What is the company business model?
  - How does the company make money?

### 2. Future Existence and Quality

- Will the company likely still operate in the future?
- Will it likely still be profitable?
- Will it likely continue paying dividends?
- Is it still worth holding for long-term investors?

### 3. Business Excitement & Growth Story

- Is the business still exciting for the future?
- Are there new things in the business that can attract investor imagination?
- Are there still many opportunities for expansion and new profit?
- Note: Some companies are profitable but not exciting (e.g., mature food companies), so they are harder for the market to "pump" or re-rate aggressively.

### 4. Owner & Major Shareholder Character

- Know the character of the owner and majority shareholders:
  - What are the owners’ goals?
  - Do they routinely share profits via dividends?
  - Do they often raise money from the public (rights issues, REPO, etc.)?
  - Do they have an ambition to become ultra-rich at all costs?

### 5. Ownership Map (Shareholding Structure)

- How is the share ownership structured?
  - Is the stock still held by large investors?
  - Is it held by foreign investors?
  - Is there a clear controlling shareholder or parent company?

### 6. Price Movement vs Recent History

- Has the price movement made sense relative to:
  - The last 6 months?
  - The last 1 year?

- Current price context:
  - Is the current price still cheap relative to recent history?
  - Has the price started to go up?
  - Is the price moving sideways (consolidating)?
`,
};
