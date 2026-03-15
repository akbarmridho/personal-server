# Technical Analysis Core Contract Decisions

## Purpose

This file records the contract decisions that are already settled for the current technical-analysis refactor.

It is no longer a speculative future-state note.
The authoritative runtime owners are now:

- `apps/vibe-investor/.opencode-config/skills/technical-analysis/references/workflow-spine.md`
- `apps/vibe-investor/.opencode-config/skills/technical-analysis/references/policy-contract.md`

This file exists only to keep the accepted contract direction easy to review.

## Resolved Structural Decisions

### Workflow ownership

The runtime workflow is owned by `workflow-spine.md`.

It owns:

- phase order
- purpose mode handling
- depth mode handling
- daily versus `60m` authority split
- stop rules
- escalation entry rules

### Policy ownership

The runtime decision contract is owned by `policy-contract.md`.

It owns:

- action space
- setup space
- minimum required decision fields
- packet schema
- escalation contract

### `SKILL.md` role

`SKILL.md` is now a thin router.

It should:

- define scope
- define load order
- define script entrypoints
- route references

It should not grow back into the main doctrine owner.

## Resolved Workflow Model

Canonical phase order:

1. `MODE`
2. `STATE`
3. `LOCATION`
4. `SETUP`
5. `TRIGGER`
6. `CONFIRMATION`
7. `RISK`
8. `DECISION`
9. `MONITORING`

Authority split:

- daily owns thesis direction, setup context, and main risk map
- `60m` owns trigger, confirmation, follow-through, and tactical timing

Conflict rule:

- daily keeps directional authority
- `60m` may delay action, downgrade confidence, or keep the system in `WAIT`
- `60m` should not create a trade against the daily thesis by itself

## Resolved Core Doctrine

The core method should remain:

- market structure and trend
- support and resistance / location
- daily thesis plus `60m` timing
- lean MA regime:
  - `EMA21`
  - `SMA50`
  - `SMA200`
- explicit trigger, confirmation, invalidation, and risk mapping

This is the authoritative core stack.

## Resolved Non-Core Doctrine Direction

These are not part of the preferred core methodology:

- adaptive MA
- `FVG / imbalance`

Current direction:

- adaptive MA and `FVG / imbalance` should remain non-core unless later backtests justify them

Non-core layers must not override:

- structure
- location
- trigger
- invalidation
- risk

## Resolved Wyckoff Direction

Wyckoff stays, but in a narrower role.

Accepted role:

- separate historical-state module
- slower context layer
- support for one concrete setup archetype:
  - `S5` Wyckoff spring with reclaim

Rejected role:

- main thesis engine
- replacement for structure-first reading
- broad narrative override layer

Research priority:

- use `wyckoff-research-gpt.md` as the main design reference
- treat `wyckoff-research-gemini.md` as secondary reference only

## Resolved Runtime Principles

- chart-first behavior stays
- deterministic preprocessing stays first
- chart reading stays a secondary evidence layer, not the primary source of truth
- uncertainty should continue to default to `WAIT`
- chart generation and `ta_context` remain separate steps

## Still Open

These are not contract debates anymore.
They are remaining implementation items:

- separate Wyckoff historical-state engine
- Wyckoff history chart artifact
- IDX-specific backtest assumptions
- simple-baseline rule definitions
- liquidity gate for `60m`
- corporate-action-aware backtest handling
