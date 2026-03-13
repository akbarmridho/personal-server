# Main Prompt Integration For Technical And Flow Analysis

## Purpose

This document defines how the parent `main.md` prompt should integrate:

- `technical-analysis`
- `flow-analysis`

It is focused on orchestration, not on doctrine.

## Current Parent Prompt Context

The current parent prompt in:

- `prompts/vibe-investor/main.md`

already treats `flow` as one of the four high-level lenses, but it does not yet have a dedicated `flow-analysis` skill in the available-skills list.

## Parent Prompt Change Direction

Once `flow-analysis` exists, the parent prompt should:

- add `flow-analysis` to the available skills list
- explicitly allow the parent to load `technical-analysis` and `flow-analysis` together for symbol work
- keep parent workflow ownership in `main.md`
- keep doctrine ownership inside the two skills

## Parent Decision Model

The parent should treat the skills as complementary, not redundant.

Use:

- `technical-analysis` for price structure and execution map
- `flow-analysis` for sponsor quality and flow-led context

The parent should not ask either skill to impersonate the other.

## When To Load Each Skill

Load only `technical-analysis` when:

- the question is chart-only
- the user asks for structure, levels, trigger, invalidation, or setup analysis

Load only `flow-analysis` when:

- the question is broker-flow-only
- the user asks who is buying, whether accumulation is real, sponsor quality, or whether broker behavior is constructive or dangerous

Load both when:

- the user asks for a full symbol review
- the parent is doing thesis review
- the parent is doing desk-check on a holding or watchlist symbol
- structure and sponsor quality both matter for the decision

## Recommended Parent Run Order

For combined symbol analysis:

1. run `technical-analysis`
2. run `flow-analysis`
3. synthesize in parent

Reason:

- technical analysis defines the visible chart state and the execution map
- flow analysis then tells the parent whether that chart state is being sponsored, opposed, or led by broker behavior

If the immediate user question is primarily broker-flow driven, the parent may invert the order for that live review, but combined backtests should default to technical-first order unless the test explicitly studies order effects.

## Parent Synthesis Questions

When both skills are active, the parent should answer these explicitly:

1. What does price structure say?
2. What does broker flow say?
3. Are they aligned or divergent?
4. If divergent, which clock is likely leading right now?
5. Does the divergence improve opportunity or increase risk?
6. What should the final action emphasis be?

## Agreement Matrix

### Both Bullish

- strongest confirmation case
- constructive bias is allowed if risk and setup remain valid

### Both Bearish

- strongest warning or exit-risk case
- parent should reduce optimism and tighten risk posture

### Technical Bullish, Flow Bearish

- treat as sponsor deterioration or distribution warning
- parent should be more cautious than technical analysis alone

### Technical Weak Or Bearish, Flow Bullish

- treat as early accumulation or early-turn watchlist
- parent should prefer preparation and monitoring over premature confirmation

### Both Mixed Or Weak

- low-quality case
- parent should lean toward `WAIT`

## Parent Output Responsibilities

The parent should own:

- the final combined interpretation
- the weighting between technical and flow evidence
- the explanation of disagreement
- final decision emphasis when both are loaded

The parent should not:

- re-derive chart setup logic already owned by `technical-analysis`
- re-derive broker metrics already owned by `flow-analysis`

## Desk-Check Integration

For future `desk-check` evolution, parent orchestration can become:

1. `portfolio-management` for holdings and discipline context
2. `technical-analysis` for price state and execution map
3. `flow-analysis` for sponsor quality and internal pressure
4. `narrative-analysis` for catalyst and story context
5. parent synthesis

This keeps the parent aligned with the four-lens worldview already stated in `main.md`.

## Backtesting Integration Direction

The combined system should be tested in two stages:

This should align with the shared multi-layer evaluation ladder:

1. independent skill validation
2. pairwise integration validation
3. parent synthesis validation
4. later full desk validation

### Stage 1. Independent Skill Validation

Run `technical-analysis` and `flow-analysis` independently first.

Purpose:

- validate that each skill is useful on its own
- avoid hiding weak flow logic behind technical structure
- avoid hiding weak technical logic behind broker-flow confirmation

### Stage 2. Parent Combined Validation

After standalone validation, test parent synthesis with both skills active.

Parent-level evaluation questions:

- when technical and flow agree, does the combined read improve confidence usefully?
- when they disagree, does the parent classify early warning versus early accumulation correctly?
- does combined synthesis improve decision quality over either skill alone?
- does the parent stay disciplined enough to prefer `WAIT` when the two lenses remain unresolved?

This should be treated as a separate evaluation layer, not just a byproduct of the individual skill tests.

For pairwise and parent-level tests, keep a shared combined log contract with:

- analysis order
- technical verdict or action
- technical confidence
- flow verdict
- flow conviction
- agreement state
- lead lens
- parent synthesis conclusion
- final action emphasis

`analysis order` should normally be:

- `technical-analysis -> flow-analysis -> parent synthesis`

If a run intentionally inverts that order, the log should record the alternate order explicitly.

## Memory And Artifact Direction

Keep skill outputs separate before parent synthesis.

Suggested future symbol artifact set:

- `technical.md`
- `flow.md`
- `narrative.md`
- `synthesis.md`

That keeps:

- raw chart reasoning
- raw broker-flow reasoning
- final combined judgment

cleanly separated.

## Recommended Parent Prompt Notes

When `flow-analysis` is added to `main.md`, the parent prompt should state:

- flow can lead price and should be treated as a different clock from chart structure
- disagreement between technical and flow is often meaningful, not a bug
- combined symbol reviews should usually load both skills when the task is not intentionally narrow

## Implementation Reminder

The parent prompt should stay thin.

It should define:

- when to load which skill
- how to synthesize
- how to route workflows

It should not copy:

- technical doctrine
- broker-flow doctrine
- deep checklists from either skill
