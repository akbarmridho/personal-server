---
name: narrative-analysis
description: Narrative and catalyst analysis for IDX stocks — story identification (thematic plays, turnarounds, corporate actions), catalyst mapping, narrative strength assessment, failure analysis, and halu-ation (speculative re-rating) framework.
---

## Data Sources

**Knowledge Base (MCP):**

- **`search-documents`** / **`list-documents`** / **`get-document`** — Filings, analyst research, news, rumours. Primary source for identifying active narratives and catalysts.

**Social (MCP):**

- **`search-twitter`** — Real-time social sentiment, rumor tracking, narrative momentum. Crucial for gauging how "known" a story is.

**Stock Data (MCP):**

- **`get-stock-fundamental`** — Basic company context (price, market cap, key ratios) for narrative framing.
- **`get-stock-governance`** — Ownership structure, management quality, insider activity for owner narrative.
- **`get-sectors`** / **`get-companies`** — Sector/thematic peer identification.

**Knowledge Catalog:** `list-knowledge`, `get-knowledge` for conglomerate mappings, sector context, and narrative-cycle references.

Key entries commonly used:
- `get-knowledge msci-ftse-agenda-playbook` (index agenda lifecycle framing)
- `get-knowledge msci-free-float-market-cap-and-adjustment-factor` (FFMC/FIF/NOS mechanics, rounding, freeze risk)
- `get-knowledge peak-news-distribution-pattern` (peak-news = exit-liquidity overlay)
- `get-knowledge hype-lifecycle-pompom-to-cuci-piring` (pompom → distribution cycle map)
- `get-knowledge indonesian-conglomerates` (group context, typical moves)
- `get-knowledge rights-issue-purpose-and-signal-map` (rights issue agendas + red flags)
- `get-knowledge mandatory-tender-offer-and-dissent-process` (M&A tender-offer eligibility + blocking mechanics)
- `get-knowledge backdoor-listing-screening` (backdoor narrative: shell criteria + failure modes)
- `get-knowledge wtff-backdoor-cycle` (TFF→WTFF→peaked framing for backdoor mania)
- `get-knowledge narrative-valuation-framework` (base value vs narrative premium; priced-in tests)
- `get-knowledge haluasi-and-rerating-premium` (imagination premium bands + failure modes)
- `get-knowledge oil-gas-narrative-proxies` (O&G proxy selection by narrative type)

**NOT in scope for this skill:** `get-stock-bandarmology` (flow analysis), `fetch-ohlcv` (technical analysis). Narrative analysis focuses on *what story exists* and *how strong it is*, not on price action or flow data.

---

## Analysis Workflow

### Phase 1: Data Collection (Parallel)

Call in parallel: `search-documents` (for the symbol) + `search-twitter` (symbol + related keywords) + `get-stock-fundamental` + `get-stock-governance`.

### Phase 2: Systematic Analysis (Sequential)

1. **Narrative Identification** (Module 1) — What is the current story? Business reality, growth excitement, owner character
2. **Catalyst Mapping** (Module 2) — What upcoming events could move the stock?
3. **Narrative Strength** (Module 3) — How strong, fresh, and actionable is the story?
4. **Narrative Failure** (Module 4) — What breaks the story? Maps to IDX 2.0 "Narrative Failure Risk"
5. **Halu-ation** (Module 5) — Speculative re-rating potential, imagination premium

### Phase 3: Verdict

Form narrative verdict: **STRONG / MODERATE / WEAK / BROKEN** with catalyst timeline and halu-ation potential.

---

## Module 1: Narrative Identification

### Step 1: Business Reality Check

Before analyzing the story, verify the business is real and viable:

| Question | Red Flag If |
|----------|------------|
| Does the company actually exist and operate? | Shell company, no real operations |
| Bankruptcy risk? (Altman Z-score) | Z < 1.8 (Distress Zone) |
| Does the company have a long-term future? | Obsolete product, shrinking market |
| Is the business still growing? | Declining revenue 3+ years |
| How does it make money? | Unclear revenue model, paper profits |

### Step 2: Classify the Narrative Type

| Narrative Type | Description | Examples |
|---------------|-------------|----------|
| **Thematic Play** | Riding a macro/sector theme | EV supply chain, data center, energy transition |
| **Earnings Turnaround** | Deteriorating company showing recovery | Rising margins, debt reduction, new management |
| **Corporate Action** | M&A, spin-off, rights issue, IPO | Acquisition premium, restructuring value |
| **Sector Rotation** | Money flowing into a sector | Commodity cycle, rate-cut beneficiaries |
| **Policy Beneficiary** | Government policy or regulation | Tax incentives, infrastructure spending, deregulation |
| **MSCI/Index Inclusion** | Index rebalancing catalyst | MSCI rebalancing, LQ45 inclusion |
| **Conglomerate Re-rating** | Group restructuring or strategic pivot | Barito energy transition, Adaro spin-off |
| **Dividend Play** | High/special dividend expectations | Ex-date catalyst, yield compression |
| **Speculative/Hype** | Pure narrative with minimal fundamentals | Viral social media, influencer pump |

### Step 3: Growth Story & Business Excitement

Not all profitable companies are "exciting" to the market:

- Is the business still exciting for the future?
- Are there new developments that attract investor imagination?
- Are there expansion opportunities or new profit sources?
- **Note**: Mature, boring companies (e.g., stable consumer goods) are harder to re-rate aggressively. The market needs a "story" to pump.

### Step 4: Owner & Shareholder Character

Owner behavior shapes the narrative:

| Question | Bullish | Bearish |
|----------|---------|---------|
| Owner goals? | Long-term value creation, market share | Cash extraction, personal enrichment |
| Dividend sharing? | Consistent, growing payout | Minimal or zero dividends despite profits |
| Capital raising? | Rare, for genuine expansion | Frequent rights issues, REPO, dilutive actions |
| Owner ambition? | Aligned with minority shareholders | "Become ultra-rich at all costs" — minority be damned |

### Step 5: Ownership Map

| Check | Signal |
|-------|--------|
| Large institutional holders? | Stability, validation |
| Foreign investor presence? | Global confidence signal |
| Clear controlling shareholder? | Direction clarity (but watch for minority abuse) |
| Recent ownership changes? | Potential narrative shift |

---

## Module 2: Catalyst Mapping

### Catalyst Calendar

Map all known and potential catalysts with expected dates:

| Catalyst Type | Typical Timing | Impact |
|-------------|----------------|--------|
| **Quarterly Earnings** | ~30-45 days after quarter end | Earnings beat/miss, guidance change |
| **Annual Report** | Q1 of following year | Full-year performance, dividend proposal |
| **RUPS** (Annual General Meeting) | Q2-Q3 | Dividend approval, board changes, strategic decisions |
| **Index Rebalancing** (LQ45, IDX30) | Feb & Aug (BEI review) | Forced buying/selling by index funds |
| **MSCI Rebalancing** | Feb, May, Aug, Nov | Foreign fund flows |
| **Regulatory Decisions** | Varies | Policy changes, licensing, tariffs |
| **Commodity Price Triggers** | Continuous | HBA announcements (monthly), ICI movements |
| **Corporate Actions** | As announced | Rights issue, stock split, M&A, spin-off |
| **Lock-Up Expiry** (IPO stocks) | 6-12 months post-IPO | Supply overhang risk |
| **Debt Maturity** | Per company schedule | Refinancing risk or cash flow event |

### Catalyst Proximity Rule

- **<1 month away**: Catalyst is imminent — market likely already positioning
- **1-3 months**: Sweet spot for entry if narrative is strong
- **>6 months**: Too far — narrative can stale, other events may override

### Corporate Action Mechanics (IDX-specific)

When a catalyst is a corporate action, ground it in mechanics (not vibes):

- **Indexing/MSCI stories**: use `get-knowledge msci-free-float-market-cap-and-adjustment-factor` to interpret whether the thesis depends on free-float math, rounding, or policy/freeze risk.
- **Rights issue**: use `get-knowledge rights-issue-purpose-and-signal-map` to classify the agenda (growth funding vs strategic entry vs asset injection) and identify dilution traps.
- **M&A tender offer / dissent route**: use `get-knowledge mandatory-tender-offer-and-dissent-process` to avoid missing DPS/T+2 and documentation windows.
- **Backdoor listing**: use `get-knowledge backdoor-listing-screening` to judge whether the “shell” setup is structurally plausible and what can go wrong post-injection.

---

## Module 3: Narrative Strength Assessment

### Strength Scoring Matrix

| Factor | Score | Criteria |
|--------|-------|----------|
| **Freshness** | 0-3 | 0 = stale (>6 months old, widely known), 1 = aging, 2 = developing, 3 = brand new |
| **Market Awareness** | 0-3 | 0 = everyone knows (priced in), 1 = widely discussed, 2 = niche circles, 3 = almost nobody knows yet |
| **Fundamental Support** | 0-3 | 0 = pure hype (no numbers), 1 = weak support, 2 = moderate data backing, 3 = strong financial evidence |
| **Catalyst Proximity** | 0-3 | 0 = no clear catalyst, 1 = >6 months, 2 = 1-3 months, 3 = <1 month (imminent) |
| **Flow Alignment** | 0-3 | 0 = distribution despite story, 1 = no flow support, 2 = some accumulation, 3 = strong accumulation |

**Interpretation:**

| Score | Verdict | Implication |
|-------|---------|-------------|
| 12-15 | **STRONG** | Narrative is fresh, supported, and has near-term catalyst — high re-rating potential |
| 8-11 | **MODERATE** | Story exists but partially priced in or catalyst is distant |
| 4-7 | **WEAK** | Story is stale, unsupported, or widely known — limited upside from narrative alone |
| 0-3 | **BROKEN** | No viable narrative or story has failed — avoid narrative-based entry |

### "Priced In" Detection

A narrative is priced in when:

- Price has already moved significantly toward the catalyst expectation
- Social media discussion is at peak (everyone talking about it)
- Analyst reports already incorporate the expected outcome
- The stock trades at or above fair value *including* the catalyst benefit

**Test**: If the catalyst happens exactly as expected, would the stock still go up? If not, it's priced in.

### Peak-News / Exit-Liquidity Overlay (Weekly–Monthly)

For weekly–monthly positioning, treat “most official / most viral” news as a **late-stage risk overlay**, not an automatic buy signal.

**Knowledge (reference):**
- `get-knowledge peak-news-distribution-pattern`
- `get-knowledge hype-lifecycle-pompom-to-cuci-piring`

---

## Module 4: Narrative Failure Analysis

### What Breaks the Story?

For each narrative type, identify the specific failure scenario:

| Narrative Type | Failure Trigger |
|---------------|-----------------|
| Thematic Play | Theme fizzles (e.g., EV adoption slower than expected) |
| Earnings Turnaround | Next quarter earnings miss, turnaround stalls |
| Corporate Action | Deal cancelled, regulatory block, unfavorable terms |
| Sector Rotation | Macro shift (rate hikes instead of cuts, commodity crash) |
| Policy Beneficiary | Policy reversal, delayed implementation, weaker-than-expected impact |
| MSCI/Index | Not included in expected rebalancing, removed from index |
| Conglomerate Re-rating | Strategic pivot fails, key deal falls through |
| Dividend Play | Lower-than-expected dividend, payout cut |
| Speculative/Hype | Reality check — no actual business improvement |

### Narrative Failure Risk Score

Maps directly to IDX 2.0 Risk Framework (Tier 2):

| Score | Level | Description |
|-------|-------|-------------|
| 0 | Low | Story has multiple independent catalysts, failure of one doesn't kill thesis |
| 1 | Moderate | Story depends on 2-3 factors, some redundancy |
| 2 | High | Story depends on single catalyst — binary outcome |
| 3 | Critical | Story is already showing cracks, narrative may be breaking |

### Price Behavior vs Narrative Health

| Price Action | Narrative State | Reading |
|-------------|----------------|---------|
| Price rising + narrative fresh | Healthy | Normal markup on strong story |
| Price flat + narrative fresh | Pre-breakout or market doesn't believe yet | Watch for flow confirmation |
| Price rising + narrative aging | Late stage | Consider taking profits |
| Price falling + narrative intact | Opportunity or early failure | Check flow — accumulation = opportunity, distribution = failure |
| Price falling + narrative broken | Confirmed failure | Exit or avoid |

---

## Module 5: Halu-ation Framework

"Halu-ation" = the speculative premium the market assigns based on narrative/imagination, beyond fundamental value.

### Concept

In IDX 2.0, stocks don't just trade on fundamentals. They trade on *stories*. The halu-ation premium is the gap between:

- **Fundamental value** (what the company is worth today based on financials)
- **Market price** (what the market pays based on the story)

A stock trading at 50x P/E when sector average is 15x has a halu-ation premium of ~3.3x.

### Halu-ation Potential Assessment

| Factor | Question |
|--------|----------|
| **Total Addressable Market (TAM)** | How big is the opportunity the story describes? |
| **Scarcity** | Is this the only/best way to play the theme on IDX? |
| **Narrative Simplicity** | Can the story be explained in one sentence? (Simple = more viral) |
| **Bandar Interest** | Is there a conglomerate/major player behind the stock? |
| **Historical Precedent** | Have similar narratives created 2-5x re-ratings before? |
| **Retail Virality** | Is this story spreading on social media / influencer channels? |

### IDX Historical Halu-ation Patterns

Common re-rating narratives in IDX:

| Pattern | Typical Premium | Duration |
|---------|----------------|----------|
| Conglomerate restructuring (BREN, CUAN) | 3-10x book value | 6-18 months |
| Commodity supercycle (coal, nickel) | 2-5x normalized earnings | 12-24 months |
| Tech/digital transformation (GOTO, BUKA) | Revenue multiples, ignore profits | 6-12 months post-IPO |
| Policy windfall (downstream nickel, IKN) | 2-3x sector average P/E | Until policy implementation reality |
| MSCI inclusion (mid-cap promotion) | 10-30% premium from forced buying | 1-3 months around rebalancing |

### Halu-ation Risk

The higher the halu-ation premium, the harder the fall when narrative breaks:

- **Moderate premium** (1.5-2x sector P/E): Soft landing on failure, reversion to mean
- **High premium** (2-4x sector P/E): Significant drawdown risk, -30% to -50%
- **Extreme premium** (>5x sector P/E): Catastrophic downside, -50% to -80% (e.g., BUKA, GOTO post-IPO)

---

## Output Report Structure

```markdown
## Narrative Analysis: {TICKER}

**Verdict:** {STRONG / MODERATE / WEAK / BROKEN}
**Narrative Score:** {X}/15
**Confidence:** {HIGH / MEDIUM / LOW}

### Current Narrative
- Type: {thematic play / turnaround / corporate action / etc.}
- Story: {1-2 sentence summary of what the market believes}
- Business excitement: {exciting future / stable boring / declining}

### Owner & Ownership
- Owner character: {aligned / neutral / extractive}
- Key shareholders: {who holds, recent changes}

### Catalyst Calendar
| Catalyst | Expected Date | Impact | Probability |
|----------|--------------|--------|-------------|
| ... | ... | ... | ... |

### Narrative Strength
- Freshness: {new / developing / aging / stale}
- Market awareness: {unknown / niche / growing / everyone knows}
- Priced in? {no / partially / fully}

### Failure Risks
- Primary failure trigger: {what breaks the story}
- Failure risk score: {0-3}
- Binary dependency: {yes/no — single catalyst or diversified}

### Halu-ation
- Current premium vs sector: {Xx sector P/E}
- Halu-ation potential: {low / moderate / high}
- Downside if narrative breaks: {estimated % drawdown}
```
