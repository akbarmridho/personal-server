# Memory Maintenance Workflow

Housekeeping workflow for memory hygiene. Run occasionally to fix drift between prompt contracts and memory state.

Command input may narrow scope to specific areas (e.g., `symbols only`, `theses only`, `cleanup only`).

## Contract

- Purpose: audit memory files for structural correctness, remove stale artifacts, and align memory state with current prompt and skill contracts.
- This workflow reads and fixes. It does not run analysis, fetch market data, or produce investment conclusions.

## Checks

Run all checks unless command input narrows scope.

### 1. Frontmatter schema compliance

- Load all symbol plans via `get_state({ types: ["symbols"] })` and all thesis files via `get_state({ types: ["theses"] })`.
- For each symbol plan, verify frontmatter matches the contract in `memory/symbols/README.md`: required fields `id`, `watchlist_status`, `trade_classification`, `holding_mode`, `thesis_id`, `last_reviewed`, `next_review`, `leader`, `tags`. Remove legacy fields (`scope`, `symbol`, or any field not in the current schema). Add missing fields with sensible defaults and flag them in the report.
- For each thesis file, verify frontmatter matches the contract in `memory/theses/README.md`: required fields `id`, `scope: thesis`, `title`, `type`, `parent_thesis_id`, `status`, `symbols`, `last_updated`, `tags`. Same cleanup rules.
- Fix files in place. Report what was changed.

### 2. Orphan and consistency checks

- Symbols referencing a `thesis_id` that doesn't exist as a thesis file → flag.
- Thesis files listing symbols that don't have a corresponding `memory/symbols/{SYMBOL}/plan.md` → flag.
- Symbol plans with `watchlist_status: ACTIVE` but no matching holding in `portfolio_state` → flag.
- Symbol plans with `watchlist_status: REMOVED` that still have non-archived artifacts → flag for cleanup.

### 3. Stale content detection

- Symbol plans where `last_reviewed` is older than 30 days → flag as stale.
- Thesis files where `last_updated` is older than 30 days → flag as stale.
- Digests older than 30 days in `memory/digests/` → list for optional cleanup.
- Market artifacts (`desk_check.md`, `deep_review.md`, `explore_idea.md`) older than 14 days → flag as stale.

### 4. Work folder cleanup

- List all files under `work/`.
- Delete everything in `work/`. This folder is disposable scratch by definition.

### 5. Archive hygiene

- Check `memory/symbols/*/archive/` and `memory/market/archive/` for files older than 90 days → list for optional cleanup (do not auto-delete archives without confirmation).

## Output

Produce a maintenance report with:

- Files fixed (frontmatter corrections, legacy field removals).
- Orphans and inconsistencies found.
- Stale items flagged.
- Work folder: what was deleted.
- Archive items listed for optional cleanup.
- Summary: overall memory health assessment in 2-3 sentences.
