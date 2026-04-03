# System Fixes — Prioritized

Combined behavioral fixes and structural consolidation, ranked by impact on agent behavior.

## Tier 1 — Broken Sizing / Action Output

### 1. Stop double-counting regime

**Status: APPLIED**

Regime penalty was stacking in three places: `portfolio_fit_score`, `regime_aggression`, and `max_new_position_size_pct`. DSNG example: 0.05% position = lunch money.

Changes made:

- `regime_aggression` floor raised from 0.10 to 0.25
- `portfolio_fit_score` scoped to concentration, correlation, liquidity, hard-rail headroom only
- `max_new_position_size_pct` no longer absorbs cash-shortfall pressure
- Cash-shortfall routes exclusively through `regime_aggression`

Files changed: `main.md`, `SKILL.md`, `trading-plan-template-body.md`, `review-watchlist-and-review-logging.md`, `docs/idx-investing-reference-guide.md`

### 2. WAIT staleness forces re-underwrite, not copy-paste renewal

**Status: APPLIED**

`wait_desk_check_count >= 3` now forces a full re-underwrite against current composite score and pilot gates regardless of `retest_status`. Restating old evidence with the same levels is not valid renewal. At count > 5, hard expiry with no renewal permitted. Opportunity-cost ledger feeds into the re-underwrite pressure.

Changes made:

- `SKILL.md` desk-check step 7: three-tier WAIT staleness ladder (normal < 3, re-underwrite >= 3, hard expiry > 5) applies to all WAITs regardless of retest status
- `SKILL.md` desk-check step 8: opportunity-cost ledger creates re-underwrite pressure at 3+ desk-checks, not just a ledger entry
- `main.md` parent synthesis: re-underwrite triggered at `wait_desk_check_count >= 3` with fresh `composite_decision` required; hard expiry at > 5

Files changed: `main.md` (parent synthesis WAIT rules, opportunity-cost rules), `SKILL.md` (desk-check step 7, step 8)

### 3. Auto-exit for dead speculation

**Status: APPLIED**

`SPECULATION` positions in exit-review for 3+ consecutive desk-checks without reclaiming their stated gate now trigger `PM-W12` and `dead_speculation_exit` hard rail, requiring full exit at next liquidity.

Changes made:

- `trading-plan-template-body.md`: added `Exit review state`, `Exit review gate`, `Exit review count` fields to Open Position Monitoring section
- `SKILL.md`: added `PM-W12` health flag, `dead_speculation_exit` token to `hard_rails_triggered` list, exit-review tracking in operating rules, deterministic boundary table entries, desk-check step 5 enforcement
- `main.md`: added dead-speculation exit to hard safety rails list

Files changed: `trading-plan-template-body.md`, `main.md`, `SKILL.md`

### 4. Exit specificity

**Status: APPLIED**

Every exit, trim, or de-risk recommendation now requires: quantity (lots or % of position), price level or condition, and deadline (by session N or by date). Vague labels like "exit-review," "de-risk first," or "consider trimming" are explicitly not valid final recommendations.

Changes made:

- `main.md`: added specificity requirement after exit precedence chain in composite synthesis
- `SKILL.md`: added specificity requirement to exit doctrine

Files changed: `main.md`, `SKILL.md`

## Tier 3 — Structural Consolidation (Deprioritized Until Tier 1/2 Behavior Is Tight)

### 8. Shared workflow base

**Status: APPLIED**

Shared workflow rules section expanded to cover all five workflows. Continuity pattern, execution model, memory mutation rules, registry refresh, artifact paths, success-log format, and review-workflow memory refreshes defined once. Each workflow now specifies only: purpose, coverage universe, continuity window, mandatory memory context, run order, lens priorities, and workflow-specific artifact/mutation rules.

Files changed: `main.md` (restructured workflow section)

### 9. Skill loading simplification

**Status: NOT IMPLEMENTED**

Current: every workflow must "determine intent → resolve reference list → load skills → read references → then start working." Desk-check loads the same skills every time.

Fix:

- Hardcode skill set per workflow:
  - `desk-check`: TA + flow + narrative + PM (always)
  - `deep-review`: TA + flow + narrative + PM + fundamental (selective)
  - `explore-idea`: narrative (lead) + TA (lightweight) + flow (selective) + fundamental (selective)
  - `news-digest`: no skills needed
  - `digest-sync`: no skills needed
- Remove the 4-step "skill and reference preflight" ceremony for fixed workflows
- Keep the preflight only for ad-hoc analysis requests

Files to change: `main.md` (skills section, workflow defaults)

### 10. Evidence-backed scoping

**Status: APPLIED**

Evidence-backed requirement now scoped to thesis changes, status changes, plan changes, new recommendations, and invalidation updates. Timestamp bumps, view refreshes, registry derivation, and run-log writes are explicitly exempt.

Files changed: `main.md` (memory write rules)

## Tier 4 — Clarity / Cosmetic (Deprioritized Until Tier 1/2 Behavior Is Tight)

### 11. Concentration check consolidation

**Status: APPLIED**

50:30:10, sector limits, correlation clustering, theme concentration, and liquidity checks consolidated into a single "Concentration And Liquidity Check" section in `SKILL.md`. The section runs as one pass, produces `concentration_flags[]`, and feeds `portfolio_fit_score` and `max_new_position_size_pct`. Health flag cross-references added. Risk Budgets section now points to the consolidated section instead of defining the rules inline.

Files changed: `SKILL.md` (new Concentration And Liquidity Check section, Risk Budgets trimmed, execution defaults PM-W range updated)

### 12. Exit-review countdown for all classifications

**Status: APPLIED**

Extended exit-review countdown to all trade classifications with a 5-session fuse (vs 3 for `SPECULATION`). `PM-W13` health flag and `stale_exit_review` hard rail token added. Override at count 5 requires fresh evidence — repeating shelf-watch language is not valid.

Files changed: `SKILL.md` (operating rules, health flags, hard_rails_triggered, deterministic boundary table, desk-check step 5)

### 13. Symbol state simplification

**Status: APPLIED**

`watchlist.md` and `portfolio-monitor.md` are now documented as generated views, regenerated from symbol plans + live `portfolio_state` during review workflows. No longer treated as independently maintained files requiring separate evidence-backed updates.

Files changed: `main.md` (state and registry section), `SKILL.md` (memory files table, new position entry step 8, position exit step 4)

### 14. Scenario discipline — encourage progressive adoption

**Status: APPLIED**

Scenario discipline reframed from "optional and case-specific" to "encouraged, progressively introduced." Older symbol plans without scenarios are handled gracefully: desk-check and review workflows now evaluate whether scenarios should be introduced when the evidence suggests multiple plausible paths. Plans that already carry scenarios get the existing compare/retire/update treatment.

Files changed: `main.md` (scenario discipline section), `SKILL.md` (desk-check step 5, deep-review step 6)

### 15. Frontmatter trimming

**Status: APPLIED**

Dropped `scope: symbol` (always same value, implicit from file location) and `symbol` (redundant with `id`) from symbol plan frontmatter. 11 required fields reduced to 9.

Files changed: `main.md` (frontmatter rules), `trading-plan-template-body.md`
