# Sector-Specific Analysis Frameworks

This module provides sector-specific metrics and analysis frameworks for key Indonesian market sectors. For deeper sector knowledge not covered here, use the `get-skill` tool to retrieve specialized sector skills.

## 1. Banking Sector

Banks are financial intermediaries that "buy and sell money" - collecting funds from depositors at lower rates and distributing to borrowers at higher rates.

### Key Metrics

| Metric | Formula | Benchmark |
|--------|---------|-----------|
| CASA Ratio | (Giro + Savings) / Total DPK | Higher = lower cost of funds |
| NIM | Net Interest Income / Earning Assets | Higher = more profitable lending |
| LDR | Total Loans / Total DPK | Ideal: 80-92% |
| CAR | Capital / Risk-Weighted Assets | Minimum: 8% (Indonesia) |
| NPL Gross | Problem Loans / Total Loans | Must stay below 5% |
| BOPO/CIR | Operating Expenses / Operating Income | Lower = more efficient |

### Banking-Specific Analysis

- **Revenue Streams**: Net Interest Income (NII) vs Fee-Based Income
- **Funding Structure**: Giro (cheapest, 0.1-0.5%), Tabungan (1-2%), Deposito (most expensive, 4-6%)
- **PPOP**: (NII + Non-Interest Income) - Operating Expenses (core business strength before credit risk)
- **Regulatory**: GWM (minimum reserves at central bank), BMPK (lending limits: 20% single, 25% group)

### Valuation Notes

- P/E and P/B are primary valuation methods for banks
- ROE-PBV model works well for banking sector
- High CASA banks command premium valuations
- Digital banking capabilities increasingly important

## 2. Coal Sector

### Value Chain

Exploration -> Mine Development -> Production & Processing -> Transport & Selling -> Reclamation

### Key Technical Metrics

| Metric | Description | Signal |
|--------|-------------|--------|
| Strip Ratio (SR) | Overburden (BCM) / Coal (Tonne) | Lower = lower costs, higher margins |
| GAR | Gross As Received calories | Total energy including moisture |
| NAR | Net As Received calories | Net energy after moisture |
| Cash Cost | Direct production costs | Lower = better margins |
| ASP | Average Selling Price | Influenced by benchmarks |

### Pricing Benchmarks

- **HBA** (Harga Batubara Acuan): Official Indonesian government price for royalty calculation
- **ICI** (Indonesia Coal Index): Spot market transactions
- **Newcastle Coal Index**: Global benchmark for high-calorie coal (~6322 kcal/kg GAR)

### Regulatory Environment

- **IUP/IUPK**: Mining permits (standard vs special/strategic)
- **DMO**: Must sell ≥25% domestically to PLN at capped prices (~$70/ton for high cal)
- **Royalty**: Percentage of revenue to state, scales with HBA and mine type

### Valuation Notes

- Coal companies are highly cyclical - use normalized earnings
- EV/EBITDA preferred over P/E due to varying depreciation policies
- Pay attention to reserve life and strip ratio trends
- Contract mix (spot vs term vs off-take) affects earnings visibility

### Key Players (IHSG)

- **Producers**: AADI, BYAN, PTBA, ITMG, BUMI, GEMS, HRUM, INDY, BSSR, MBAP, TOBA
- **Midstream**: TPMA, MBSS, PSSI, TCPI, RMKE
- **Mining Services**: UNTR, DOID, PTRO, ADMR, ABMM

## 3. Property Sector

Property requires unique accounting adjustments because "Sales" (Marketing Sales) often don't appear as "Revenue" for years.

### Key Concepts

**Marketing Sales vs Revenue (PSAK 72):**

- Marketing Sales (pre-sales) = actual contracts signed/down payments (leading indicator)
- Revenue = recognized ONLY upon unit handover (serah terima)
- Lag: High-rise 3-4 years, Landed houses 1-2 years
- A company can have record Marketing Sales but low Revenue because projects aren't finished

**Asset Classification:**

- Inventory: Land with completed/ongoing buildings for sale
- Landbank: Raw land for future projects (top value driver)
- Investment Property: Recurring income assets (malls, offices, hotels)

### Financial Adjustments

**Advances from Customers:**

- Cash from buyers sits in Liabilities (revenue not yet recognized)
- High "Liabilities" in property is often GOOD (represents future revenue)

**Adjusted DER:**

- Standard DER = Total Liabilities / Equity (misleading for property)
- Adjusted DER = (Total Liabilities - Advances from Customers) / Equity
- Always use Adjusted DER for property companies

### Valuation: NAV Approach

1. Revalue landbank at market prices (often recorded at historical cost)
2. Net Debt = Interest Bearing Debt - Cash
3. NAV = Revalued Assets - Net Debt
4. NAV per Share = NAV / Total Shares
5. Apply historical discount (~40-60% for Indonesian property)

### Investment Catalysts

- Rate cuts (stimulates mortgages)
- LTV easing
- Tax incentives (Free VAT/PPN DTP)
- Companies with recurring income (malls/hospitals) are safer during downturns

## 4. Other Sectors (Reference)

For sectors not covered above, use the `get-skill` tool with `list-skills` to discover available sector-specific skills. Common sectors in the Indonesian market:

### Consumer/Retail

- Focus on: Same-store sales growth, margin per product category, distribution reach
- Valuation: P/E with growth premium for market leaders

### Telecommunications

- Focus on: ARPU, subscriber growth, data revenue mix, tower ownership
- Valuation: EV/EBITDA preferred due to high depreciation

### Construction/Infrastructure

- Focus on: Order book, revenue recognition methods, government project dependency
- Valuation: P/E with attention to order book coverage ratio

### Oil & Gas

- Focus on: Production volumes, lifting costs, reserve replacement ratio
- Valuation: EV/EBITDA, reserve-based valuation

### Plantation (CPO)

- Focus on: CPO price sensitivity, mature vs immature hectarage, yield per hectare
- Valuation: EV/EBITDA, PBV with asset revaluation
