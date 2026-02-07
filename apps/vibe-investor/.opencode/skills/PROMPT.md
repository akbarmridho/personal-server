# Skills — Writing Guide

You are writing or updating **skill files** for an AI investment analyst agent focused on the **Indonesian stock market (IDX/BEI)**. Each skill is a comprehensive methodology document that teaches the agent *how to analyze* a specific domain.

## What Skills Are

The agent has two types of knowledge:

- **Skills** — *how to analyze* (workflows, checklists, methodologies, scoring frameworks, reference code). This is what you're writing.
- **Knowledge catalog** — *domain-specific facts* to apply during analysis (sector metrics, broker codes, regulatory context). NOT what you're writing.

Skills are loaded on-demand via the `skill` tool when the agent needs deep methodology for a domain. They are injected as tool results and **protected from session compaction** — once loaded, they persist in context. This means skills can be longer than knowledge catalog entries, but every line must earn its place.

## System Context

The agent operates as a single "vibe-investor" agent with 5 on-demand skills:

| Skill | Domain | Tier (IDX 2.0) |
|-------|--------|----------------|
| `flow-analysis` | Bandarmology, foreign flow, frequency analysis | Tier 1 (King) |
| `narrative-analysis` | Story, catalysts, re-rating, halu-ation | Tier 2 |
| `technical-analysis` | Price action, structure, S/R, volume, charts | Tier 3 |
| `fundamental-analysis` | Financials, valuation, moat, risk | Tier 4 (Filter) |
| `portfolio-management` | Position sizing, entry/exit, review, session logs | Operations |

**IDX 2.0 Hierarchy**: Flow > Narrative > Technical > Fundamental. The agent weighs signals accordingly. Each skill should be aware of this hierarchy and reference where its analysis sits in the overall picture.

### Available Tools

Skills reference tools the agent has access to. Be specific about which tools to use and how:

**MCP Tools (stock data):**
- `get-stock-fundamental` — Key statistics, financial ratios (10-year history)
- `get-stock-financials` — Income statement, balance sheet, cash flow
- `get-stock-governance` — Management, ownership, insider activity
- `get-stock-bandarmology` — Broker summary, net flow, accumulation/distribution
- `get-sectors` / `get-companies` — Sector discovery, peer comparison

**MCP Tools (knowledge base):**
- `search-documents` / `list-documents` / `get-document` — Filings, analysis, news, rumours

**MCP Tools (social):**
- `search-twitter` — IDX stock discussions, sentiment, rumour tracking

**MCP Tools (internet):**
- `web_search_exa` / `crawling_exa` — Web search and page scraping

**Custom Tools:**
- `fetch-ohlcv` — Download 3 years of daily OHLCV data (price, volume, foreign flow, frequency)
- `list-knowledge` / `get-knowledge` — Browse and load knowledge catalog entries

**Built-in:**
- `skill` — Load another skill (for cross-skill reference)
- Filesystem tools (read, write, edit, glob, grep)
- Bash (for Python execution)

### OHLCV Data Schema

The `fetch-ohlcv` tool downloads daily records with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | "YYYY-MM-DD" |
| `open`, `high`, `low`, `close` | int | Prices in IDR |
| `volume` | int | Shares traded |
| `foreignbuy`, `foreignsell` | int | Foreign flow values in IDR |
| `foreignflow` | int | Cumulative foreign flow |
| `frequency` | int | Number of transactions |
| `freq_analyzer` | float | Frequency analysis metric |
| `value` | int | Total trading value |
| `dividend` | int | Dividend amount (0 if none) |
| `shareoutstanding` | int | Outstanding shares |
| `soxclose` | int | Market cap at close |

Not all skills use OHLCV. Only include the schema in skills that need it (currently: `technical-analysis`, `flow-analysis`).

## File Format

Each skill lives in its own directory: `.opencode/skills/{skill-name}/SKILL.md`

### Frontmatter (YAML)

```yaml
---
name: flow-analysis
description: Bandarmology and money flow analysis for IDX stocks — bandar accumulation/distribution detection, foreign flow patterns, frequency and transaction analysis, flow-price divergence signals, and flow-based entry/exit scoring.
---
```

**Fields:**

| Field | Rules |
|-------|-------|
| `name` | Must match the directory name. Lowercase with hyphens: `^[a-z]+(-[a-z]+)*$` |
| `description` | One sentence, starts with the domain name. Lists key capabilities after an em dash (—). This appears in the agent's skill list. |

### Content Structure

Every skill follows the same structural pattern. Adapt sections as needed but maintain the general flow:

```
Frontmatter
  ↓
Data Sources (what tools to use)
  ↓
Analysis Workflow (phased methodology)
  ↓
Modules (numbered domain sections)
  ↓
Checklists (verification items)
  ↓
Output Report Structure (standardized output format)
  ↓
Reference Code (if applicable — Python snippets)
```

## Content Principles

### 1. Methodology Over Facts

Write **how to analyze**, not domain facts. The knowledge catalog provides facts. Skills provide the analytical framework.

- **Good**: "Calculate Foreign Participation Rate: (Foreign Buy + Foreign Sell) / (2 × Total Value). Above 30% = foreigners actively controlling direction."
- **Bad**: "BBCA is a Big 4 bank with CASA ratio of ~80% and NIM of ~5.8%."

When a skill needs domain facts (like sector-specific metrics), reference the knowledge catalog:

```markdown
For sector-specific metrics, use `get-knowledge` from the knowledge catalog
(e.g., `get-knowledge banking-sector` for banking-specific ratios).
```

### 2. Phased Workflow

Every skill must define a clear analysis workflow with phases. The agent needs to know what to do first, what depends on what, and when to stop.

**Standard phases:**

1. **Data Collection** (parallel) — Which tools to call simultaneously
2. **Systematic Analysis** (sequential) — Numbered modules in order
3. **Synthesis/Verdict** — How to combine findings into a verdict

Be explicit about parallelism: "Call in parallel: `tool-a` + `tool-b` + `tool-c`" tells the agent to make concurrent requests.

### 3. Scoring Systems

Quantify assessments wherever possible. Scoring matrices give the agent structured decision-making:

```markdown
| Factor | Score | Criteria |
|--------|-------|----------|
| Factor A | 0-3 | 0 = worst, 1 = ..., 2 = ..., 3 = best |
| Factor B | 0-3 | ... |

**Interpretation:**
| Score | Verdict | Action |
|-------|---------|--------|
| 10-12 | STRONG | ... |
| 7-9   | MODERATE | ... |
| 0-6   | WEAK | ... |
```

This gives the agent consistent, reproducible outputs rather than subjective hand-waving.

### 4. Tables Over Prose

Tables are the primary formatting tool. Use them for:

- **Metric definitions** with formulas and benchmarks
- **Decision matrices** (if X and Y then Z)
- **Scoring rubrics** with criteria
- **Comparison grids** (when to use method A vs B)
- **Phase descriptions** with expected patterns

Reserve bullet points for short lists (3-5 items). Reserve prose for brief context sentences (1-2 lines max before a table or list).

### 5. Checklists for Verification

Use markdown checkbox format for items the agent should verify:

```markdown
- [ ] Revenue trend positive/stable?
- [ ] OCF tracks Net Profit?
- [ ] DSO and DIO < 60 days?
```

Checklists appear in two contexts:
- **Pre-analysis checklists**: "Before starting, verify..." (data availability, preconditions)
- **Assessment checklists**: "Check all applicable items" (systematic verification during analysis)

### 6. Reference Code (When Applicable)

Only `technical-analysis` and `flow-analysis` currently need reference code (Python for data processing, charting, indicator calculation). If your skill involves data computation, include working Python snippets.

**Code rules:**
- Complete, copy-paste-ready snippets (no pseudocode)
- Use `pandas`, `numpy`, `mplfinance` (available in the agent's environment)
- Variables should be self-descriptive
- No `pip install` — libraries are pre-installed
- Save outputs to `work/` directory

### 7. Output Report Structure

Every skill must end with a standardized output report template. This is the format the agent uses when writing analysis results to `memory/analysis/{TICKER}/`.

Use markdown code blocks with placeholder syntax:

```markdown
## Output Report Structure

\```markdown
## {Skill} Analysis: {TICKER}

**Verdict:** {VERDICT_OPTIONS}
**Score:** {X}/{MAX}
**Confidence:** {HIGH / MEDIUM / LOW}

### Section 1
- Key finding: {what}
- Evidence: {specific data}

### Section 2
| Column | Value |
|--------|-------|
| ... | ... |
\```
```

### 8. IDX 2.0 Awareness

Every skill should acknowledge the IDX 2.0 reality where applicable:

- Fundamentals are a **filter**, not a price driver
- Flow (bandar, foreign) often **overrides** other signals
- Narrative creates the demand that bandars exploit
- "Cheap" doesn't mean it will go up
- "Expensive" doesn't mean it will go down

Don't repeat this in every section — state it once where relevant and move on.

### 9. Cross-Skill References

Skills can reference each other by name but should NOT duplicate content:

- **Good**: "For flow-based confirmation, see the `flow-analysis` skill."
- **Good**: "IDX 2.0 risk scoring is detailed in `fundamental-analysis` Module 4."
- **Bad**: Copying the IDX 2.0 risk scoring table into every skill.

Skills can also reference the knowledge catalog for domain facts:

- **Good**: "Load sector framework via `get-knowledge` before applying valuation methods."

### 10. Scope Boundaries

Each skill should clearly state what is and isn't in scope. This prevents the agent from using the wrong tool for the job.

```markdown
**NOT in scope for this skill:** `get-stock-bandarmology` (flow analysis),
`fetch-ohlcv` (technical analysis). This skill focuses on X, not Y.
```

## Sizing Guide

| Skill | Target Lines | Why |
|-------|-------------|-----|
| `technical-analysis` | 500-700 | Heavy — includes reference code for all indicators, chart generation, VPVR, Fibonacci |
| `fundamental-analysis` | 350-450 | Moderate — 7 valuation methods with formulas, 4 analysis modules, checklists |
| `flow-analysis` | 200-300 | Moderate — scoring matrices, divergence tables, broker interpretation framework |
| `narrative-analysis` | 200-300 | Moderate — narrative types, catalyst mapping, halu-ation framework |
| `portfolio-management` | 250-350 | Moderate — position sizing rules, entry/exit strategies, templates, cycle rotation |

**General rule**: 200-450 lines for most skills. Only exceed 500 if the skill includes substantial reference code. Every line should teach the agent something it can act on.

## Skill Template

```markdown
---
name: {skill-name}
description: {Domain} for IDX stocks — {capability 1}, {capability 2}, {capability 3}.
---

## Data Sources

**MCP Tools (call in parallel for full analysis):**

- **`tool-name`** — What it returns. How to use it.
- **`tool-name`** — What it returns.

**Knowledge Catalog:** `list-knowledge`, `get-knowledge` for {what kind of reference data}.

**NOT in scope:** `tool-x` ({why — belongs to another skill}).

---

## Analysis Workflow

### Phase 1: Data Collection (Parallel)

Call in parallel: `tool-a` + `tool-b` + `tool-c` for the symbol.

### Phase 2: Systematic Analysis (Sequential)

1. **{Topic}** (Module 1) — {brief description}
2. **{Topic}** (Module 2) — {brief description}
3. **{Topic}** (Module 3) — {brief description}

### Phase 3: Verdict

Form verdict: **{OPTION_A / OPTION_B / OPTION_C}** with confidence level.

---

## Module 1: {Topic}

### {Subtopic}

| Column A | Column B | Column C |
|----------|----------|----------|
| ... | ... | ... |

### {Subtopic}

- [ ] Checklist item 1?
- [ ] Checklist item 2?

---

## Module 2: {Topic}

{Content following same dense table/bullet style}

---

## Output Report Structure

\```markdown
## {Skill} Analysis: {TICKER}

**Verdict:** {OPTIONS}
**Score:** {X}/{MAX}
**Confidence:** {HIGH / MEDIUM / LOW}

### {Section}
{Template fields with placeholders}
\```
```

## Reference Example

The best reference for a complete skill is `fundamental-analysis` (444 lines). It demonstrates:

- **Data Sources** with explicit tool names and usage notes
- **3-Phase Workflow** (collect → analyze → synthesize)
- **4 Analysis Modules** with checklists, scoring, and decision tables
- **Knowledge Catalog integration** for sector-specific facts
- **Cross-Validation guidance** (when methods disagree)
- **IDX 2.0 awareness** woven into relevant sections (not forced everywhere)
- **Standardized Output Report** with table-based format

For a skill with reference code, see `technical-analysis` (681 lines) which adds working Python snippets for indicators, chart generation, and pattern detection.

## Common Mistakes to Avoid

1. **Writing facts instead of methodology** — "BBCA has 80% CASA ratio" is a knowledge catalog entry. "Check CASA ratio; >60% indicates low cost of funds, compare to sector average" is a skill.
2. **Missing the workflow** — A skill without a phased workflow is just a reference document. The agent needs to know what to do first.
3. **No scoring system** — Subjective "this looks good/bad" is unhelpful. Quantify with scoring matrices that produce reproducible verdicts.
4. **Forgetting tool references** — Every data point the agent needs should trace back to a specific tool. Don't say "check the company's revenue" — say "from `get-stock-financials`, check revenue trend."
5. **No output template** — The agent writes results to memory files. Without a template, output format is inconsistent across sessions.
6. **Duplicating content from another skill** — Reference the other skill by name. Don't copy the IDX 2.0 risk framework into every skill.
7. **Mixing facts into methodology** — Sector-specific benchmarks (what NIM is good for banks) belong in the knowledge catalog. The skill says "compare NIM to sector benchmark from knowledge catalog."
8. **Missing scope boundaries** — Without explicit "NOT in scope" declarations, the agent may try to do flow analysis while running fundamental analysis, loading unnecessary tools.
9. **Prose-heavy sections** — If you're writing more than 2 consecutive sentences without a table, bullet list, or code block, you're probably being too verbose.
10. **Ignoring IDX 2.0 reality** — A fundamental analysis skill that says "buy when PER is low" without acknowledging that cheap fundamentals alone don't drive IDX prices is incomplete.
