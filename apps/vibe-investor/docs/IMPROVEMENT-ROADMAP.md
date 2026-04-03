# Vibe Investor — Improvement Roadmap

Last updated: 2026-04-03

## Purpose

Single source of truth for what to improve, in what order, and what state each item is in.

Detailed task breakdowns live in `docs/tasks/`. This file owns priority, status, and dependencies only.

## Status Legend

- `PLANNED` — scoped and ready to implement
- `RESEARCH` — needs deep research before implementation (spin up research agent)
- `BLOCKED` — waiting on a dependency
- `IN_PROGRESS` — actively being worked on
- `DONE` — shipped

## Iteration 1 — Fix the "Never Buys" Problem

The core behavioral issue: the agent identifies good names but never pulls the trigger. Cash drifted from 38% → 62% over 2 months with zero buy recommendations. Root cause is a 20-gate serial veto chain where any single failure defaults to WAIT.

These items are ordered by implementation sequence. Dependencies are explicit — later items build on schema introduced by earlier ones.

| # | Item | Status | Task File | Depends On |
|---|------|--------|-----------|------------|
| 1.1 | Forced decision timeline on every WAIT | DONE | `tasks/1.1-decision-timeline.md` | — |
| 1.2 | Wait staleness tracking in symbol memory | DONE | `tasks/1.2-wait-staleness.md` | 1.1 (extends `active_recommendation` schema) |
| 1.3 | Retest-observed check in TA UPDATE mode | DONE | `tasks/1.3-retest-observed.md` | 1.2 (updates `retest_status` field) |
| 1.4 | Pilot entry pathway in portfolio management | DONE | `tasks/1.4-pilot-entry.md` | 1.1 (uses decision horizon for pilot expiry) |
| 1.5 | Opportunity cost tracking | DONE | `tasks/1.5-opportunity-cost.md` | 1.2 (uses wait age data) |

Source: `docs/session-analysis/improvement-recommendations.md` (Options A + B + E)

Ship this iteration first. Evaluate whether the agent starts deploying capital before moving to Iteration 2.

## Iteration 2 — Conviction Scoring Architecture

Replace the binary gate cascade with continuous conviction scoring. Skills produce scores (0-100), parent synthesis computes a weighted composite, and the composite maps to sized actions.

Migration order follows the radical-redesign-proposal's phased approach: add shadow scoring alongside existing outputs first, validate, then replace.

| # | Item | Status | Task File | Depends On |
|---|------|--------|-----------|------------|
| 2.0 | Shadow scoring bridge (add scoring layer alongside existing outputs) | DONE | `tasks/2.0-shadow-scoring.md` | Iteration 1 complete |
| 2.1 | Skill output contract: TA conviction score | DONE | `tasks/2.1-ta-conviction-score.md` | 2.0 validation deferred until Iteration 2 contract patch lands |
| 2.2 | Skill output contract: flow conviction score | DONE | `tasks/2.2-flow-conviction-score.md` | 2.0 validation deferred until Iteration 2 contract patch lands |
| 2.3 | Skill output contract: narrative conviction score | DONE | `tasks/2.3-narrative-conviction-score.md` | 2.0 validation deferred until Iteration 2 contract patch lands |
| 2.4 | Skill output contract: fundamental conviction score | DONE | `tasks/2.4-fundamental-conviction-score.md` | 2.0 validation deferred until Iteration 2 contract patch lands |
| 2.5 | Skill output contract: PM produces constraints not verdicts | DONE | `tasks/2.5-pm-constraints.md` | 2.0 validation deferred until Iteration 2 contract patch lands |
| 2.6 | Parent synthesis: weighted composite scoring in main.md | DONE | `tasks/2.6-composite-scoring.md` | 2.1–2.5 |
| 2.7 | Continuous aggression curve (replaces binary regime gate) | PLANNED | `tasks/2.7-aggression-curve.md` | 2.6 |
| 2.8 | Downstream contract cleanup (main.md, trading-plan-template) | PLANNED | `tasks/2.8-contract-cleanup.md` | 2.6 |
| 2.9 | Agent performance tracker | PLANNED | `tasks/2.9-agent-performance.md` | 2.6 |

Source: `docs/session-analysis/architecture-proposal.md`, `docs/session-analysis/radical-redesign-proposal.md`

## Iteration 3 — Flow Analysis Improvements

Refinements to the deterministic flow analysis pipeline. Separate iteration after Iteration 2 lands, because the flow output contract changes in 2.2.

Note: 3.1 (strong verdict tiers) is only relevant if Iteration 2 has NOT shipped yet. Once 2.2 replaces categorical verdicts with conviction scores, 3.1 becomes moot — the 5-tier granularity is captured by the continuous score. If Iteration 2 ships first, skip 3.1.

| # | Item | Status | Task File | Depends On |
|---|------|--------|-----------|------------|
| 3.1 | Strong verdict tiers (5 levels) — skip if 2.2 ships first | PLANNED | `tasks/3.1-strong-verdict-tiers.md` | — |
| 3.2 | Standalone SMT score with explicit components | RESEARCH | `tasks/3.2-smt-score.md` | — |
| 3.3 | Gini-based concentration asymmetry | PLANNED | `tasks/3.3-gini-concentration.md` | — |
| 3.4 | Multi-type divergence detection | PLANNED | `tasks/3.4-multi-divergence.md` | 3.3 (needs Gini for freq+Gini divergence) |
| 3.5 | Regime threshold calibration | PLANNED | `tasks/3.5-regime-thresholds.md` | — |
| 3.6 | Stock beta relative to IHSG | PLANNED | `tasks/3.6-stock-beta.md` | — |
| 3.7 | Rolling trust regime series | PLANNED | `tasks/3.7-rolling-trust.md` | — |
| 3.8 | High volatility regime | PLANNED | `tasks/3.8-high-volatility-regime.md` | — |
| 3.9 | Net accumulation price | PLANNED | `tasks/3.9-net-accumulation-price.md` | — |
| 3.10 | Wyckoff PS/PSY events + continuation/pullback | RESEARCH | `tasks/3.10-wyckoff-ps-psy.md` | — |
| 3.11 | Per-broker persistence table | PLANNED | `tasks/3.11-broker-persistence.md` | — |
| 3.12 | Wyckoff phase history with event chains | PLANNED | `tasks/3.12-wyckoff-event-chains.md` | 3.10 |
| 3.13 | SMT confidence and wash discount | BLOCKED | `tasks/3.13-smt-confidence.md` | 3.2 |
| 3.14 | Participant-type flow breakdown | RESEARCH | `tasks/3.14-participant-flow.md` | — |
| 3.15 | Ridge R² with out-of-sample validation | RESEARCH | `tasks/3.15-ridge-r2.md` | — |
| 3.16 | Rank IC | RESEARCH | `tasks/3.16-rank-ic.md` | 3.15 |

Source: `docs/flow-future-improvements.md`

## Research Items

Items marked `RESEARCH` need a deep research pass before implementation can be scoped.

| Item | What needs research |
|------|-------------------|
| 3.2 SMT score | Validate component weights against AlphaFlow guide vs live UI discrepancy. Design absorption detection algorithm. Determine normalization approach for each component to 0-100 scale. |
| 3.10 Wyckoff PS/PSY | Define detection heuristics for PS and PSY events — what volume/price/close-position thresholds distinguish PS from noise and from SC? How to handle multiple PS events in sequence? Validate against AlphaFlow's BMRI phase history examples. |
| 3.14 Participant-type flow | Build or source a broker-code-to-participant-type mapping for IDX. Determine which brokers are foreign, smart money, local institution, retail-heavy. Assess how static this mapping is and how to maintain it. |
| 3.15 Ridge R² | Design the feature set, target horizon, train/test split, walk-forward method, and regularization approach. Determine minimum data length needed for credible results. |
| 3.16 Rank IC | Same infrastructure as 3.15 — research together. |

## Non-Goals

- Do not reopen the completed base flow-analysis implementation for these improvements.
- Do not add a screener/watchlist feature yet — the bottleneck is decisions, not discovery. Revisit after Iteration 1+2 land.
- Do not add new skills or agents — the current topology (single agent + subagents, 5 skills) is correct.
