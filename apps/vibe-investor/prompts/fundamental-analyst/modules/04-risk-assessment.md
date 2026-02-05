# Risk Assessment Framework

This module provides frameworks for identifying value traps, detecting financial manipulation, and scoring risk using the IDX 2.0 risk model.

## 1. Value Trap Detection

A value trap occurs when a company's fundamental ratios appear attractive on paper but do not accurately reflect the company's true performance.

### Common Value Trap Pitfalls

| Metric | Surface Appearance | Potential Trap |
|--------|-------------------|----------------|
| Low PER | Looks cheap | One-time revenue inflating earnings |
| Low PBV | Looks undervalued | Low ROE indicates poor capital efficiency |
| High Dividend Yield | Looks attractive | Unsustainable payout, potential cut ahead |
| High ROE | Looks efficient | Excessive leverage inflating returns |

### Negative Value Traps

**Low PER from One-Time Revenue:**

- Gain from selling fixed assets or subsidiaries
- Large "Other Income" relative to operating income
- Insurance settlements or legal windfalls
- FX gains (often temporary/virtual)
- **Verification**: Check "Other Income" in income statement, read footnotes, calculate "Core Earnings PER" excluding non-recurring items

**Deteriorating Business (cheap for a reason):**

- Revenue declining for 2+ consecutive years
- Market share erosion
- Core product becoming obsolete
- Key customers leaving
- Management departures

**Low PBV + Low ROE Combination:**

- Low PBV with low ROE indicates poor capital efficiency, NOT a bargain
- Fair PBV = ROE × 10
- If actual PBV > Fair PBV, the stock may actually be OVERVALUED despite low PBV
- Example: PBV = 0.5x but ROE = 3% -> Fair PBV = 0.3x -> stock is overvalued

### Blue Chip Value Trap (IDX 2.0 Specific)

Even fundamentally strong blue chips can be value traps in the current market:

- Strong fundamentals (high ROE, consistent profits)
- Low valuation (P/E 7-10x, below historical average)
- BUT: Continued foreign selling pressure
- BUT: Low retail interest
- BUT: No bandar accumulation
- Result: Price stagnant or declining despite "cheap" valuation
- **Key Insight**: In Stock Market 2.0, "cheap" fundamentals alone don't drive prices

### Hidden Opportunities (Positive Traps)

**OCF >> Net Profit:**

- High depreciation reducing Net Profit
- Business generating strong cash despite "low" accounting earnings
- Calculate "Cash Earnings" = Net Profit + Depreciation

**Core Profitability Growing Despite Net Profit Decline:**

- Operating business improving
- "Below the line" items depressing Net Profit
- Recovery expected once non-recurring items clear

## 2. Financial Statement Manipulation Red Flags

### Income Statement Manipulation

| Signal | What to Check | Threshold |
|--------|--------------|-----------|
| Revenue without cash | Cash Receipt to Sales Ratio | Should be >90% |
| Paper profits only | Operating Cash Flow vs Net Profit | OCF should track NP |
| Aggressive depreciation | Depreciation period for assets | Compare to industry norms |

**Specific Checks:**

1. Cash Receipt to Sales = Cash Received from Customers / Revenue (if <90%, sales may be fictitious)
2. Positive Net Profit with Negative/Volatile OCF = pattern suggests earnings manipulation
3. Unusually long depreciation periods = extends asset life to minimize expenses

### Balance Sheet Manipulation

| Signal | What to Check |
|--------|--------------|
| Decreasing cash | Cash levels falling while AR/Inventory rising |
| Receivables piling up | Days Sales Outstanding (DSO) |
| Inventory bloating | Days Inventory Outstanding (DIO) |

**Thresholds:**

- DSO > 60 days: Investigate collection issues
- DIO > 60 days: Investigate demand issues or obsolescence

### Hidden Profit Extraction

Watch for these methods:

1. Inflating inventory values (overstating ending inventory)
2. Manipulating receivables (fictitious sales to related parties)
3. Overstating prepayments (hiding cash transfers)
4. Overpriced fixed asset purchases (paying above market to related parties)

**Verification:** Check related party transactions in notes, compare asset purchase prices to market, watch for unusual increases in "Other Assets."

## 3. Value Trap Checklist

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

## 4. IDX 2.0 Risk Framework

**Risk = chance of being trapped × severity of damage** (not just volatility).

### The 4 Core Risks

1. **Flow / Distribution Risk (Bandar Risk)**
   - Are you buying into accumulation or becoming exit liquidity?
   - Highest priority because flow often overrides fundamentals

2. **Narrative Failure Risk**
   - What story moves the stock, and what event makes it wrong?
   - If the story breaks, price can re-rate instantly

3. **Liquidity / Exit Risk**
   - Can you exit fast without crashing the price?
   - Thin liquidity turns "small loss" into "can't sell"

4. **Dilution / Funding Risk**
   - Does the thesis require new money (RI/placement/warrants) that can dilute?
   - Common in capex/project stories

### Quick Scoring (0-3 each)

Score each: **0 = low**, **1 = manageable**, **2 = high**, **3 = extreme**

**Total = 0-12**

- **0-4:** Lower risk (can size larger)
- **5-8:** Medium risk (moderate size, strict plan)
- **9-12:** High risk (small size / trading only)

### Hard Rules (Gates)

- If **Flow risk = 3** -> avoid unless scalping
- If **Liquidity risk = 3** -> position must be small regardless of upside
- If **Dilution risk = 3** -> don't size up until funding is clear

### One-line Margin of Safety (IDX 2.0)

Margin of safety = (not distribution) + (exit is easy) + (thesis not binary) + (no dilution surprise)

## 5. Altman Z-Score Integration

Use as a bankruptcy screening tool:

- **Z > 3.0** (Safe Zone): Financially healthy, low bankruptcy risk
- **Z 1.8-3.0** (Grey Zone): Caution needed, warning signs appearing
- **Z < 1.8** (Distress Zone): High probability of bankruptcy

**Note**: Z-score is most reliable for manufacturing companies. Use modified versions for financial and service companies.
