# Vibe Investor — Agent Roadmap

## Stock Market 2.0 Tier System

| Tier | Priority | Agent | Status |
|------|----------|-------|--------|
| 4 | Filter | `fundamental-analyst` | Done |
| 3 | Structure | `technical-analyst` | Done |
| 2 | Story | `narrative-analyst` | Todo |
| 1 | Flow (King) | `flow-analyst` | Todo |
| — | Operations | `portfolio-desk` | Todo |
| — | Synthesis | `vibe-investor` | Todo |

---

## Done

### `technical-analyst`

Expert technical analyst for IDX. Uses Python + OHLCV data for chart-based analysis.

- Wyckoff market structure, swing points, trend identification
- Support/resistance, VPVR, Fibonacci
- Price-volume analysis, accumulation/distribution detection
- Entry/exit strategies, position sizing, risk management
- Static chart generation with mplfinance
- Tools: `fetch-ohlcv`, Python (pandas, numpy, mplfinance), filesystem

### `fundamental-analyst`

Expert fundamental analyst for IDX. Uses MCP tools for structured data.

- Financial statement health check (balance sheet, income, cash flow)
- Valuation methodology (8 methods: EPS Discounted, Equity Growth, ROE-PBV, DCF, DDM, Asset-Based, Tech P/S)
- Company quality (economic moat, ownership, management, growth story)
- Risk assessment (value traps, manipulation red flags, IDX 2.0 risk scoring 0-12)
- Sector-specific frameworks (banking, coal, property + references)
- Tools: `get-stock-fundamental`, `get-stock-financials`, `get-stock-governance`, `get-sectors`, `get-companies`, knowledge base, `get-skill` fallback

---

## Todo

### `flow-analyst`

**Priority: Highest** — Tier 1 is king in IDX 2.0. Flow often overrides fundamentals and technicals.

**Identity:** Bandarmology and money flow specialist for IDX. Detects accumulation/distribution by informed players (bandar), foreign flow patterns, and smart money activity.

**Prompt modules:**
1. **Bandarmology framework** — Bandar accumulation/distribution phases, broker summary interpretation, net buy/sell patterns, retail vs institutional flow
2. **Foreign flow analysis** — Foreign buy/sell trends, cumulative foreign flow, correlation with price, foreign flow reversal signals
3. **Frequency & transaction analysis** — Frequency analyzer interpretation, transaction count patterns, lot size distribution (retail vs institutional)
4. **Flow-price divergence** — Price up + flow out (distribution), price down + flow in (accumulation), volume-flow confirmation
5. **Flow scoring & signals** — Accumulation score, distribution warnings, flow-based entry/exit signals

**Tools:**
- `get-stock-bandarmology` — Primary tool: broker summary, net flow, accumulation/distribution data
- `get-stock-fundamental` — Basic price/market cap context
- OHLCV foreign flow fields (`foreignbuy`, `foreignsell`, `foreignflow`, `frequency`, `freq_analyzer`) via `fetch-ohlcv` + Python
- Knowledge base — Recent news that may explain flow changes
- `search-twitter` — Social sentiment that correlates with flow patterns

**Output:** Flow verdict (ACCUMULATION / DISTRIBUTION / NEUTRAL / TRANSITION), bandar activity assessment, foreign flow trend, flow-based risk level, and whether current flow supports or contradicts the stock's narrative.

---

### `narrative-analyst`

**Priority: High** — Tier 2. The story/catalyst engine that determines what moves a stock's price.

**Identity:** Narrative and catalyst analyst for IDX. Identifies what "story" drives a stock, evaluates story strength, maps upcoming catalysts, and assesses re-rating potential. Understands that in IDX 2.0, narrative creates the demand that bandars exploit.

**Prompt modules:**
1. **Narrative identification** — What is the current story? (thematic play, earnings turnaround, corporate action, sector rotation, MSCI inclusion, policy beneficiary, etc.)
2. **Catalyst mapping** — Upcoming events that could move the stock (earnings dates, RUPS, regulatory decisions, commodity price triggers, index rebalancing)
3. **Narrative strength assessment** — Is the story fresh or stale? How many market participants know it? Is it priced in? Timeline to catalyst realization
4. **Narrative failure analysis** — What breaks the story? (policy reversal, earnings miss, deal cancellation, competitor disruption) — maps to IDX 2.0 "Narrative Failure Risk"
5. **Halu-ation framework** — Speculative re-rating potential. How much "imagination premium" can the market assign? Historical precedents for similar narratives in IDX

**Tools:**
- `search-documents` / `list-documents` / `get-document` — Knowledge base for filings, analysis, news
- `search-twitter` — Real-time social sentiment, rumor tracking, narrative momentum
- `get-stock-fundamental` — Basic company context for narrative framing
- `get-sectors` / `get-companies` — Sector/thematic peer identification
- `list-skills` / `get-skill` — Sector-specific knowledge for narrative context

**NOT in scope:** `get-stock-bandarmology` (flow analyst), `get-stock-technical` (technical analyst), `fetch-ohlcv` (technical analyst)

**Output:** Narrative summary (what's the story), catalyst calendar, narrative strength score (STRONG / MODERATE / WEAK / BROKEN), narrative failure risks, and halu-ation potential (re-rating upside from narrative alone).

---

### `portfolio-desk`

**Priority: High** — The operational layer that turns analysis into action.

**Identity:** Trading desk and portfolio manager. Creates trading plans, manages positions, maintains watchlist, tracks P&L, enforces risk rules. Reads outputs from all analyst agents but doesn't do deep analysis itself.

**Prompt modules:**
1. **Trading plan template** — Standardized plan: ticker, thesis (1-2 sentences), entry zone, stop loss, targets (T1/T2/T3), position size, timeframe, risk score, conditions to invalidate
2. **Position sizing & risk rules** — 1% risk per trade rule, portfolio heat limit (max open risk), pyramiding rules, correlation limits, max position size
3. **Portfolio review checklist** — Daily routine (check stops, news, flow changes), weekly routine (review all positions, update P&L, rebalance), monthly routine (performance review, strategy assessment)
4. **Watchlist management** — Entry criteria (what puts a stock on watchlist), trigger conditions (what moves it to "ready to trade"), removal criteria, watchlist categories (accumulation watch, breakout watch, narrative developing)
5. **Session logging** — What was reviewed, decisions made, trades executed, lessons learned, tomorrow's plan

**Tools:**
- `get-stock-fundamental` — Current price for P&L calculation, basic stats
- `get-stock-financials` — Dividend check for income positions
- Knowledge base — Recent news/filings for position monitoring
- Filesystem — **Primary tool**, heavy read/write to memory files

**Memory structure:**
- `memory/notes/portfolio.md` — Open/closed positions, P&L tracking
- `memory/notes/watchlist.md` — Stocks under observation with trigger conditions
- `memory/tickers/{TICKER}.md` — Per-ticker trading plan, thesis, key levels
- `memory/agents/portfolio-desk/sessions/{DATE}.md` — Daily session logs
- Reads from: `memory/agents/*/analysis/` — All analyst outputs

**Output:** Updated portfolio state, trading plans, watchlist updates, session logs. No standalone "report" — this agent's output IS the memory files.

---

### `vibe-investor`

**Priority: Medium** — The orchestrator. Build last, after all specialists are working.

**Identity:** Master synthesizer that combines all 4 tiers into a final investment verdict. Understands the IDX 2.0 hierarchy: Flow > Narrative > Technical > Fundamental. Can delegate to specialist agents or read their existing analysis.

**Prompt modules:**
1. **Tier weighting framework** — How to weigh conflicting signals across tiers. Flow overrides all. Strong narrative + accumulation = high conviction. Great fundamentals + distribution = avoid. Decision matrix for common conflicts
2. **Synthesis workflow** — Read existing analyses from all agents, identify agreements/conflicts, form unified view, produce final verdict
3. **Conviction scoring** — Multi-tier alignment score. All 4 aligned = high conviction. Tier 1-2 aligned but 3-4 conflict = moderate (go with flow/narrative). Tier 3-4 aligned but 1-2 conflict = low (wait for flow confirmation)
4. **Investment thesis template** — Unified thesis combining all tiers: "Buy XXXX because [flow shows accumulation] + [narrative is strong: catalyst X] + [technically at support] + [fundamentally undervalued at X MoS]. Risk: [tier conflicts, key risks]"

**Tools:** Access to ALL tools (can fill gaps if specialist analysis is missing or stale)

**Reads from:** All agent analysis folders in `memory/agents/*/analysis/`

**Output:** Final investment verdict (STRONG BUY / BUY / HOLD / SELL / STRONG SELL / AVOID), conviction level (HIGH / MEDIUM / LOW), unified thesis, tier alignment summary, key risks, and recommended action for portfolio-desk to execute.
