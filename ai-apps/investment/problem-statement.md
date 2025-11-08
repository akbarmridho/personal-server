# Investment Agent Architecture Problem Statement

## Context

Building an AI-powered investment analysis agent for Indonesian stock market (BEI/IDX) with hierarchical analysis approach: **macro → sector → stock**.

### Current Setup

- **Frontend:** Simple LLM chatbox (Chatbox app)
- **Model:** Frontier thinking model with high thinking budget
- **Integration:** MCP (Model Context Protocol) tools

### Analysis Framework

1. **Macro Analysis:** Global + domestic indicators (BI rate, USD/IDR, inflation, fiscal policy, etc.)
2. **Sectoral Analysis:** Economic cycle positioning, sector-specific indicators
3. **Company Analysis:** Quantitative (ROE, P/E, cash flow) + Qualitative (moat, governance, ESG)

## Implemented Tools (MCP Server)

### Stock Data Tools

#### 1. `get-sectors`

- Returns all available sectors and subsectors with slugs
- No parameters required

#### 2. `get-sectors-report`

- Detailed report for specified subsectors
- **Input:** Array of subsector slugs
- **Output:** Aggregated sector metrics, valuation, performance

#### 3. `get-companies`

- Filter companies by subsectors or tickers
- **Input:** Either `subsectors[]` or `tickers[]`
- **Output:** Company list with basic info

#### 4. `get-stock-fundamental`

- Fundamental data for specific ticker
- **Input:** `ticker` (e.g., "BBCA")
- **Output:** Valuation metrics (PER, PBV, ROE, ROA, DER, dividend yield, etc.)

#### 5. `get-stock-financials`

- Financial statements (income, balance sheet, cash flow)
- **Input:** `ticker`, `reportType` (income-statement/balance-sheet/cash-flow), `statementType` (quarterly/annually/ttm)
- **Output:** Historical financial data

#### 6. `get-stock-technical`

- Technical analysis data
- **Input:** `ticker`
- **Output:** Trend, indicators (RSI, MACD, MA), patterns, seasonality, support/resistance levels

#### 7. `get-stock-bandarmology`

- Market detector / broker activity analysis
- **Input:** `ticker`, `period` (1d/1w/1m/3m/1y)
- **Output:** Accumulation/distribution, broker patterns, foreign net flow

#### 8. `get-stock-governance`

- Management and ownership data
- **Input:** `ticker`
- **Output:** Management team, executives, ownership structure, insider activity

#### 9. `get-ihsg-overview`

- IHSG (composite index) overview
- **Output:** Market data, technical indicators, seasonality

### Market Context Tools

#### 10. `get-market-summary` ⭐ **HIGH PRIORITY**

- Weekly market mood summaries (last 8 weeks) + recent market news (last 10 days)
- **Output:** Curated market overview with sentiment and key developments
- **Purpose:** Essential baseline context for any analysis

#### 11. `search-news` ⭐ **SEMANTIC SEARCH**

- Semantic search with RAG (Retrieval-Augmented Generation)
- **Input:**
  - `queries[]` - Array of `{query, hydeQuery}` pairs (supports batching)
  - `startDate`, `endDate` (optional)
- **Features:**
  - HyDE (Hypothetical Document Embeddings)
  - Hierarchical retrieval
  - Auto-deduplication
  - Similarity threshold: 0.45
- **Output:** Top 10 relevant news articles with metadata

### Macro Indicators Tools

#### 12. `get-forex`

- Current and historical forex rates (IDR to foreign currency)
- **Input:** `currencies[]` - Array of USD/CNY/EUR/JPY/SGD
- **Output:** Current rate, historical trends, volatility

#### 13. `get-commodity`

- Current and historical commodity prices (USD)
- **Input:** `commodities[]` - Array of GOLD/SILVER/OIL_WTI/OIL_BRENT/COPPER/COAL/NICKEL/CPO
- **Output:** Current price, historical trends, volatility

---

## Curated Datasets (Already Ingested)

### 1. AlgoResearch Reports

Premium research reports covering:

- Tactical rotation analysis
- BBCA earnings analysis
- Danantara merger implications
- MSCI formula shift impact
- Rupiah performance analysis

**Location:** `dataset/algoresearch/*.md`

### 2. Weekly Market Mood

Curated weekly market summaries with:

- IHSG performance and key levels
- Sector rotation themes
- Foreign flow trends
- Earnings season highlights
- Policy developments

**Location:** `dataset/market-mood/*.md`
**Frequency:** Weekly (every Sunday)

### 3. Stockbit Snips

Daily market commentary and stock-specific insights from Stockbit platform:

- Processed JSON + Markdown format
- 2+ years of historical data (2023-2025)
- Yearly recaps

**Location:** `dataset/stockbit-snips/processed/*.md`

### 4. Vector Store (RAG)

All datasets ingested into vector database with:

- Semantic search capability
- Metadata filtering (type: market/company, date range, tickers)
- Hierarchical retrieval
- Collection ID: 3 (investment news)

---

## The Core Problem

My goals is to create AI Agent that can assist me in stock investing. However, I'm in a dillemma. Currently I implement tools that AI Agent can connect and retrieve curated data. However, there are other sources as well that I want to ingest. Now I'm wondering in this case on whether to do the same (curate sources and information, periodic summary of key topics, etc) or just straight use deep research (or multi agent system).

I'm wondering on whether should I use deep research-like agent, on whether they will yield better result, or one single frontier model Agent with proper summary injection and context management sufficient (separate llm interaction by topic, separate the Agent by prompt and tools by its function, etc).

In the end, I also have tools that give the LLM access to internet (give search query and pass it into search grounded models then return the search summary), but it's a shallow search, not really a deep research.

So this is an issue on how I use ai agent for augmented analysis with curated data and on whether deep research-like open source project will yield a better result.
