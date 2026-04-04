# Implementation Plan

Tracks execution order, status, context prompts, and migration prompts for each item from `impact-ranked-approaches.md`.

---

## Execution Order

| # | Item | Status |
|---|------|--------|
| 1 | Flip the Default for Stale WAIT Only | done |
| 2 | Kill 80% of the Prompt (Keep Skill Preflight) | done |
| 3 | Guardrail Dedupe Only | done |
| 4 | Single `get_state` Tool + Plugin Run Logs | done |
| 5 | Flatten Memory to `symbols/`, `theses/`, `market/`, `digests/` | done |
| 6 | Retest Fast-Track | done |

---

## 1. Flip the Default for Stale WAIT Only

**Status:** done

**Scope:** Enforce existing stale WAIT ladder in main.md lines 280-281. No new mechanism — just ensure the agent consistently applies the rule at `wait_desk_check_count >= 3` (re-underwrite, default PILOT if gates pass) and `wait_desk_check_count > 5` (hard expiry).

**Context prompt:**

```
Read these files before starting:
- prompts/vibe-investor/main.md (lines 280-282, the WAIT staleness contract)
- .opencode-config/skills/portfolio-management/SKILL.md (Desk Check Review, lines 401-421, the PM-side staleness increment)
- docs/impact-ranked-approaches.md (item 1, for the narrow scope — stale WAIT only, not global default flip)

The mechanism exists. The fix is enforcement discipline. Do not add new gates or change the ladder structure.
```

**Migration prompt:** N/A — no memory structure changes.

---

## 2. Kill 80% of the Prompt (Keep Skill Preflight)

**Status:** done

**Scope:** Move workflow contracts to command markdown files. Keep tools and memory details in main.md. Keep main.md as workflow owner and keep skill preflight.

**Context prompt:**

```
Read these files before starting:
- prompts/vibe-investor/main.md (full file, identify what stays vs moves)
- opencode-config.json (command definitions, update templates to use {file:...} syntax)
- docs/impact-ranked-approaches.md (item 2, for the cross-cutting boundary)

Cross-cutting rules (stay in main.md): composite synthesis contract, hard rails, WAIT staleness, exit specificity, lot-size floor, cash overlay.
Workflow-specific rules (move to workflow files): coverage universe, continuity window, run order, lens priorities, artifact requirements.
Keep skill preflight (main.md line 143). Do not remove mandatory skill loading.
```

**Migration prompt:** N/A — no memory structure changes.

---

## 3. Guardrail Dedupe Only

**Status:** done

**Scope:** One owner per guardrail. Remove cross-layer restatements that cause the parent synthesis to apply the same constraint twice.

**Context prompt:**

```
Read these files before starting:
- prompts/vibe-investor/main.md (binary overrides, composite synthesis, WAIT staleness)
- .opencode-config/skills/portfolio-management/SKILL.md (risk budgets, concentration checks, exit doctrine, pilot gates)
- .opencode-config/skills/technical-analysis/SKILL.md (G1-G11 hard gates, R-RISK rules, red flags)
- docs/impact-ranked-approaches.md (item 3, for the ownership map)

Ownership map:
- Invalidation required → TA (G7, R-RISK-01/02). Others: one-line reference.
- Liquidity check → PM (ADTV table, very_low_liquidity). TA F17: score reducer only.
- No averaging down → PM (operating rules). TA R-RISK-08: one-line reference.
- Regime aggression → PM (aggression curve). main.md: reference in sizing formula.
- Exit specificity → main.md (composite synthesis). PM exit doctrine: one-line reference.
- WAIT staleness → main.md (parent synthesis). PM desk-check: increment counter only.
- "Protect capital and deploy capital" → main.md (global doctrine). PM concepts: one-line reference.

TA red flags stay as-is. TA "stop" rules are score caps, not vetoes.
```

**Migration prompt:** N/A — no memory structure changes.

---

## 4. Single `get_state` Tool + Plugin Run Logs

**Status:** done

**Scope:** Create custom tool that parses frontmatter from live symbol/thesis files. Create plugin for run logs. Make derived state views tool-backed and run logs plugin-owned.

**Context prompt:**

```
Read these files before starting:
- prompts/vibe-investor/main.md (get_state contract, plugin-owned run log schema, memory tree)
- .opencode-config/skills/portfolio-management/SKILL.md (get_state usage, memory file table)
- .opencode-config/plugins/run-log.ts (run-log plugin implementation)
- docs/impact-ranked-approaches.md (item 4, for tool contract and error handling)

Tool contract: get_state({ types: [...] }) returns parsed frontmatter. Error handling: parse what you can, warn on missing required fields, never fail silently on legacy frontmatter.
Plugin contract: listen to command.executed events, log window_from, window_to, symbols, artifacts to memory/runs/.
```

**Migration prompt:**

```
Run this migration after implementing the get_state tool:

1. For each symbol plan in memory/symbols/*/plan.md:
   - Parse frontmatter
   - Verify required fields: id, watchlist_status, trade_classification, holding_mode, thesis_id, last_reviewed, next_review, leader, tags
   - Warn on any missing fields or legacy fields (scope: symbol)
   - Output a summary of files needing attention

2. For each thesis in memory/theses/*/thesis.md:
   - Parse frontmatter
   - Verify required fields: id, scope, title, type, parent_thesis_id, status, symbols, last_updated, tags
   - Warn on any missing fields

3. After verifying all frontmatter is parseable:
   - Update prompts, skills, docs, templates, and live memory navigation to use get_state for derived views
   - Keep process ledgers under memory/notes/

4. Test: run get_state({ types: ["symbols"] }) and verify output matches expected frontmatter for all symbols.
```

---

## 5. Flatten Memory to `symbols/`, `theses/`, `market/`, `digests/`

**Status:** done

**Scope:** Collapse memory tree. Merge state/symbols + analysis/symbols into one symbols/ directory. Merge IHSG + macro into market/. Remove state/ and analysis/ directories.

**Context prompt:**

```
Read these files before starting:
- prompts/vibe-investor/main.md (memory directory tree, file path references)
- .opencode-config/skills/portfolio-management/SKILL.md (memory file table, path references)
- .opencode-config/skills/technical-analysis/SKILL.md (artifact path references)
- docs/impact-ranked-approaches.md (item 5, for the proposed structure and archive trigger)

Proposed structure:
- memory/symbols/{SYMBOL}/plan.md, technical.md, narrative.md, flow.md, archive/, *.png
- memory/market/plan.md, technical.md, narrative.md, archive/, *.png
- memory/theses/{THESIS_ID}/thesis.md, subtheses/
- memory/digests/{DATE}_news_digest.md
- memory/notes/ (user custom notes only)
- memory/runs/ (plugin-managed)

Archive trigger: archive when invalidation level changes, setup_family changes, or thesis_status moves to invalidated.
IHSG becomes a symbol in market/, not a special case in analysis/market/{DATE}/.
```

**Migration prompt:**

```
Run this migration after updating all file path references in main.md and skill files:

1. Create the new directory structure:
   - mkdir -p memory/symbols memory/market memory/theses memory/digests memory/notes memory/runs

2. Migrate symbol plans and analysis:
   - For each file in memory/state/symbols/{SYMBOL}.md:
     - Create memory/symbols/{SYMBOL}/plan.md
     - Copy the plan content, update any internal references to analysis paths
   - For each symbol with analysis in memory/analysis/symbols/{SYMBOL}/{DATE}/*:
     - Copy the most recent technical.md → memory/symbols/{SYMBOL}/technical.md
     - Copy the most recent narrative.md → memory/symbols/{SYMBOL}/narrative.md
     - Copy the most recent flow.md → memory/symbols/{SYMBOL}/flow.md (if exists)
     - Copy chart files (*.png) → memory/symbols/{SYMBOL}/
     - Archive older analysis: move to memory/symbols/{SYMBOL}/archive/{DATE}-{type}.md when setup changed (invalidation level, setup_family, or thesis_status changed)

3. Migrate market context:
   - Merge memory/notes/ihsg.md and memory/notes/macro.md into memory/market/plan.md
   - Copy the most recent IHSG technical analysis from memory/analysis/market/{DATE}/technical.md → memory/market/technical.md
   - Copy IHSG charts → memory/market/
   - Archive older market analysis

4. Migrate theses:
   - mv memory/state/theses/* memory/theses/

5. Migrate notes:
   - Keep memory/notes/agent-performance.md and memory/notes/opportunity-cost.md
   - Keep ihsg.md and macro.md content merged into market/plan.md (step 3)

6. Update all file path references:
   - In main.md: update memory tree, file path patterns
   - In skill files: update any references to memory/state/symbols/, memory/analysis/symbols/, memory/notes/ihsg.md, memory/notes/macro.md
   - In command workflow files: update artifact path patterns

7. Remove old directories:
   - rm -rf memory/state memory/analysis

8. Test:
   - Verify `memory/state` and `memory/analysis` are gone
   - Verify live artifacts now sit under `memory/symbols/`, `memory/theses/`, `memory/market/`, and `memory/digests/`
   - Verify no stale `memory/state/` or `memory/analysis/` references remain outside `memory/archive/` snapshots and historical `memory/runs/` logs
```

---

## 6. Retest Fast-Track

**Status:** done

**Scope:** Enforce the retest check in parent synthesis. TA skill already checks tested_held/tested_failed/not_tested (line 117). The gap is in the parent synthesis — the agent reads the retest status but doesn't always act on it.

**Context prompt:**

```
Read these files before starting:
- prompts/vibe-investor/main.md (desk-check defaults, WAIT staleness, parent synthesis)
- .opencode-config/skills/technical-analysis/SKILL.md (UPDATE requirements, lines 113-123, retest status check)
- docs/impact-ranked-approaches.md (item 6, for the enforcement scope)

The TA skill already produces retest_status (tested_held/tested_failed/not_tested). The fix is in parent synthesis: when retest_status is tested_held and composite scores pass PILOT gates, enter. No new mechanism — just enforce the check.
```

**Migration prompt:** N/A — no memory structure changes.
