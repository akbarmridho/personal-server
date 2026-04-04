# Impact-Ranked Approaches

Ranked by impact on the core problem: zero BUY recommendations across 100 sessions, portfolio drifting to all-cash. Effort is ignored. Only impact matters.

---

## Tier 1: System-Level Rewires

These change the fundamental decision math. Without these, nothing else matters — you're tuning a system designed to say no.

### 1. Flip the Default for Stale WAIT Only

**What it is:** A global "PILOT by default at composite >= 41" conflicts with existing pilot gates and evidence-grade constraints. Narrow the default flip to stale WAIT symbols only — which is already partially implemented in main.md line 281.

**What changes:** At `wait_desk_check_count >= 3`, the re-underwrite must produce a fresh `composite_decision` with current scores. If pilot gates pass, default outcome is PILOT entry. At `wait_desk_check_count > 5`, hard expiry: PILOT if gates pass, or downgrade to WATCHING. No renewal.

**Why narrow it:** A global default flip would bypass evidence grade, WAIT-age, and reduced-pilot-gate constraints. The stale WAIT ladder already exists — it just needs enforcement discipline.

**Expected outcome:** Perpetual WAIT loops get forced into action after 3-5 desk-checks. No new entries bypass the full gate cascade.

**Risk:** Minimal — the mechanism already exists, just needs consistent application.

### 2. Kill 80% of the Prompt (Keep Skill Preflight)

**What it is:** Strip main.md to ~100 lines of pure decision logic. Move workflow contracts to command markdown files and tool/memory details to reference files. Keep main.md as workflow owner and keep mandatory skill preflight.

**Current main.md breakdown (462 lines, ~5,875 words):**

| Section | Lines | What It Is |
|---------|-------|------------|
| Default Workflows | ~190 | desk-check, deep-review, explore-idea, news-digest, digest-sync contracts |
| Tools + Tool Usage Rules | ~100 | Tool descriptions, call patterns, filing/document workflows |
| Memory | ~95 | Directory tree, file rules, frontmatter schema, registry rules |
| Composite synthesis | ~65 | Scoring formula, action tiers, binary overrides, sizing math |
| Skills | ~20 | Skill loading rules, preflight steps |
| Scenario Discipline | ~15 | Scenario rules |
| Principles | ~10 | Be direct, evidence over opinion |
| Agent Mode | ~8 | Primary vs subagent behavior |
| Header/Intro | ~10 | Identity, Stock Market 2.0, global doctrine |

**The move:**

1. **Workflow contracts → command markdown files.** Each workflow gets its own file under `prompts/workflows/`. The command template loads the file as the user prompt:
   ```json
   "desk-check": {
     "template": "{file:./prompts/workflows/desk-check.md}\n\nCommand input: $ARGUMENTS"
   }
   ```
   Commands are always in context when invoked. Main.md remains workflow owner for cross-cutting rules.

2. **Tools + usage rules → keep in main.md.** Main.md owns tool descriptions, call patterns, and execution discipline.

3. **Memory structure → keep in main.md.** Main.md owns the memory tree, file rules, frontmatter schema, and registry rules.

4. **Keep skill preflight.** Mandatory skill loading (main.md line 143) stays. Skills are loaded on demand for the active workflow, not always in context.

**Cross-cutting boundary:** Composite synthesis contract, hard rails, WAIT staleness, exit specificity, lot-size floor, and cash overlay stay in main.md — these apply across all workflows. Coverage universe, continuity window, run order, lens priorities, and artifact requirements move to workflow files — these are workflow-specific.

**What stays in main.md (~100 lines):**
- Identity + Stock Market 2.0
- Global doctrine (protect capital + deploy capital)
- Composite synthesis contract (scoring formula, action tiers, hard rails, sizing math)
- Skill preflight rules
- Principles
- Agent mode behavior

**What moves:**
- 5 workflow contracts → `prompts/workflows/{workflow}.md`
- Tool descriptions + usage rules stay in `prompts/vibe-investor/main.md`
- Memory details stay in `prompts/vibe-investor/main.md`

**Expected outcome:** Main prompt drops from 462 lines to ~100 lines. The agent reads decision logic, not filesystem instructions. Scores stop being contaminated by operational anxiety. Skill preflight ensures domain-specific doctrine is loaded when needed.

**Risk:** Workflow execution could break if the command template file reference doesn't resolve correctly. Mitigated by the fact that `{file:...}` is a supported OpenCode template syntax and the workflow files are loaded as user prompts, not skill references.

---

## Tier 2: Architectural Changes

### 3. Guardrail Dedupe Only

**What it is:** The same constraint appears in multiple places with different wording, so the agent reads it multiple times and applies it multiplicatively. Consolidate to one source per rule.

| Constraint | Owner | Others become |
|-----------|-------|---------------|
| Invalidation required | TA (G7, R-RISK-01/02) | PM/main.md: one-line reference |
| Liquidity check | PM (ADTV table, `very_low_liquidity`) | TA F17: score reducer only, main.md: reference PM token |
| No averaging down | PM (operating rules) | TA R-RISK-08: one-line reference |
| Regime aggression | PM (aggression curve) | main.md: reference in sizing formula |
| Exit specificity | main.md (composite synthesis) | PM exit doctrine: one-line reference |
| WAIT staleness | main.md (parent synthesis) | PM desk-check: increment counter only |
| "Protect capital and deploy capital" | main.md (global doctrine) | PM concepts: one-line reference |

**What changes:** One owner for each guardrail at the correct layer. Keep layer-local TA validation gates and PM pilot gates where they belong; dedupe only cross-layer restatements that cause the parent synthesis to apply the same constraint twice.

**What stays:** TA red flags stay as-is — they are valid score reducers, not vetoes. TA "stop" rules are score caps feeding the parent composite, not final WAIT vetoes. Stripping them would inflate weak setups.

**Expected outcome:** No more duplicate constraints applied multiple times. The agent reads each rule once, applies it once.

---

## Tier 3: Structural Improvements

### 4. Single `get_state` Tool + Plugin Run Logs

**What it is:** Delete all pre-built caches and generated view files. Replace with one custom tool and one plugin.

**The tool:** `get_state({ types: ["symbols", "theses", "watchlist", "portfolio-monitor"] })` — accepts an array of type strings with defaults for common queries. One call returns everything the agent needs:

```
get_state({ types: ["symbols"] })
  → [{id, status, holding_mode, thesis_id, ...}, ...]  # parsed from live frontmatter

get_state({ types: ["theses"] })
  → [{id, title, type, status, symbols, ...}, ...]     # parsed from live frontmatter

get_state({ types: ["watchlist"] })
  → derived: symbols where status = READY or leader = true

get_state({ types: ["portfolio-monitor"] })
  → derived: holdings + health flags from symbol plans + portfolio_state

get_state({ types: ["symbol"], ids: ["DSNG"] })
  → full frontmatter + file path for specific symbols
```

Error handling: the tool parses what it can from each frontmatter, warns on missing required fields, and never fails silently. Symbol plans with legacy frontmatter (missing fields, `scope: symbol` still present, no exit-review fields) are returned with available data plus a warning flag — the tool does not block the session.

No pre-built cache. No drift. No refresh step. No separate generated view files (`thesis.md`, `watchlist.md`, `portfolio-monitor.md`) — the tool derives them on demand from live frontmatter.

**The plugin:** OpenCode plugin listens to `command.executed` events and logs the command, timestamp, and outcome to `memory/runs/`. The plugin captures run continuity data: `window_from`, `window_to`, `symbols`, and `artifacts` — matching the current contract in main.md lines 252-260.

**Why it matters:** Eliminates 3 registry JSON files, 3 generated view files, the refresh-after-mutation rule, cache drift risk, and the entire "derive registry before run log" step. One tool call replaces 6 files worth of maintenance.

**Expected outcome:** Zero generated files to maintain. Always-current data (reads live frontmatter, not stale caches). One less thing the agent must remember to do (run logs are automatic).

**Risk:** Parsing frontmatter on every call is slower than reading pre-built JSON. Mitigated by the tool only being called when needed, and the fact that 29 small files is trivially fast to parse.

### 5. Flatten Memory to `symbols/`, `theses/`, `market/`, `digests/`

**What it is:** Collapse the entire `memory/` tree into flat directories plus `MEMORY.md`. No more `state/`, no more `analysis/`, no more `registry/`, no more generated view sprawl.

**Current structure (verified from live data):**
```
memory/
├── MEMORY.md
├── notes/                          # 6 files (ihsg, macro, performance, opportunity-cost, thesis, watchlist, portfolio-monitor)
├── registry/                       # 3 JSON files
├── runs/
├── state/
│   ├── symbols/                    # 29 .md files
│   └── theses/                     # thesis folders
└── analysis/
    ├── symbols/{SYMBOL}/{DATE}/    # 870+ date folders
    └── market/{DATE}/              # 18 date folders
```

**Proposed structure:**
```
memory/
├── MEMORY.md                              # Strategic context (like AGENTS.md)
├── notes/                                 # User custom notes, ad-hoc observations
├── market/                                # IHSG + macro merged
│   ├── plan.md                            # IHSG regime context, key levels, operating stance
│   ├── technical.md                       # Current IHSG TA — updated in place
│   ├── narrative.md                       # Macro/news tone — updated in place
│   ├── archive/                           # Old analysis when regime changes
│   └── *.png
├── theses/                                # Was state/theses/
│   └── {THESIS_ID}/
│       ├── thesis.md
│       └── subtheses/
│           └── {SUBTHESIS_ID}.md
├── symbols/                               # All symbols: stocks, indices, commodities, currencies
│   ├── DSNG/
│   │   ├── plan.md                        # Living trading plan (durable state)
│   │   ├── technical.md                   # Current TA — updated in place
│   │   ├── narrative.md                   # Current narrative — updated in place
│   │   ├── flow.md                        # Current flow — updated in place
│   │   ├── archive/                       # Old analysis when setup changes
│   │   └── *.png
│   ├── BBCA/
│   └── ...
├── digests/
│   └── {DATE}_news_digest.md              # Separate entity, its own lifecycle
└── runs/                                  # Plugin-managed, no AI writes
```

**Key decisions:**
- **Symbols = not dated.** Persistent subjects. Update in place. Archive when setup changes. Define "setup change" as: invalidation level changes, `setup_family` changes, or `thesis_status` moves to invalidated. Otherwise the agent either archives too aggressively or never archives. No cross-referencing between directories.
- **IHSG + macro = `market/` folder.** IHSG TA and macro context live together. Same treatment as any symbol — `plan.md`, `technical.md`, `narrative.md`, archive. No special `analysis/market/{DATE}/` foldering.
- **Theses = `theses/` directly under `memory/`.** No more `state/` nesting.
- **`notes/` for user notes.** Custom notes, ad-hoc observations, and anything that doesn't fit the structured directories. No generated views here — just user-written content.
- **News digests = separate entity.** `digests/` directory with date-based naming. Different lifecycle from symbols.
- **No generated view files.** `notes/thesis.md`, `notes/watchlist.md`, and `notes/portfolio-monitor.md` are gone. Per-thesis source files remain under `theses/{THESIS_ID}/thesis.md`. The `get_state` tool derives summary views on demand.
- **No registry.** Gone. Replaced by the tool.
- **No run log writes by AI.** Plugin handles it.

**Why it matters:** From 6 directories (`notes/`, `registry/`, `runs/`, `state/`, `analysis/`, `work/`) to 6 (`notes/`, `market/`, `theses/`, `symbols/`, `digests/`, `runs/`). From 870+ symbol date folders to ~30 symbol folders. From 12 file writes per desk-check to ~1 (symbol plan updates only). Zero generated files. Zero cache maintenance.

**Expected outcome:** The agent reads `symbols/DSNG/plan.md` and `symbols/DSNG/technical.md` from the same directory. One `get_state` call replaces 6 generated files. Market context is in `market/`, not scattered across `notes/ihsg.md`, `notes/macro.md`, and `analysis/market/{DATE}/`. Everything has one home.

---

## Tier 4: Feedback Loops

These add learning and adaptation. Lower immediate impact but compound over time.

### 6. Retest Fast-Track

**What it is:** If price is at or above the prior recommended entry zone, skip the "wait for retest" loop. Force a fresh composite decision. If scores still pass PILOT gates, enter.

**Status:** Partially implemented. TA skill already checks `tested_held/tested_failed/not_tested` for WAIT retraces (line 117). The gap is in the parent synthesis — the agent reads the retest status but doesn't always act on it. The fix is enforcing the check, not adding it.

**Expected outcome:** When the retest already happened, the agent acknowledges it and acts. No more perpetual "wait for 10,900" when price is already at 11,200.

**Risk:** Minor. This is a straightforward enforcement fix with low downside.
