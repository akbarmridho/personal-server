# Memory Maintenance Workflow

Housekeeping workflow for memory hygiene. Run occasionally to fix drift between prompt contracts and memory state.

Command input may narrow scope to specific areas (e.g., `symbols only`, `theses only`, `cleanup only`).

## Contract

- Purpose: audit memory files for structural correctness, remove stale artifacts, and align memory state with current prompt and skill contracts.
- This workflow reads and fixes. It does not run analysis, fetch market data, or produce investment conclusions.

## Checks

Run all checks unless command input narrows scope.

### 1. Frontmatter schema compliance

- Load all symbol plans and thesis files from `get_state` output.
- For each symbol plan, verify frontmatter matches the contract in `memory/symbols/README.md`: required fields `id`, `watchlist_status`, `trade_classification`, `holding_mode`, `thesis_id`, `last_reviewed`, `next_review`, `leader`, `tags`. Remove legacy fields (`scope`, `symbol`, or any field not in the current schema). Add missing fields with sensible defaults and flag them in the report.
- For each thesis file, verify frontmatter matches the contract in `memory/theses/README.md`: required fields `id`, `scope: thesis`, `title`, `type`, `parent_thesis_id`, `status`, `symbols`, `last_updated`, `tags`. Same cleanup rules.
- Fix files in place. Report what was changed.

### 2. Orphan and consistency checks

- Symbols referencing a `thesis_id` that doesn't exist as a thesis file → flag.
- Thesis files listing symbols that don't have a corresponding `memory/symbols/{SYMBOL}/plan.md` → flag.
- Symbol plans with `watchlist_status: ACTIVE` but no matching holding in `portfolio_state` → flag.
- Symbol plans with `watchlist_status: REMOVED` that still have non-archived artifacts → flag for cleanup.

### 3. Content archival review

For each symbol directory under `memory/symbols/{SYMBOL}/`:

- Read `plan.md` body content and all sibling artifacts (`technical.md`, `narrative.md`, `flow.md`, charts, context JSON).
- Identify content that is superseded or no longer current:
  - Artifact files (`technical.md`, `narrative.md`, `flow.md`) whose analysis references prices, levels, or dates that are significantly outdated compared to `plan.md`'s `last_reviewed`.
  - Scenario branches in `plan.md` that were already resolved or retired but still written out in full.
  - Sections referencing removed prompt concepts (composite scores, action tiers, WAIT loops, or any other contract that no longer exists in the current prompt).
- Move superseded artifacts to `memory/symbols/{SYMBOL}/archive/` with a date prefix (`YYYY-MM-DD_filename`).
- For `plan.md` body content that contains stale sections: trim the stale content and note what was archived.
- Apply the same logic to `memory/market/` artifacts: if `desk_check.md`, `deep_review.md`, or `explore_idea.md` contain analysis from a prior regime or outdated context, archive the old version and leave a clean current file.

For each thesis file under `memory/theses/`:

- Read body content. If the thesis `status` is `INACTIVE` and `last_updated` is older than 60 days, move the entire thesis directory to an archive location and report it.
- If active, check for stale scenario branches or sections referencing removed concepts. Clean in place.

### 4. Review overdue and inactive resurfacing

- Use the computed `review_overdue`, `days_overdue`, and `days_since_review` fields from `get_state` output. These are computed by the tool — no manual date math needed.
- Symbols with `review_overdue: true` → list with days overdue.
- Symbols with `days_since_review > 30` → flag as stale.
- Thesis files with `review_stale: true` (computed by `get_state` when `days_since_update > 30`) → flag.
- Inactive or WATCHING/REMOVED symbols: do a lightweight check via `list-documents` for recent news or filings mentioning these symbols in the last 30 days. If material documents exist, flag the symbol as worth revisiting with a one-line summary of what was found. This catches interesting developments in names the active workflows skip.

### 5. Stale content detection

- Digests older than 30 days in `memory/digests/` → list for optional cleanup.
- Market artifacts (`desk_check.md`, `deep_review.md`, `explore_idea.md`) older than 14 days → flag as stale.

### 6. Work folder cleanup

- List all files under `work/`.
- Delete everything in `work/`. This folder is disposable scratch by definition.

### 7. Archive hygiene

- Check `memory/symbols/*/archive/` and `memory/market/archive/` for files older than 90 days → list for optional cleanup (do not auto-delete archives without confirmation).

## Output

Produce a maintenance report with:

- Files fixed (frontmatter corrections, legacy field removals).
- Content archived (which artifacts were moved to archive and why).
- Orphans and inconsistencies found.
- Review overdue: symbols and theses past their review dates.
- Resurfaced: inactive/dormant symbols with recent interesting documents worth revisiting.
- Stale items flagged.
- Work folder: what was deleted.
- Archive items listed for optional cleanup.
- Summary: overall memory health assessment in 2-3 sentences.
