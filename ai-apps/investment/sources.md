# 🧠 **Comprehensive Research Framework for Indonesia Stock Analyzer AI**

---

## **1. Macro Analysis**

### **Global Indicators**

* Global GDP growth
* Global interest rates (Fed Funds Rate, ECB Rate, etc.)
* Global inflation trends
* Government policy & fiscal stimulus
* Commodity price trends (oil, coal, nickel, palm oil, gold)
* Global economic issues (geopolitical risks, supply chain, inflation shocks)
* Capital flows and investor sentiment
* Exchange rate trends (USD Index, global FX stability)

---

### **Domestic Indicators (Indonesia)**

* **Monetary & Financial**

  * BI 7-Day Reverse Repo Rate
  * Money supply (M1, M2)
  * Interbank rate
  * Government bond yields (SUN curve)
  * Exchange rate (USD/IDR)
  * Inflation rate (CPI, Core CPI)
  * Credit growth & loan distribution
  * Foreign reserves

* **Fiscal**

  * Government budget balance
  * Fiscal deficit
  * Debt-to-GDP ratio
  * Tax revenue & spending composition

* **External Sector**

  * Trade balance
  * Current account balance
  * Foreign Direct Investment (FDI)
  * Export & import growth (by commodity)

* **Real Sector**

  * GDP growth rate (YoY, QoQ)
  * Industrial production
  * Retail sales index
  * Manufacturing PMI
  * Unemployment rate
  * Consumer confidence index

* **Consumer & Sentiment**

  * Household consumption growth
  * Inflation expectations
  * Consumer confidence survey
  * Rupiah stability index
  * IHSG foreign fund inflow/outflow
  * Market volatility (proxy: VIX/IDXVIX)

📊 **Primary Data Sources:**

* Bank Indonesia (BI): [https://www.bi.go.id](https://www.bi.go.id)
* Badan Pusat Statistik (BPS): [https://www.bps.go.id](https://www.bps.go.id)
* OJK: [https://www.ojk.go.id](https://www.ojk.go.id)
* Kementerian Keuangan: [https://www.kemenkeu.go.id](https://www.kemenkeu.go.id)
* Trading Economics / Investing.com API
* FRED (global comparison)

---

## **2. Sectoral Analysis**

### **Economic Cycle**

* Early Recession
* Late Recession
* Early Recovery
* Late Recovery

📈 *Used to identify which sectors benefit from current macroeconomic phase.*

---

### **Sectoral Updates & Indicators**

| Category                    | Key Indicators                                                             | Common Sources    |
| --------------------------- | -------------------------------------------------------------------------- | ----------------- |
| **Government & Policy**     | Fiscal incentives, tax policy, infrastructure spending, regulation updates | Kemenkeu, OJK, BI |
| **Banking & Finance**       | NPL ratio, CAR, loan growth, NIM, credit spread                            | OJK, BI           |
| **Consumer Goods**          | Retail sales, disposable income, urbanization rate                         | BPS               |
| **Energy & Mining**         | HBA coal price, oil & gas production, nickel price, export quota           | ESDM, IDX         |
| **Property & Construction** | Building permits, cement sales, mortgage rate                              | BPS, BI           |
| **Technology**              | Digital economy size, e-commerce GMV, fintech regulation, user growth      | Kominfo, OJK      |
| **Agriculture**             | Palm oil output, CPO price, fertilizer cost, export restriction            | GAPKI, BPS        |
| **Industrial**              | Manufacturing PMI, factory utilization, import of machinery                | BPS, BI           |

💡 *Your AI agent can map each sector’s sensitivity to macro shifts and price trends.*

---

## **3. Company Analysis**

### **Quantitative Analysis**

| Category          | Indicators                                          | Purpose                      |
| ----------------- | --------------------------------------------------- | ---------------------------- |
| **Profitability** | ROE, ROA, Net Margin, Operating Margin              | Evaluate business efficiency |
| **Solvency**      | Debt-to-Equity Ratio, Interest Coverage             | Assess financial stability   |
| **Cash Flow**     | Operating CF, Free Cash Flow, Cash Conversion Cycle | Check liquidity strength     |
| **Valuation**     | P/E, P/B, EV/EBITDA, PEG Ratio, Dividend Yield      | Determine fair price         |
| **Growth**        | EPS growth, Revenue CAGR, CAPEX trend               | Identify expansion potential |
| **Risk & Safety** | Margin of Safety, Beta, Earnings volatility         | Manage investment risk       |

📄 **Sources:**

* IDX ([https://www.idx.co.id](https://www.idx.co.id)) – financial statements, quarterly reports
* OJK filings
* Yahoo Finance / Alpha Vantage / EODHistoricalData API
* Bloomberg / Refinitiv (if available)

---

### **Qualitative Analysis**

| Aspect                      | Key Factors                                  | Notes                                 |
| --------------------------- | -------------------------------------------- | ------------------------------------- |
| **Economic Moat**           | Brand strength, switching cost, market share | Long-term advantage                   |
| **Management & Governance** | Track record, ownership, capital allocation  | Affects sustainability                |
| **Business Cycle Position** | Sensitivity to economy, pricing power        | Timing entry/exit                     |
| **ESG & Sustainability**    | Environmental, social, governance metrics    | Important for institutional investors |
| **Prospect**                | Industry outlook, innovation capability, R&D | Future growth                         |
| **Challenges**              | Regulation, competition, commodity risk      | Downside awareness                    |

📘 **Qualitative Sources:**

* Company annual reports
* IDX ESG Leaders Index
* MSCI ESG ratings
* News & sentiment data (via NLP scrapers)
* Investor presentations & earnings calls

---

## **4. Data Integration & AI Agent Inputs**

| Layer                | Sample Features for AI Model                                                 | Data Frequency     |
| -------------------- | ---------------------------------------------------------------------------- | ------------------ |
| **Macro**            | BI rate trend, inflation deviation, USD/IDR volatility, fiscal deficit %GDP  | Monthly/Quarterly  |
| **Sectoral**         | Sector momentum index, commodity correlation score, government policy impact | Monthly            |
| **Company**          | Fundamental composite score, earnings momentum, valuation percentile         | Quarterly          |
| **Sentiment/Market** | News tone (NLP), social buzz, institutional flow                             | Daily              |
| **Alternative Data** | Web traffic, shipment data, satellite crop index                             | Real-time / weekly |

---

## **5. Technical & Alternative Data (Optional Enhancement)**

* **Market Technicals:** MA crossover, RSI, MACD, volume spikes, volatility bands
* **News & Sentiment:** Scrape from financial portals (Kontan, CNBC Indonesia, Bisnis.com)
* **Alternative:**

  * Google Trends (investor sentiment proxy)
  * E-commerce transaction data (consumer strength proxy)
  * Weather data for agri/energy sectors
  * Social media chatter sentiment
