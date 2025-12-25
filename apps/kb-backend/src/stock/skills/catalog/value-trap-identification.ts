import type { Skill } from "../types.js";

export const valueTrapIdentification: Skill = {
  name: "value-trap-identification",
  description:
    "How to identify value traps: low PER/PBV pitfalls, one-time revenue inflation, hidden opportunities, and financial statement manipulation red flags.",
  content: `# Value Trap Identification

A value trap occurs when a company's fundamental ratios appear attractive (low valuation) or unattractive (high valuation) on paper, but do not accurately reflect the company's true performance.

---

## 1. Common Value Trap Pitfalls

### The Screener Trap
Investors often rely solely on automated screeners without analyzing underlying drivers. A stock appearing "cheap" on PER, PBV, or other metrics may be cheap for a reason.

### Metrics That Commonly Mislead

| Metric | Surface Appearance | Potential Trap |
|--------|-------------------|----------------|
| Low PER | Looks cheap | One-time revenue inflating earnings |
| Low PBV | Looks undervalued | Low ROE indicates poor capital efficiency |
| High Dividend Yield | Looks attractive | Unsustainable payout, potential cut ahead |
| High ROE | Looks efficient | Excessive leverage inflating returns |

---

## 2. Identifying Negative Value Traps

### Low PER from One-Time Revenue
When low PER is caused by non-operational, non-recurring income:

**Red Flags**:
- Gain from selling fixed assets
- Gain from selling subsidiaries or business segments
- Large "Other Income" relative to operating income
- Insurance settlements or legal windfalls
- FX gains (often temporary/virtual)

**Verification**:
1. Check "Other Income / Other Revenue" in income statement
2. Read notes to financial statements for one-time items
3. Calculate "Core Earnings PER" excluding non-recurring items

### Low PER/PBV from Genuinely Deteriorating Business
The stock is cheap because the business is actually failing:

**Red Flags**:
- Revenue declining for 2+ consecutive years
- Market share erosion
- Core product becoming obsolete
- Key customers leaving
- Management departures

### Low PBV + Low ROE Combination
A low PBV with low ROE indicates poor capital efficiency, NOT a bargain.

**The Math**:
$$If\\ PBV = 0.5x\\ but\\ ROE = 3\\%$$
- Fair PBV (using ROE × 10 rule) = 0.3x
- Stock may actually be OVERVALUED despite low PBV

**Verification**:
- Calculate Fair PBV = ROE × 10
- Compare Fair PBV to actual PBV
- If actual PBV > Fair PBV, it's NOT cheap

---

## 3. Identifying Hidden Opportunities (Positive Traps)

Sometimes a stock looks expensive or unattractive but is actually undervalued.

### OCF Significantly Higher than Net Profit
When Operating Cash Flow exceeds Net Profit due to large non-cash expenses:

**Opportunity Signal**:
- High depreciation reducing Net Profit
- Business generating strong cash despite "low" accounting earnings
- Actual cash generation power understated by GAAP

**Verification**:
1. Compare Net Profit to Operating Cash Flow
2. Identify depreciation/amortization as % of Net Profit
3. Calculate "Cash Earnings" = Net Profit + Depreciation

### Core Profitability Growing Despite Net Profit Decline
When Gross/Operating Profit grows but Net Profit falls due to non-operational items:

**Opportunity Signal**:
- Operating business improving
- "Below the line" items (interest, FX, one-time costs) depressing Net Profit
- Recovery expected once non-recurring items clear

**Verification**:
1. Track Gross Profit Margin trend
2. Track Operating Profit Margin trend
3. Identify what's causing Net Profit to underperform

---

## 4. Financial Statement Manipulation Red Flags

### Income Statement Manipulation

**Goal**: Beautify revenue or profit for management bonuses or stock price inflation.

**Red Flags**:

| Signal | What to Check | Threshold |
|--------|--------------|-----------|
| Revenue without cash | Cash Receipt to Sales Ratio | Should be >90% |
| Paper profits only | Operating Cash Flow vs Net Profit | OCF should track NP |
| Aggressive depreciation | Depreciation period for assets | Compare to industry norms |

**Specific Checks**:
1. **Sales growth not in cash receipts**:
   $$Cash\\ Receipt\\ to\\ Sales = \\frac{Cash\\ Received\\ from\\ Customers}{Revenue}$$
   - If significantly below 90%, sales may be fictitious

2. **Positive Net Profit, Negative/Volatile OCF**:
   - Consistent pattern suggests earnings manipulation
   - One-off is okay, pattern is concerning

3. **Unusually long depreciation periods**:
   - Extends asset life to minimize expenses
   - Compare to competitors' depreciation policies

---

### Balance Sheet Manipulation

**Goal**: Make company look healthier for bank loans or higher acquisition valuation.

**Red Flags**:

| Signal | What to Check |
|--------|--------------|
| Decreasing cash | Cash levels falling while AR/Inventory rising |
| Receivables piling up | Days Sales Outstanding (DSO) |
| Inventory bloating | Days Inventory Outstanding (DIO) |

**Thresholds**:
- DSO > 60 days: Investigate collection issues
- DIO > 60 days: Investigate demand issues or obsolescence
- Compare to industry norms for context

---

### Hidden Profit Extraction

Companies may extract profits without paying dividends through accounting maneuvers:

**Methods to Watch**:
1. **Inflating inventory values**: Overstating ending inventory to boost profits
2. **Manipulating receivables**: Recognizing fictitious sales to related parties
3. **Overstating prepayments**: Hiding cash transfers as "prepaid expenses"
4. **Overpriced fixed asset purchases**: Paying above market to related parties

**Verification**:
- Check related party transactions in notes
- Compare asset purchase prices to market
- Watch for unusual increases in "Other Assets"

---

## 5. Value Trap Checklist

### Before Buying a "Cheap" Stock

- [ ] Is low PER from recurring operating income?
- [ ] Is low PBV justified by adequate ROE (>10%)?
- [ ] Is revenue trend positive or at least stable?
- [ ] Does OCF track Net Profit (Quality of Earnings)?
- [ ] Are DSO and DIO within industry norms (<60 days)?
- [ ] Cash Receipt to Sales Ratio >90%?
- [ ] No unusual related party transactions?
- [ ] Gross/Operating margins stable or improving?

### When to Avoid Despite "Cheap" Valuation

- PER low due to asset sales or one-time gains
- PBV low AND ROE low (<8%)
- Revenue declining for 2+ years
- OCF negative while Net Profit positive
- High DSO/DIO with no clear explanation
- Significant related party receivables

---

## 6. Blue Chip Value Trap (IDX Specific)

In the current Indonesian market (Stock Market 2.0), even fundamentally strong blue chips can be value traps:

**Blue Chip Trap Characteristics**:
- Strong fundamentals (high ROE, consistent profits)
- Low valuation (P/E 7-10x, below historical average)
- BUT: Continued foreign selling pressure
- BUT: Low retail interest
- BUT: No bandar accumulation
- Result: Price stagnant or declining despite "cheap" valuation

**Examples**: BBCA, BBRI, TLKM, ASII in 2024-2025

**Key Insight**: In Stock Market 2.0, "cheap" fundamentals alone don't drive prices. Check bandar flow and narrative before buying even blue chips.
`,
};
