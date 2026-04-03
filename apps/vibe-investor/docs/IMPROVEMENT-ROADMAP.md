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
- `DROPPED` — triaged out (see `docs/iteration-3-triage.md` for reasoning)
- `SKIPPED` — deprioritized, not worth pursuing unless explicitly revisited

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
| 2.1 | Skill output contract: TA conviction score | DONE | `tasks/2.1-ta-conviction-score.md` | 2.0 |
| 2.2 | Skill output contract: flow conviction score | DONE | `tasks/2.2-flow-conviction-score.md` | 2.0 |
| 2.3 | Skill output contract: narrative conviction score | DONE | `tasks/2.3-narrative-conviction-score.md` | 2.0 |
| 2.4 | Skill output contract: fundamental conviction score | DONE | `tasks/2.4-fundamental-conviction-score.md` | 2.0 |
| 2.5 | Skill output contract: PM produces constraints not verdicts | DONE | `tasks/2.5-pm-constraints.md` | 2.0 |
| 2.6 | Parent synthesis: weighted composite scoring in main.md | DONE | `tasks/2.6-composite-scoring.md` | 2.1–2.5 |
| 2.7 | Continuous aggression curve (replaces binary regime gate) | DONE | `tasks/2.7-aggression-curve.md` | 2.6 |
| 2.8 | Downstream contract cleanup (main.md, trading-plan-template) | DONE | `tasks/2.8-contract-cleanup.md` | 2.6 |
| 2.9 | Agent performance tracker | DONE | `tasks/2.9-agent-performance.md` | 2.6 |

Source: `docs/session-analysis/architecture-proposal.md`, `docs/session-analysis/radical-redesign-proposal.md`

## Iteration 3 — Flow Analysis Improvements

Refinements to the deterministic flow analysis pipeline. Triaged for agent decision impact — see `docs/iteration-3-triage.md` for full reasoning.

Implementation order: bug fix first (3.5), then new signals (3.3 → 3.4 → 3.9 → 3.8), then 3.6 after 2.7 ships.

| # | Item | Status | Task File | Depends On |
|---|------|--------|-----------|------------|
| 3.1 | Strong verdict tiers (5 levels) | DROPPED | `tasks/3.1-strong-verdict-tiers.md` | — |
| 3.2 | Standalone SMT score with explicit components | SKIPPED | `tasks/3.2-smt-score.md` | — |
| 3.3 | Gini-based concentration asymmetry | DONE | `tasks/3.3-gini-concentration.md` | — |
| 3.4 | Freq+Gini divergence (narrowed from multi-type) | DONE | `tasks/3.4-multi-divergence.md` | 3.3 |
| 3.5 | Regime threshold calibration | DONE | `tasks/3.5-regime-thresholds.md` | — |
| 3.6 | Stock beta relative to IHSG | DONE | `tasks/3.6-stock-beta.md` | 2.7 |
| 3.7 | Rolling trust regime series | DROPPED | `tasks/3.7-rolling-trust.md` | — |
| 3.8 | High volatility regime | DONE | `tasks/3.8-high-volatility-regime.md` | — |
| 3.9 | Net accumulation price | DONE | `tasks/3.9-net-accumulation-price.md` | — |
| 3.10 | Wyckoff PS/PSY detection (continuation/pullback deferred) | DONE | `tasks/3.10-wyckoff-ps-psy.md` | — |
| 3.11 | Per-broker persistence table | DROPPED | `tasks/3.11-broker-persistence.md` | — |
| 3.12 | Wyckoff phase history with event chains | DROPPED | `tasks/3.12-wyckoff-event-chains.md` | 3.10 |
| 3.13 | SMT confidence and wash discount | SKIPPED | `tasks/3.13-smt-confidence.md` | 3.2 |
| 3.14 | Participant-type flow breakdown | PLANNED | `tasks/3.14-participant-flow.md` | — |
| 3.15 | Ridge R² with out-of-sample validation | DROPPED | `tasks/3.15-ridge-r2.md` | — |
| 3.16 | Rank IC | DROPPED | `tasks/3.16-rank-ic.md` | 3.15 |

Source: `docs/flow-future-improvements.md`, triaged in `docs/iteration-3-triage.md`

## Research Items

No active research items. 3.10 (PS/PSY) shipped with PS/PSY detection only; continuation/pullback deferred because the event schema lacks a direction field. 3.14 (participant flow) moved to PLANNED after discovering `broker_type` field already exists in `fetch-broker-flow` output (`Asing`/`Pemerintah`/`Lokal`).

## Non-Goals

- Do not reopen the completed base flow-analysis implementation for these improvements.
- Do not add a screener/watchlist feature yet — the bottleneck is decisions, not discovery. Revisit after Iteration 1+2 land.
- Do not add new skills or agents — the current topology (single agent + subagents, 5 skills) is correct.
- Do not build per-broker detail into the standard flow_context pipeline. For single-symbol deep dives needing broker-level granularity, the agent can access raw `fetch-broker-flow` output and generate ad-hoc scripts under `work/`. See `docs/iteration-3-triage.md` notes section.
