# Take-Profit Refinement Plan

Based on `tp-chatgpt.md` and `tp-gemini.md`, simplified for the current Vibe Investor architecture.

This plan intentionally covers multiple implementation surfaces that live in different places:

- technical-analysis doctrine and deterministic `ta_context`
- main-workflow synthesis across technical, narrative, flow, and fundamental lenses
- durable per-symbol plan persistence under memory
- technical backtest simulation

It does not move take-profit ownership into thesis memory. Thesis remains theme-level.

## Ownership And Boundaries

Primary owner: `technical-analysis`

- Owns symbol-level take-profit doctrine
- Owns deterministic `ta_context` outputs
- Owns technical backtest behavior

Workflow synthesizer: `main.md`

- Owns final multi-lens judgment across technical, narrative, flow, and fundamental context
- Owns holding-mode selection and non-TA exit overlays
- Resolves technical exit guidance into the actual per-symbol execution plan

Consumer/orchestrator/persistence owner: `portfolio-management`

- Owns live portfolio truth via portfolio tools
- Owns durable per-symbol plan writes under `memory/state/symbols/{SYMBOL}.md`
- Owns workflow-level memory updates, desk-check integration, and run logs

Out of scope for TP state:

- `memory/state/theses/{THESIS_ID}/thesis.md`

Thesis files are theme/timeline memory, not per-ticker take-profit state.

Important boundary:

- `technical-analysis` should not be the sole owner of final exit behavior for all books
- the final exit plan can depend on timeframe, thesis quality, valuation, catalyst path, flow, and portfolio needs
- TA remains the execution baseline, not the only doctrine

Live position truth must come from portfolio tools, not memory inference:

- `portfolio_state` for current holdings and size
- `portfolio_trade_history` / `portfolio_symbol_trade_journey` for realized partial sells and trade lifecycle

## Current State

- `technical-analysis/SKILL.md` has only minimal TP doctrine: target ladder, partial exits, trailing after T1, structural trailing in discovery
- `build_ta_context.py` computes `risk_map` with `target_ladder`, `rr_by_target`, `best_rr` but no explicit trade-management object
- `ta_context_execution.py` builds structural targets and RR but has no partial sizing, no trail-mode selection, and no explicit profit-state model
- Backtest `execution.py` still uses a single `stop_level` and `target_level`
- Backtest `policy.py` returns `HOLD` or `EXIT` from structure/flags only; no partial harvest or trail advancement logic
- Backtest `run_backtest.py` uses `process_intrabar_exit` against one stop and one target; no partial fills, no runner state
- `memory/state/symbols/{SYMBOL}.md` trading plans already support stop, targets, and checkpoint logic, but there is no canonical structured multi-lens exit block yet
- Thesis memory is theme-level and should not become a hidden store for ticker-specific TP state
- Live portfolio tool data already exists, so actual remaining size and realized partials should be sourced from the tool, not reconstructed from notes
- The current TP refinement is still too TA-centric for the actual doctrine in `main.md`, where decisions are often based on multiple lenses and on intended holding style

## Refinement Scope

Five layers, bottom-up:

### Layer 1: Deterministic Scripts (`ta_context` Output)

Goal: `build_ta_context` produces a technical trade-management baseline alongside `risk_map` for:

- actionable `BUY` plans when `risk_map.actionable = true`
- active long reviews when `position_state = long`

Files touched:

- `scripts/ta_context_execution.py`
- `scripts/build_ta_context.py`

Proposed shape:

```yaml
trade_management:
  technical_plan:
    trail_mode: STRUCTURE | ZONE | MA | ATR
    trail_anchor_type: swing_low | demand_zone | ma21 | atr
    partial_plan:
      - target_id: T1
        size_pct: float
        level: number
      - target_id: T2
        size_pct: float
        level: number
      - target_id: T3
        size_pct: float
        level: number | null
    time_stop:
      max_sessions_pre_t1: integer | null
      max_sessions_post_t1_no_new_high: integer | null
  technical_state:
    profit_state: PRE_T1 | POST_T1 | POST_T2 | RUNNER_ONLY
    active_trail_anchor_price: number
    active_trail_anchor_type: swing_low | demand_zone | ma21 | atr
    profit_exit_signals: string[]
    phase_exit_urgency: low | moderate | high
```

Rules:

1. `technical_plan` is available for actionable `BUY` and `HOLD` contexts. This fixes the contract problem where entry requires an exit plan.
2. `technical_state` is only present when `position_state = long`.
3. `partial_plan` is setup-conditioned:
   - S1/S2 continuation: `25 / 25 / 50`
   - S3/S5 reversal: `40 / 30 / 30`
   - S4 rotation: `50 / 30 / 20`
4. `trail_mode` is selected by regime + setup family + Wyckoff maturity:
   - v1 decision matrix:

     | state/regime | setup | maturity | trail_mode |
     |---|---|---|---|
     | any | any | degrading | ATR |
     | balance / range_rotation | any | fresh/maturing/mature | ZONE |
     | any | S4 | fresh/maturing/mature | ZONE |
     | imbalance / trend_continuation | S1/S2 | fresh/maturing | STRUCTURE |
     | imbalance / trend_continuation | S1/S2 | mature | MA |
     | imbalance / trend_continuation | S3/S5 | fresh/maturing/mature | STRUCTURE |
     | fallback | any | fresh/maturing/mature | STRUCTURE |
5. Time-stop values are part of the plan.
   - v1 defaults:
     - `max_sessions_pre_t1 = 15`
     - `max_sessions_post_t1_no_new_high = 10`
   - treat these as conservative defaults for first implementation, then calibrate in backtest.
6. Initial deterministic signal set should stay narrow and only use fields already available with high confidence:
   - `value_acceptance_failure`
   - `wyckoff_distribution_risk`
   - `structure_damage`
7. `poc_stall` is deferred unless we add an explicit deterministic POC migration/stall computation. It should not be treated as "already available wiring".

Dependencies already available in code:

- swing lows from swing logic
- demand/support zones from location mapping
- `EMA21`
- `ATR14`
- Wyckoff maturity/state
- value-area acceptance state
- selected setup family

Net effect: most of Layer 1 is still wiring existing outputs, but value-migration logic is not. Keep the first implementation strict.

Integration point in `build_ta_context.py`:

- compute `risk_map` first
- compute `trade_management` immediately after `risk_map`
- attach it as a sibling top-level section before final result assembly

This keeps the dependency direction explicit because `trade_management` uses `risk_map` outputs such as stop, target ladder, and actionability.

### Layer 2: Technical-Analysis Skill Doctrine

Goal: expand `technical-analysis/SKILL.md` so the skill contract explicitly owns take-profit and trade-management behavior.

Changes:

- Add a dedicated "Take-Profit And Trade Management" section
- Update `ta_context` schema to include `trade_management`
- Update output report structure to show active trade-management context

Compressed rule set:

- R-TP-01: Every actionable `BUY` must include a trade-management plan at entry
- R-TP-02: Targets come from structure/value zones and R-multiples, not oscillators
- R-TP-03: Partial sizing depends on setup family
- R-TP-04: Trail mode depends on regime + setup family + phase maturity
- R-TP-05: Stop may tighten, never loosen
- R-TP-06: After T1, remaining risk must be materially reduced
- R-TP-07: Distribution/maturity signals increase exit urgency
- R-TP-08: Failed value acceptance can trigger harvest/tightening
- R-TP-09: Time stop exists for stale winners, with thresholds calibrated by backtest
- R-TP-10: Discovery mode defaults to trailing over arbitrary top calls
- R-TP-11: Re-add is a fresh entry and must respect existing risk-add rules
- R-TP-12: Balance and imbalance regimes use different profit-taking posture

Schema contract:

- Add `trade_management` as optional top-level section
- Present it when `risk_map.actionable = true` or `position_state = long`
- `technical_plan` is the authoritative chart-driven output for entry and ongoing technical management
- `technical_state` is only for active long maintenance

This section belongs in the technical-analysis skill, not the portfolio skill, because it is symbol-level structure doctrine.

### Layer 3: Main-Workflow Exit Synthesis

Goal: resolve the TA baseline against the actual Vibe Investor doctrine in `main.md`, where positions may be held according to thesis quality, timeframe, narrative, flow, and fundamental context.

Primary principle:

- TA defines the technical exit engine
- the main workflow decides how strongly that engine should govern the actual position
- the final plan is a resolved multi-lens execution contract, not TA output alone

Proposed synthesis shape:

```yaml
execution_plan:
  holding_policy:
    holding_mode: TACTICAL | THESIS | HYBRID
    intended_timeframe: swing | position | long_term
    thesis_quality: high | medium | low
    conviction: high | medium | low
    target_policy: respect_ta_targets | use_ta_as_trim_only | trail_until_thesis_break
    non_ta_exit_drivers:
      - valuation_reached
      - catalyst_played_out
      - flow_deterioration
      - thesis_aging
      - opportunity_cost
  resolved_execution_plan:
    trim_rules: string[]
    runner_policy: string
    final_exit_triggers: string[]
    precedence:
      - hard_invalidation
      - portfolio_risk_override
      - thesis_or_non_ta_exit
      - technical_harvest_or_trail
```

Mode definitions:

- `TACTICAL`
  - TA targets and trail are primary
  - other lenses mainly adjust conviction and aggressiveness

- `THESIS`
  - TA targets are checkpoints or trim levels
  - final hold/exit depends more on thesis quality, valuation, catalyst path, and flow

- `HYBRID`
  - early profit-taking can follow TA
  - the runner is governed by thesis/timeframe quality unless hard technical invalidation breaks first

Resolution rules:

1. Hard invalidation still wins regardless of holding mode.
2. Portfolio risk override can force trimming earlier than both thesis and TA plans.
3. Non-TA exit drivers can convert a TA runner into a trim or full exit.
4. TA profit targets can be treated as:
   - full exit levels
   - trim/checkpoint levels
   - monitoring levels only
5. The final persisted per-symbol plan must record the resolved behavior, not only the raw technical output.

Default `holding_mode` inference for v1:

- `Category = CORE` and `Timeframe = LONG_TERM` -> `THESIS`
- `Category = SPECULATIVE` and `Timeframe = SWING` -> `TACTICAL`
- everything else -> `HYBRID`

Workflow/user overrides are allowed, but this removes ambiguity for first implementation.

This layer belongs to the parent workflow doctrine in `main.md`, not to `technical-analysis` alone.

### Layer 4: Memory And Workflow Integration

Goal: align TP state with `main.md` memory rules without creating a second source of truth.

Primary principle:

- dated technical analysis artifacts store snapshots
- symbol memory stores the current durable plan
- portfolio tools store the live position truth
- thesis memory stores theme/timeline only

Write targets:

- `memory/analysis/symbols/{SYMBOL}/{DATE}/technical.md`
  - dated technical snapshot
  - current `trade_management.technical_plan` and `trade_management.technical_state`
  - retained charts / optional context JSON

- `memory/state/symbols/{SYMBOL}.md`
  - durable current technical baseline
  - durable `holding_policy`
  - durable `resolved_execution_plan`
  - current stop / invalidation / target ladder / checkpoint logic after synthesis
  - no attempt to become the ledger of actual fills

- `memory/state/theses/{THESIS_ID}/thesis.md`
  - unchanged responsibility
  - theme-level timeline only
  - no ticker-specific TP ladder or live trailing state

Source of truth for live state:

- actual current shares / lots / market value: `portfolio_state`
- actual realized partial sells and sell chronology: `portfolio_trade_history` or `portfolio_symbol_trade_journey`

Persistence rules:

1. On entry or explicit save-to-memory, persist:
   - `trade_management.technical_plan`
   - workflow-level `holding_policy`
   - workflow-level `resolved_execution_plan`
   into the per-symbol memory file.
2. On `UPDATE` / maintenance / desk-check, compute a fresh technical `trade_management` snapshot, then resolve it again against:
   - current per-symbol plan memory
   - live portfolio tool data
3. Update `memory/state/symbols/{SYMBOL}.md` only when the resolved plan materially changes.
4. Do not infer partial fills from symbol memory.
5. Do not write TP state into thesis memory.
6. Parent workflow writes memory updates and run logs; subagents only produce retained artifacts for the parent to integrate.

`prior_thesis` / previous-state handling for technical `UPDATE`:

- previous technical plan should be read from `memory/state/symbols/{SYMBOL}.md`
- latest retained technical artifact can provide the most recent dated snapshot
- live portfolio tool data should override any inferred position-progress assumptions
- previous resolved holding mode and execution policy should also be read from `memory/state/symbols/{SYMBOL}.md`
- if `prior_thesis` JSON is passed into `build_ta_context.py`, keep trade-management carry-forward inside the existing payload as an optional key such as `prior_trade_management`
- do not add a separate CLI arg just for TP state in v1

This keeps memory aligned with the current architecture:

- thesis is theme-level
- symbol state is ticker-level durable plan
- portfolio tool is live truth

### Layer 5: Backtest Code

Goal: backtest can simulate staged exits, trailing updates, and winner-staleness rules.

Files touched:

- `backtest/technical/lib/execution.py`
- `backtest/technical/lib/policy.py`
- `backtest/technical/lib/strategies.py`
- `backtest/technical/run_backtest.py`

#### `execution.py`

Extend the position model from one stop/one target to tranches plus runner state.

Proposed changes:

```python
@dataclass
class PositionTranche:
    size_pct: float
    target_level: float | None
    target_id: str
    filled: bool = False

@dataclass
class OpenPosition:
    entry_date: str
    entry_price: float
    size: float
    setup_id: str
    stop_level: float | None = None
    trail_mode: str = "STRUCTURE"
    trail_anchor: float | None = None
    tranches: list[PositionTranche] = field(default_factory=list)
    profit_state: str = "PRE_T1"
    bars_since_entry: int = 0
    bars_since_last_high: int = 0
    source: str = "simulated_entry"
    notes: list[str] = field(default_factory=list)
```

New helpers:

- `build_tranches_from_context(context) -> list[PositionTranche]`
- `update_trailing_stop(position, context, bar) -> float | None`
- `process_partial_exits(position, bar) -> list[ClosedTrade]`
- `advance_profit_state(position) -> str`

`ClosedTrade` semantics:

- each `ClosedTrade` row should represent the actual exited tranche size, not the original full-position size
- add explicit tranche metadata instead of overloading full-position assumptions

Important design constraint:

- trailing updates must be position-aware
- do not blindly trust a raw `trade_management.state.active_trail_anchor_price` from the day context without considering whether T1/T2 already filled

#### `policy.py`

Add `evaluate_long_trade_management(context, position) -> TradeManagementDecision`

Inputs:

- `trade_management.technical_plan`
- `trade_management.technical_state` when available
- live backtest position state

Behavior:

- tighten trail
- harvest next tranche
- force exit on high-priority breakdown
- integrate with existing structural exit logic

#### `run_backtest.py`

Update `_simulate_strategy` so open positions can:

1. increment bar counters
2. advance trailing stop
3. process tranche targets
4. preserve same-bar stop ambiguity handling
5. record partial exits in trade logs
6. update runner/profit-state transitions

Execution model choice for backtest remains explicit:

- target-touch fill vs next-bar-open fill must be chosen deliberately
- do not hide the assumption
- use one execution model consistently in v1 rather than mixing fill semantics by tranche
- preserve explicit same-bar ambiguity handling when stop and target/tranche are both touched

Strategy integration scope for v1:

- first implementation should wire trade management into `ablation` strategy only
- existing non-ablation strategies can stay on their current simpler long-side policy path in the first pass
- broader strategy adoption can follow after the trade-management path is validated

## Implementation Order

1. Layer 1: deterministic `trade_management` in `ta_context`
2. Layer 2: skill doctrine and schema update
3. Layer 3: main-workflow synthesis contract (`holding_policy` + `resolved_execution_plan`)
4. Layer 4: memory and workflow integration with symbol-state persistence
5. Layer 5: backtest support for partials, trailing, and stale-winner logic

This order keeps technical contract first, synthesis contract second, persistence third, validation last.

## Validation

Deterministic validation:

- run `build_ta_context.py` on known scenarios
- confirm `trade_management.technical_plan` appears for actionable `BUY`
- confirm `trade_management.technical_state` appears only for long maintenance contexts
- verify no placeholder/null filler fields are emitted

Memory/workflow validation:

- confirm the resolved plan persists to `memory/state/symbols/{SYMBOL}.md`
- confirm the stored plan includes both technical baseline and holding-policy overlay
- confirm thesis memory remains unchanged with respect to TP
- confirm live position interpretation uses portfolio tools rather than memory inference

Backtest validation:

- compare old single-target model vs partial/trailing model
- evaluate average win size, loss rate, and drawdown behavior
- run ablations:
  - partials only
  - trailing only
  - both

## Open Questions

- ATR trailing multiplier: one global default first, or setup/regime-specific defaults?
- Whether to add deterministic POC migration / stall logic in a second pass
- Whether partial exits in backtest should fill on target touch or next-bar-open for conservative realism
- Whether desk-check workflows need a compact structured exit block added to the symbol plan template for easier parent-agent updates
