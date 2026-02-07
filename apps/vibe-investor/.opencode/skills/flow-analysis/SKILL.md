---
name: flow-analysis
description: Bandarmology and money flow analysis for IDX stocks — bandar accumulation/distribution detection, foreign flow patterns, frequency and transaction analysis, flow-price divergence signals, and flow-based entry/exit scoring.
---

## Data Sources

**MCP Tools:**

- **`get-stock-bandarmology`** — Primary tool: broker summary (top buyers/sellers by net value), net foreign flow, accumulation/distribution indicators, broker flow breakdown.
- **`get-stock-fundamental`** — Price, market cap, free float context.

**OHLCV Data** (via `fetch-ohlcv` + Python):

| Field | Use |
|-------|-----|
| `foreignbuy` / `foreignsell` | Daily foreign flow direction and magnitude |
| `foreignflow` | Cumulative foreign flow (running total) |
| `frequency` | Number of transactions (retail vs institutional signal) |
| `freq_analyzer` | Frequency analysis metric (processed) |
| `volume` / `value` | Total volume/value for context |

**Knowledge Catalog:** `list-knowledge`, `get-knowledge` for broker codes, conglomerate mappings, and other flow-related reference data.

**Knowledge Base:** `search-documents`, `list-documents` for recent news that may explain flow changes.

**Social:** `search-twitter` for sentiment that correlates with flow patterns.

---

## Analysis Workflow

### Phase 1: Data Collection (Parallel)

Call in parallel: `get-stock-bandarmology` + `fetch-ohlcv` + `get-stock-fundamental` + `search-documents` for the symbol.

### Phase 2: Systematic Analysis (Sequential)

1. **Market Structure** (Module 1) — Who drives this stock? Foreign-driven or bandar-driven?
2. **Bandarmology** (Module 2) — Broker summary interpretation, accumulation/distribution phase
3. **Foreign Flow** (Module 3) — Cumulative trend, participation rate, divergence signals
4. **Frequency Analysis** (Module 4) — Retail vs institutional activity, lot size patterns
5. **Flow-Price Divergence** (Module 5) — Synthesis scoring, conviction level

### Phase 3: Verdict

Form flow verdict: **ACCUMULATION / DISTRIBUTION / NEUTRAL / TRANSITION** with confidence level and whether flow supports or contradicts the stock's narrative/technicals.

---

## Module 1: Ownership & Market Structure

Understanding who moves a stock is prerequisite to interpreting flow.

### The Driver-Stopper Framework

| Role | Who | Behavior |
|------|-----|----------|
| **Driver** | Foreign institutions, bandar/conglomerate | Dictates direction. Buys to push up, sells to push down. |
| **Stopper/Ganjal** | Local retail, passive funds | Provides liquidity. Absorbs selling (exit liquidity) or sells into strength (allowing accumulation). |

**Phase dynamics:**

- Foreign Buy + Local Sell = **Accumulation** (Bullish)
- Foreign Sell + Local Buy = **Distribution** (Bearish — retail is exit liquidity)

### Classify the Stock First

Before analyzing flow, determine the stock's "flow regime":

| Regime | Signal | Flow Focus |
|--------|--------|------------|
| **Foreign-Driven** | Foreign participation >30%, high price-foreign correlation | Foreign net buy/sell is primary signal |
| **Bandar-Driven** | Low foreign participation, conglomerate-affiliated | Broker summary (specific broker codes) is primary signal |
| **Retail-Driven** | High frequency, small lot sizes, retail broker dominance | Contrarian signal — retail consensus often wrong |
| **Mixed** | No clear dominant driver | Use all signals, weight by context |

### Stock Market 2.0 Update

Post-2020 the dominance of foreign flow has weakened due to massive local conglomerates (Barito, Bayan, etc.).

- **Blue Chips** (Banks, Telco): Foreign flow still matters
- **Conglomerate/High-Growth Stocks**: Local bandar flow often overrides foreign flow
- **Trap Alert**: Locals sometimes use foreign broker codes (ZP, AK) to simulate "Foreign Interest" and lure retail followers

---

## Module 2: Bandarmology

### Broker Summary Interpretation

The `get-stock-bandarmology` tool returns top brokers by net buy/sell. Cross-reference with broker codes from knowledge catalog (`get-knowledge broker-codes`).

**What to look for:**

| Pattern | Signal | Interpretation |
|---------|--------|----------------|
| Conglomerate broker as top buyer | Strong accumulation | Owner/insider is buying their own stock |
| Institutional foreign (AK, BK, MS) as top buyer | Institutional entry | Smart money positioning |
| Retail brokers (YP, XL, XC) as top buyer | Distribution phase | Bandar selling to retail FOMO |
| Mixed institutional buying + retail selling | Early accumulation | Smart money absorbing retail panic |
| Institutional selling + retail buying | Late distribution | Smart money exiting, retail catching falling knife |

### Accumulation/Distribution Phases

| Phase | Broker Pattern | Volume | Price Action |
|-------|---------------|--------|-------------|
| **Early Accumulation** | Bandar/institutional buying quietly, small lots | Below average, rising gradually | Sideways, tight range |
| **Late Accumulation** | Larger broker lots, frequency drops | Spikes on up days | Testing resistance, higher lows |
| **Markup** | Broad buying, retail enters | High sustained | Trending up, breakouts |
| **Early Distribution** | Bandar starts selling to retail | Very high, institutional lot sizes on sell side | New highs but with wicks |
| **Late Distribution** | Retail top buyer, institutional top seller | Declining from peak | Failing to make new highs, lower highs |
| **Markdown** | Broad selling, panic | Spikes on down days | Breaking supports |

### Camouflage Tactics

Bandars actively disguise their activity:

- **Broker splitting**: Distributing orders across multiple brokers to avoid showing up as top buyer/seller
- **Retail broker camouflage**: Using retail-heavy brokers (YP, XL) for institutional-sized orders
- **Negotiated market (Pasar Nego)**: Moving blocks off the regular tape via crossing — always check Total Net (Regular + Nego)
- **Time spreading**: Accumulating over weeks/months to avoid detection in daily summaries

**Counter-tactic**: Look at multi-day/multi-week broker accumulation patterns, not single-day snapshots.

---

## Module 3: Foreign Flow Analysis

### Key Indicators

**Foreign Participation Rate:**

```
Participation = (Foreign Buy Value + Foreign Sell Value) / (2 × Total Value) × 100
```

- **>30%**: Foreigners actively controlling direction
- **10-30%**: Moderate foreign interest
- **<10%**: Stock is locally driven — foreign flow is noise

**Cumulative Foreign Flow Trend:**

Plot `foreignflow` from OHLCV data over time:

- **Rising cumulative flow + rising price**: Confirmed foreign-driven uptrend
- **Rising cumulative flow + flat price**: Accumulation (bullish setup)
- **Falling cumulative flow + rising price**: Divergence — locals/bandar driving price, foreigners exiting (bearish warning)
- **Falling cumulative flow + falling price**: Confirmed foreign-driven downtrend

**Foreign Ownership Trend:**

Track scriptless ownership percentage over time. If price drops but foreign ownership keeps rising → divergence accumulation opportunity.

### The Negotiated Market (Pasar Nego)

Big players use Nego to hide from the regular market tape:

- **Crossing**: Institutional investor transfers blocks to a nominee account via Nego
- **Public view**: Foreign Net Sell on regular tape (panic signal)
- **Reality**: Shares just moved pockets, not truly sold

**Rule**: Always check Total Net Buy/Sell (Regular + Negotiated) for the full picture. Massive Nego crosses often precede major corporate actions.

### Information Asymmetry Pattern

Foreigners frequently move ahead of news:

```
Foreign accumulation (months) → News release → Retail euphoria → Foreign profit-taking
```

If you see heavy foreign buying with no obvious catalyst, the catalyst may not be public yet.

---

## Module 4: Frequency & Transaction Analysis

### Frequency as Participant Classifier

| Pattern | Signal | Who's Active |
|---------|--------|-------------|
| High frequency + low avg lot size | Retail-dominated | Many small transactions |
| Low frequency + high avg lot size | Institutional/bandar | Few large block trades |
| Rising frequency + rising volume | Broad participation | Both retail and institutional |
| Rising frequency + flat volume | Retail entering | More transactions but same total volume = smaller lots |
| Falling frequency + rising volume | Institutional dominance | Fewer but larger transactions |

### Frequency Analyzer (`freq_analyzer`)

The `freq_analyzer` field from OHLCV data provides a processed frequency metric. Track its trend:

- **Rising freq_analyzer + rising price**: Healthy trend, broad participation
- **Rising freq_analyzer + falling price**: Panic selling, high retail activity (potential capitulation)
- **Falling freq_analyzer + rising price**: Quiet markup by insiders, low participation (can be fragile)
- **Falling freq_analyzer + falling price**: Disinterest, stock being abandoned

### Lot Size Distribution

Calculate average lot size: `volume / frequency`

- **Avg lot increasing**: Institutional players entering
- **Avg lot decreasing**: Retail taking over
- **Sudden spike in avg lot**: Block trade or bandar entry/exit

---

## Module 5: Flow-Price Divergence & Scoring

### Divergence Matrix

| Price | Foreign Flow | Broker Flow | Frequency | Signal |
|-------|-------------|-------------|-----------|--------|
| Up | In | Bandar buying | Rising | **Strong Accumulation** — all aligned |
| Up | Out | Bandar buying | Low | **Bandar Markup** — risky, depends on bandar |
| Up | In | Retail top buyer | High | **Distribution Imminent** — retail FOMO |
| Down | In | Mixed | Low | **Quiet Accumulation** — potential reversal |
| Down | Out | Institutional selling | High | **Confirmed Distribution** — avoid |
| Flat | In | Bandar buying | Low | **Pre-Breakout** — watch for trigger |
| Flat | Out | Retail rotating | Declining | **Abandoned** — no interest |

### Flow Conviction Scoring (0-15)

| Factor | Score | Criteria |
|--------|-------|----------|
| **Foreign Flow Direction** | 0-3 | 0 = strong outflow, 1 = mild out, 2 = neutral, 3 = strong inflow |
| **Broker Pattern** | 0-3 | 0 = retail top buyer (distribution), 1 = mixed, 2 = institutional entry, 3 = conglomerate accumulation |
| **Frequency Signal** | 0-3 | 0 = retail panic, 1 = retail dominated, 2 = balanced, 3 = institutional dominated |
| **Flow-Price Alignment** | 0-3 | 0 = strong divergence (bearish), 1 = mild divergence, 2 = neutral, 3 = full confirmation |
| **Multi-Day Trend** | 0-3 | 0 = deteriorating, 1 = mixed, 2 = stable, 3 = improving |

**Interpretation:**

| Score | Verdict | Action |
|-------|---------|--------|
| 12-15 | **STRONG ACCUMULATION** | Flow fully supports entry |
| 9-11 | **ACCUMULATION** | Flow supportive, proceed with normal sizing |
| 6-8 | **NEUTRAL** | Flow inconclusive, rely on other tiers |
| 3-5 | **DISTRIBUTION** | Flow warns against entry, reduce sizing |
| 0-2 | **STRONG DISTRIBUTION** | Flow says avoid — you are likely exit liquidity |

---

## Output Report Structure

```markdown
## Flow Analysis: {TICKER}

**Verdict:** {ACCUMULATION / DISTRIBUTION / NEUTRAL / TRANSITION}
**Flow Score:** {X}/15
**Confidence:** {HIGH / MEDIUM / LOW}

### Market Structure
- Flow regime: {Foreign-Driven / Bandar-Driven / Retail-Driven / Mixed}
- Foreign participation: {X}%

### Bandarmology
- Top buyers: {broker codes + interpretation}
- Top sellers: {broker codes + interpretation}
- Phase: {Early Accumulation / Late Accumulation / Markup / Distribution / Markdown}

### Foreign Flow
- Cumulative trend: {Rising / Falling / Flat} over {timeframe}
- Price-flow alignment: {Confirmed / Divergent}
- Notable: {any Nego crosses, sudden reversals}

### Frequency
- Avg lot size trend: {Increasing / Decreasing}
- Participant mix: {Institutional-dominated / Retail-dominated / Mixed}

### Flow vs Narrative
- Does current flow support the stock's story? {Yes / No / Mixed}
- Key risk: {what flow pattern contradicts}
```
