import type { Skill } from "../types.js";

export const ipoAnalysis: Skill = {
  name: "ipo-analysis",
  description:
    "Analysis framework for Initial Public Offerings (IPO): why traditional analysis fails, role of underwriters, three key elements (Asset, Seller, Strategy), and manipulation patterns like price cooking.",
  content: `# IPO Analysis Framework

Initial Public Offerings (IPOs) in the modern "Stock Market 2.0" require a specific analytical approach, as traditional fundamental and technical analysis are often ineffective or impossible.

---

## 1. Why Traditional Analysis Fails

**Fundamental Analysis**:
- Prospectus financials are often "dressed up."
- Proceeds usage is future-based promise, not current reality.
- Many IPOs are exits for founders/VCs ("Finish Line"), not new beginnings.

**Technical Analysis**:
- No price history exists.
- Charts start from Day 1, making indicators (MA, RSI) useless.

**Valuation Control**:
- IPO Price is not set by market supply/demand.
- It is a negotiated figure between Owner and Underwriter.

---

## 2. The Three Essential Elements

To analyze an IPO effectively, evaluate these three components:

### A. The Asset (The Stock)
- **High Profile / Famous Brand**:
  - Easy to sell to retail.
  - Often lacks volatility (boring price action).
  - *Example*: GoTo, Bukalapak (at IPO).
- **Unknown / Obscure Company**:
  - Harder to sell, requires "marketing."
  - Often highly volatile (easy to pump).
  - High risk, high reward.

### B. The Seller (The Underwriter)
The Underwriter (UW) acts as the initial "Bandar."
- **Institutional UW**: Focus on placing large blocks to funds. Price tends to be stable but less explosive.
- **Retail UW**: Focus on distributing to public. Often associated with aggressive price action ("Gorengan").
- **Track Record**: Always check the historical performance of the specific Underwriter code (e.g., MG, YP, HD, EP, etc.) in their recent IPOs.

### C. The Selling Strategy
- **Primary Market (Pre-Listing)**: Distribution happens during bookbuilding/offering.
- **Secondary Market (Trading)**: Distribution happens after listing via active trading/manipulation.

---

## 3. IPO Manipulation Tactics

### Oversubscription & Scarcity Narrative
- **Tactic**: Limit retail allotment to create "Oversubscribed" news.
- **Effect**: Retailers get very few shares (0.1% of order), creating FOMO.
- **Goal**: Force retailers to chase the price up in the Regular Market on listing day.

### Price "Cooking" (Goreng Saham)
Common in smaller, unknown IPOs.
1. **Listing Day**: Price spikes to Auto Rejection Atas (ARA).
2. **Day 2-3**: Continued pump to attract attention.
3. **Retail Entry**: Once volume surges and retailers chase.
4. **Distribution**: Underwriter/Insiders dump shares.
5. **Collapse**: Price crashes, often below IPO price.

### The "Acceleration Board" Trap
- Stocks on the "Papan Akselerasi" (often annotated widely).
- **Risk**: Can drop to Rp 1 (not limited to Rp 50).
- **Strategy**: Avoid unless highly experienced.

---

## 4. e-IPO Strategy for Retail

### Asset Selection
- **Avoid Acceleration Board**: Unless you know the specific game.
- **Check Underwriter History**: Is this UW known for pumping or dumping?
- **Company Drivers**: Does the company have a "sexy" narrative (Tech, EV, Gold) vs boring (General Trade)?

### Execution
- **Diversification**: Don't go all-in on one IPO. Spread capital.
- **The "Flip" Strategy**:
  - IPOs are often short-term momentum plays.
  - If you get allotment, sell on the first sign of weakness (e.g., ARA breaks, heavy offer volume).
  - Don't "marry" an IPO stock for long-term hold unless proven otherwise over months.

---

## 5. Post-IPO Reality Check
- **Lock-up Period**: Check if pre-IPO shareholders are locked up (usually 8 months).
- **Lock-up Expiry**: Often triggers massive selling pressure.
- **Use of Proceeds**: Monitor if they actually do what they promised (e.g., buy land, build factory) or just pay off debt.
`,
};
