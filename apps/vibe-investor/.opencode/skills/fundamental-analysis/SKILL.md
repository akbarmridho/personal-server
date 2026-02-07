---
name: fundamental-analysis
description: Expert fundamental analysis for IDX stocks — financial statement health checks, 8 valuation methods (EPS Discounted, ROE-PBV, DCF, DDM, etc.), company quality and moat assessment, risk scoring (IDX 2.0 framework), and sector-specific frameworks (banking, coal, property).
---

## Data Sources

**MCP Tools (call in parallel for full analysis):**

- **`get-stock-fundamental`** — Key statistics, financial ratios (10-year history). Primary data source.
- **`get-stock-financials`** — Income statement, balance sheet, cash flow (quarterly, annual, TTM).
- **`get-stock-governance`** — Management team, ownership structure, insider activity.
- **`get-sectors`** / **`get-companies`** — Sector/subsector discovery, peer comparison.

**Knowledge Base:** `search-documents`, `list-documents`, `get-document` for filings, analyst research, news.

**Knowledge Catalog:** `list-knowledge`, `get-knowledge` for sector-specific deep knowledge (banking metrics, coal analysis, property NAV, etc.). Always check catalog for sector-specific frameworks before relying on general rules.

**Ownership interpretation (knowledge):**
- `get-knowledge ownership-entities-custody-vs-active` — avoid misreading custodian/BUT names as “active trading drivers”.

**Banking asset-quality (knowledge):**
- `get-knowledge bank-ckpn-writeoff-overdue-diagnostics` — CKPN/provisi/hapusbuku vs real improvement (overdue + repayment vs accounting “cleaning”).

---

## Analysis Workflow

### Phase 1: Data Collection (Parallel)

Call in parallel: `get-stock-fundamental` + `get-stock-financials` + `get-stock-governance` + `search-documents` for the symbol.

### Phase 2: Systematic Analysis (Sequential)

1. **Financial Health** (Module 1) — Balance sheet, income, cash flow checklists + advanced ratios + multi-period trends
2. **Valuation** (Module 2) — 2-3 methods minimum, calculate MoS, cross-validate
3. **Company Quality** (Module 3) — Moat, ownership, management, growth story
4. **Risk Assessment** (Module 4) — Value trap check, manipulation flags, IDX 2.0 risk score
5. **Sector Context** — Use `get-knowledge` from knowledge catalog for sector-specific metrics and peer comparison

### Phase 3: Synthesis

Consolidate findings, identify conflicts/confirmations, form fundamental verdict with confidence level.

---

## Module 1: Financial Statements

### Balance Sheet Checklist

**Asset Alignment:**

- Re-categorize into Working Capital (cash, receivables, inventory) vs Fixed Assets (infrastructure)
- Heavy industry → high fixed assets. Financial/service → high working capital.
- Red flag: significant misalignment with industry

**Liquidity & Quality:**

- [ ] Current Ratio: flag if Current Assets < Current Liabilities
- [ ] Quick Ratio: flag if < 0.5
- [ ] Inventory Control: %Δ Inventory should be < Profit Growth
- [ ] "Other Assets" (Aset Lain-lain) should not exceed 5% of Total Assets

**Debt Composition:**

- **Business Payables** (interest-free, from suppliers) = good debt, indicates bargaining power
- **Business Loans** (interest-bearing) = bad debt if excessive
- High DER may be acceptable if primarily business payables
- Verify equity growth: Accumulated Profits (organic) vs Capital Injections (rights issues)

### Income Statement Checklist

**Revenue:**

- [ ] Analyze footnotes: main business = primary revenue driver?
- [ ] Commodity sensitivity: beneficiary or victim of raw material price changes?

**Costs & Margins:**

- COGS: Fixed costs (depreciation) vs Variable costs (raw materials)
- Rising COGS + stagnant revenue → inefficiency or no pricing power
- Margin vs Turnover: Luxury/Property = high margin, low turnover. Retail = low margin, high turnover.
- SGA: marketing spend must correlate with revenue growth. Monitor admin costs.

**Earnings Quality:**

- [ ] Exclude one-time items (asset sales, FX gains) from valuation
- [ ] NPM > 2% (profitability floor)

### Cash Flow Checklist

- [ ] OCF validates accounting profit (cash is fact, profit is opinion)
- [ ] OCF/Net Profit divergence → paper profits (value trap signal)
- [ ] Repayment capacity: <10 years to pay total debt from OCF
- [ ] Cash Flow to Debt: OCF/Total Debt > 0.1
- [ ] Cash increases from operations, not capital injections or borrowing
- [ ] Dividends ≤ Free Cash Flow
- [ ] Watch for aggressive Stock-Based Compensation

### Advanced Ratios

| Ratio | Formula | Benchmark |
|-------|---------|-----------|
| ICR | Operating Profit / Interest Expense | <1.0 DANGER, >3.0 Safe |
| NGR | (Interest Bearing Debt − Cash) / Equity | <0.5 (50%) Ideal |
| Earnings Yield | EPS / Price | Compare with Gov Bond Yield |
| EV/EBITDA | Enterprise Value / EBITDA | <10x generally cheap |

### Multi-Period Trend Analysis

- Minimum 3 years for trends, 5-10 years for cyclicals, QoQ for recent momentum

Track over time:

- Revenue growth trajectory (accelerating/decelerating/declining)
- Margin trends (expanding/stable/compressing)
- ROE consistency (stable >10% = quality)
- Cash conversion (OCF/Net Profit)
- Debt trajectory
- Dividend payout sustainability

### Key Formulas

- **Current Ratio:** Current Assets / Current Liabilities
- **NPM:** (Net Income / Revenue) × 100%
- **Cash Flow to Debt:** OCF / Total Debt
- **FCF:** OCF − CapEx
- **DER:** Total Debt / Total Equity

---

## Module 2: Valuation

### Core Concepts

- **Market Price** = short-term sentiment. **Intrinsic Value** = business fundamentals.
- **IDX 2.0 Reality**: Intrinsic value is a FILTER, not a price driver. Stock can stay below IV if flow/narrative don't support it.

**Margin of Safety:** MOS = ((IV − Price) / IV) × 100%

| MOS | Assessment | Action |
|-----|------------|--------|
| < 0% | Overvalued | Avoid / Sell |
| 0-30% | Fair Price | Hold |
| > 30% | Undervalued | Buy (if other factors align) |

For high-risk companies: require ~50% MOS.

### Method Selection

| Method | Best For | Avoid When |
|--------|----------|------------|
| **EPS Discounted** | Consistent positive profit trends | Erratic/negative earnings |
| **Equity Growth** | Inconsistent profits, positive equity trend | Negative/declining equity |
| **ROE-PBV** | High, stable ROE | Volatile/low ROE |
| **DCF** | Positive, predictable FCF | Negative/erratic FCF |
| **Asset-Based** | Asset-heavy (property) | Service/tech companies |
| **DDM** | Consistent dividend payers | Non-dividend stocks |
| **P/S (Tech)** | Pre-profit tech companies | Profitable mature companies |

### 1. EPS Discounted Model

1. Current BVPS = Total Equity / Shares Outstanding
2. Current EPS = Net Profit / Shares Outstanding
3. Growth rate = CAGR of net profits (3-10y), **cap at 15%**
4. Project EPS 5 years: Year N EPS = Prev × (1 + Growth)
5. Discount to PV: PV = Future EPS / (1 + Discount Rate)^n (typically 7%)
6. **IV = BVPS + Sum of Discounted Future EPS**

### 2. Equity Growth Model

1. ROE = (Net Profit / Total Equity) × 100%
2. Project BVPS 5 years: Year N BVPS = Prev × (1 + ROE)
3. **IV = Future BVPS at Year 5** (no discounting — balance sheet reflects inflation)

### 3. ROE-PBV Model

| ROE | Fair PBV |
|-----|----------|
| 10% | 1.0x |
| 20% | 2.0x |
| 30% | 3.0x |

**Formula:** Fair PBV = ROE × 10 → **IV = Fair PBV × BVPS**

**Value Trap Check:** Low PBV + Low ROE is NOT a bargain. If actual PBV > Fair PBV → overvalued despite appearing cheap.

### 4. DCF (Discounted Cash Flow)

1. FCF = OCF − CapEx → FCF per Share
2. WACC = (%Equity × CAPM) + (%Debt × After-tax Debt Rate)
   - CAPM = Risk Free + Beta × (Market Return − Risk Free)
3. Sustainable Growth = Sustainable ROE × (1 − Payout Ratio), cap at 4%, must be < WACC
4. Terminal Value = (FCF final × (1 + Growth)) / (WACC − Growth)
5. **IV = Sum of PV of Projected FCF + PV of Terminal Value**

### 5. DDM (Dividend Discount Model)

1. Cash Retained = Net Profit − Dividends Paid
2. Cash Required = Net Profit × (1 − Avg Payout Ratio)
3. Excess Retained per Share = (Cash Retained − Cash Required) / Shares
4. Adjusted Dividend = DPS + Excess Retained
5. **IV = (Adj Dividend × (1 + Growth)) / (WACC − Growth)**

### 6. Asset-Based (NAV)

1. Asset Market Value (e.g., Landbank × Current Price/hectare)
2. Net Debt = Interest Bearing Debt + Advances − Cash
3. NAV = Asset Market Value − Net Debt → NAV per Share
4. Apply sector discount (property: ~40-60% to NAV)

### Cross-Validation

- Always 2-3 methods minimum. Weight by company characteristics.
- If methods diverge significantly, investigate why.
- Use conservative estimates, cap growth at 15%, prefer historical averages over guidance.

**Valuation barriers** (difficult to value): negative FCF, continuous losses, negative equity, manipulation signs, pre-revenue companies.

---

## Module 3: Company Quality

### Business Model Understanding

Before analysis: What does the company do? How does it make money? Revenue segments? Customers/suppliers? Competitive landscape?

**Basic Filters:**

- [ ] Company exists and operates today?
- [ ] Bankruptcy risk? (Altman Z: >3.0 safe, 1.8-3.0 grey, <1.8 distress)
- [ ] Long-term future prospects?
- [ ] Business still growing?

### Economic Moat

**Sources:**

| Source | Description | IDX Examples |
|--------|-------------|-------------|
| Intangible Assets | Brands, patents, exclusive licenses | Aqua, Indomie, Astra/Toyota |
| Network Effect | Value grows with users | Indomaret/Alfamart, Tokopedia |
| Switching Costs | Financial/time/data costs to switch | Banking, enterprise software |
| Barriers to Entry | Regulatory, tech, capital, scale | Banking (capital), Mining (permits) |

**Financial Indicators of Moat:**

- FCF positive 5+ consecutive years
- ROE consistently >10%
- GPM maintained >40%
- Stable/growing market share 5+ years
- Pricing power (raise prices without losing customers)
- Low customer concentration

**Moat Checklist:**

- [ ] Strong brands, patents, or licenses?
- [ ] Network effect present?
- [ ] Customer switching costs high?
- [ ] New competitors can easily replicate?
- [ ] FCF positive 5+ years?
- [ ] ROE consistently >10%? GPM >40%?
- [ ] Market share stable/growing?

**Moat Erosion Signs:** Declining share, margin compression, tech disruption, regulatory changes, customer concentration increasing, well-funded new entrants.

### Industry Lifecycle

| Stage | Characteristics | Investment Approach |
|-------|----------------|-------------------|
| Introduction | High risk, no track record | Speculative, small positions |
| Growth | Rapid expansion | Focus on market leaders |
| Maturity | Slowing growth, stable profits | Efficiency leaders, dividends |
| Decline | Shrinking market, value traps | Avoid or short-term tactical |

### Market Structure (Pricing Power)

| Structure | Pricing Power | IDX Examples |
|-----------|--------------|-------------|
| Monopoly | Maximum (price setter) | PLN, Telkom legacy |
| Oligopoly | High (coordination) | BBCA, SMGR |
| Monopolistic Competition | Moderate (differentiation) | Strongest brands |
| Perfect Competition | None (price takers) | Thin margins, avoid |

### Ownership Analysis

- [ ] Clear controlling shareholder/parent?
- [ ] Free float percentage?
- [ ] Institutional/foreign holders? (flow implications)
- [ ] Recent changes in major shareholders?

**Common pitfall:** large “big bank” names in ownership lists often represent **custody/nominee** holdings, not active trading desks. Use `get-knowledge ownership-entities-custody-vs-active` before concluding “foreign whale is actively driving price”.

**Owner Character:**

- Goals: Growth or cash extraction?
- Dividend philosophy: routinely share profits?
- Capital raising: frequent rights issues/REPO?
- Track record with minority shareholders?

### Management Quality

**Governance:** Board independence, compensation vs performance, related party transactions, capital allocation, transparency.

**Red Flags:** Frequent turnover, excessive related party deals, compensation > profit growth, bad acquisitions, low insider ownership.

### Growth Story & Re-rating

- Is the business still exciting for the future?
- New growth vectors that attract investor imagination?
- Expansion opportunities remaining?
- Growing or shrinking addressable market?
- Catalyst for market re-rating?
- Transitioning to higher-growth segment?

---

## Module 4: Risk Assessment

### Value Trap Detection

| Metric | Surface | Trap |
|--------|---------|------|
| Low PER | Cheap | One-time revenue inflating earnings |
| Low PBV | Undervalued | Low ROE = poor capital efficiency |
| High Div Yield | Attractive | Unsustainable payout |
| High ROE | Efficient | Excessive leverage |

**Low PER traps:** Asset sales, large "Other Income", insurance/legal windfalls, FX gains. Verify: check footnotes, calculate Core Earnings PER.

**Deteriorating business (cheap for a reason):** Revenue declining 2+ years, market share erosion, obsolete products, key customer/management departures.

**Low PBV + Low ROE:** Fair PBV = ROE × 10. Example: PBV 0.5x but ROE 3% → Fair PBV 0.3x → actually overvalued.

**Blue Chip Value Trap (IDX 2.0):** Strong fundamentals + low valuation BUT continued foreign selling, no retail interest, no bandar accumulation → price stagnant. "Cheap" fundamentals alone don't drive prices.

**Hidden Opportunities:** OCF >> Net Profit (high depreciation masking cash generation). Core profitability growing despite net profit decline.

### Financial Manipulation Red Flags

**Income Statement:**

| Signal | Check | Threshold |
|--------|-------|-----------|
| Revenue without cash | Cash Receipt to Sales | >90% |
| Paper profits | OCF vs Net Profit | Should track |
| Aggressive depreciation | Period vs industry norms | Compare |

**Balance Sheet:**

| Signal | Check |
|--------|-------|
| Cash decreasing | While AR/Inventory rising |
| Receivables piling | DSO > 60 days |
| Inventory bloating | DIO > 60 days |

**Hidden Profit Extraction:** Inflating inventory values, fictitious sales to related parties, overstated prepayments, overpriced asset purchases from related parties. Verify via related party transaction notes.

### Value Trap Checklist

**Before buying "cheap" stock:**

- [ ] Low PER from recurring operating income?
- [ ] Low PBV justified by ROE >10%?
- [ ] Revenue trend positive/stable?
- [ ] OCF tracks Net Profit?
- [ ] DSO and DIO < 60 days?
- [ ] Cash Receipt to Sales > 90%?
- [ ] No unusual related party transactions?
- [ ] Margins stable/improving?

**Avoid despite "cheap":** PER low from one-time gains, PBV low + ROE <8%, revenue declining 2+ years, negative OCF + positive NP, high DSO/DIO, significant related party receivables.

### IDX 2.0 Risk Framework

**Risk = chance of being trapped × severity of damage**

**4 Core Risks (score 0-3 each, total 0-12):**

| Risk | Question |
|------|----------|
| **Flow/Distribution** | Buying into accumulation or exit liquidity? (highest priority — overrides fundamentals) |
| **Narrative Failure** | What story moves the stock? What event breaks it? |
| **Liquidity/Exit** | Can you exit fast without crashing price? |
| **Dilution/Funding** | Does thesis require new money (RI/warrants) that dilutes? |

**Scoring:** 0 = low, 1 = manageable, 2 = high, 3 = extreme

- **0-4:** Lower risk (can size larger)
- **5-8:** Medium risk (moderate size, strict plan)
- **9-12:** High risk (small size / trading only)

**Hard Rules:**

- Flow = 3 → avoid unless scalping
- Liquidity = 3 → small position regardless of upside
- Dilution = 3 → don't size up until funding clear

**One-line MoS (IDX 2.0):** MoS = (not distribution) + (easy exit) + (thesis not binary) + (no dilution surprise)

### Altman Z-Score

- **Z > 3.0** Safe Zone: healthy, low bankruptcy risk
- **Z 1.8-3.0** Grey Zone: caution, warning signs
- **Z < 1.8** Distress Zone: high bankruptcy probability

Most reliable for manufacturing. Use modified versions for financial/service.

---

## Sector-Specific Analysis

For sector-specific metrics, benchmarks, and frameworks, use the **knowledge catalog**:

1. `list-knowledge` to discover available entries (filter by category if needed)
2. `get-knowledge` to load the relevant framework (banking, coal, property, consumer, telco, etc.)

The knowledge catalog contains deep sector knowledge including key metrics, valuation methods, regulatory context, and peer comparison frameworks that are maintained separately and updated independently.

---

## Output Report Structure

**A. Company Overview** — Ticker, date, sector, price, market cap, business model (1-2 sentences)

**B. Financial Health Summary**

| Category | Status | Key Metric | Trend |
|----------|--------|------------|-------|
| Liquidity | HEALTHY/WARNING/DANGER | Current Ratio | Improving/Stable/Deteriorating |
| Solvency | | DER, ICR | |
| Profitability | | ROE, NPM | |
| Cash Flow | | OCF/Net Profit | |
| Earnings Quality | | Cash Receipt Ratio | |

**C. Valuation Assessment**

| Method | Intrinsic Value | MoS | Signal |
|--------|----------------|-----|--------|
| Method 1 | Rp X | X% | UNDERVALUED/FAIR/OVERVALUED |
| Method 2 | Rp X | X% | |
| Method 3 | Rp X | X% | |

Consensus Fair Value: Rp X (MoS: X%)

**D. Company Quality** — Moat (WIDE/NARROW/NONE), management/ownership, growth prospects, competitive position

**E. Risk Assessment** — Value trap: PASS/FAIL, manipulation: PASS/WARNING/FAIL, IDX 2.0 Score: X/12 (Flow/Narrative/Liquidity/Dilution), Altman Z, top 3 risk factors

**F. Fundamental Verdict** — **[UNDERVALUED / FAIR / OVERVALUED]** — Confidence: **[High/Medium/Low]** — Top 3 strengths, top 3 concerns, conditions that change assessment.

**Caveat**: Fundamental assessment only. In IDX 2.0, fundamentals are necessary but not sufficient. Check flow, narrative, and technical before investment decisions.
