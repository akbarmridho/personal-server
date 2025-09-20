# 📊 Agent Responsibilities

## 1. **Fundamental Analyst Agent**

Focus: **Business health, valuation, and long-term prospects**
Inputs: Financial statements, industry outlook, macroeconomic environment

**Responsibilities:**

* **Company Financials**
  * Income Statement, Balance Sheet, Cash Flow, Equity changes
  * Key ratios: ROE, ROA, DER, Current Ratio, Gross/Net Margins
* **Valuation**
  * EPS, PER, PBV, intrinsic value, margin of safety
* **Dividends & retained earnings**
* **Management quality** (if available in narrative data)
* **Macroeconomic & Industry Context**
  * Interest rates (BI rate) → affects borrowing costs, bank margins, property demand
  * Inflation → affects consumer purchasing power, cost structure
  * Currency (USD/IDR) → affects exporters/importers (coal, palm oil, telecom equipment)
  * Commodity prices → e.g., coal, CPO, nickel prices
  * Government policies/regulations → subsidies, tax, OJK rules
* **Output**:
  * “This stock is fundamentally strong/weak”
  * “Valuation is attractive/expensive given industry & macro”

---

## 2. **Technical + Bandarmology Analyst Agent**

Focus: **Market sentiment, price action, and institutional flows**
Inputs: Historical price & volume, order book data, foreign/retail flows

**Responsibilities:**

* **Technical Analysis**

  * Trend analysis (MA, MACD, RSI, Bollinger Bands, support/resistance)
  * Chart patterns (breakout, head & shoulders, cup & handle, etc.)
  * Momentum & volatility indicators
* **Bandarmology (Flow Analysis)**

  * Foreign net buy/sell
  * Broker summary (accumulation/distribution)
  * Volume anomalies vs. price moves
  * Retail vs. institutional activity tracking
* **Market Reaction to Macro**

  * Detect flow changes after BI rate announcements, inflation data, or commodity news
  * Example: “Foreign funds selling after BI rate hike → pressure on banking sector stocks”
* **Output**:

  * “The market is currently bullish/bearish/sideways”
  * “Bandar accumulation detected despite weak fundamentals”
  * “Short-term entry/exit signals”

---

## 🔗 Shared Responsibility (Interaction Layer)

Some factors belong to both, but interpreted differently:

| Factor           | Fundamental View                                       | Technical/Bandarmology View                           |
| ---------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| BI Rate          | Higher rate = higher loan costs, affects profitability | Watch for foreign fund flows (capital inflow/outflow) |
| Rupiah/USD       | Impacts exporters/importers earnings                   | Impacts foreign accumulation/selling in IDX           |
| Commodity Prices | Drives revenue for sector companies                    | Watch for volume spikes in commodity stocks           |
| Inflation        | Affects cost structure, consumer demand                | Can trigger market sentiment shifts                   |
