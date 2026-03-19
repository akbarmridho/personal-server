# Flow Future Improvements

## Purpose

This note captures the main follow-up gaps between the current `flow-analysis` implementation and the richer behavior described in `flow-plan/idx-flow.html`.

The current implementation is complete enough for practical use:

- deterministic broker-flow fetch exists
- deterministic `flow_context` exists
- `flow-analysis` skill exists
- parent workflow integration exists

This document is for future upgrades, not for reopening the completed base implementation.

## Current Boundary

Current `flow-analysis` already covers:

- `CADI`
- selected-period `Buy vs VWAP`
- `GVPR`
- `MFI`
- `Frequency Profile`
- persistence
- concentration
- trust regime
- verdict
- monitoring

Current limitations that matter:

- broker-flow fetch defaults to `60` sessions, which is fine for active read + trust read, but still thin for heavier statistical validation
- the system uses deterministic, transparent heuristics first
- the system does not attempt full product-parity black-box replication

## Future Improvements

### 1. Ridge `R²` With Out-Of-Sample Validation

Source-truth gap:

- `idx-flow.html` describes flow-price trust using a model-style `R²` with out-of-sample validation

Current implementation:

- trust uses deterministic regime inputs plus `Spearman` flow-price relationship

Why it matters:

- trust level gates how much authority broker flow gets
- a model-based `R²` captures explanatory power across multiple features better than one-series correlation

Why it is deferred:

- exact source-truth feature set and training protocol are unknown
- current default history is too short for a credible rolling train/test process
- this needs a wider broker-flow history window than the current operational default

Needed before implementation:

- longer broker-flow history, ideally well beyond `60` sessions
- explicit design choices for:
  - features
  - target horizon
  - train/test split
  - walk-forward method
  - ridge regularization
  - badge thresholds

### 2. `Rank IC`

Source-truth gap:

- `idx-flow.html` describes `Rank IC` as a separate ranking-skill metric

Current implementation:

- no explicit `Rank IC`

Why it matters:

- `R²` answers explanatory fit
- `Rank IC` answers whether the signal orders better periods above worse periods
- the trust layer is more complete with both

Why it is deferred:

- same data-length problem as `R²`
- best implemented together with the model-validation layer instead of as an isolated cosmetic field

### 3. Rolling Trust Regime Series

Source-truth gap:

- `idx-flow.html` shows a time-varying regime series, not only one static trust badge

Current implementation:

- one static trust summary per run

Why it matters:

- a ticker can be broadly trustworthy over the full window but weak right now
- news-driven or speculative phases can temporarily break flow usefulness

Why it is a strong next candidate:

- this is easier than full `R²` / `Rank IC` parity
- it can be implemented with the current data shape
- it would make flow history more comparable to TA’s phase-history style reasoning

Recommended implementation direction:

- compute a rolling local trust proxy over a shorter sliding window
- classify each window as:
  - `high`
  - `transitioning`
  - `low`
- expose:
  - the rolling series
  - the current state

### 4. Standalone `SMT` Score

Source-truth gap:

- `idx-flow.html` presents `SMT` as a dedicated 0-100 composite with component breakdown

Current implementation:

- the same behavioral ingredients are spread across verdict inputs instead of emitted as a single `SMT` card

Why it matters:

- the skill/output currently has to interpret components separately
- the source-truth product treats `SMT` as a distinct read

Why it is deferred:

- `SMT` is product doctrine, not a standard market metric
- adding it too early risks turning the implementation into a black box

Recommended implementation direction:

- only add `SMT` once component definitions are fixed and transparent
- emit:
  - `smt_score`
  - component values
  - component weights
- keep it explicitly documented as a product-specific composite

### 5. `SMT` Confidence And `SMT`-Specific Wash Discount

Source-truth gap:

- `idx-flow.html` discounts `SMT` specifically using confidence and wash-risk meta information

Current implementation:

- wash risk and anomaly are global fields
- no SMT-specific discounted score exists

Why it matters:

- source-truth logic distinguishes:
  - raw `SMT`
  - whether that `SMT` should be trusted
- this is more specific than a general trust downgrade

Why it is deferred:

- depends on having a standalone `SMT` first

Recommended implementation direction:

- only after `SMT` exists:
  - add `smt_confidence`
  - add `smt_wash_discount`
  - add `smt_effective_score`

## Priority Order

If future work resumes, the recommended order is:

1. rolling trust regime series
2. standalone `SMT` with explicit components
3. `SMT` confidence and `SMT`-specific wash discount
4. ridge `R²` with out-of-sample validation
5. `Rank IC`

Reason:

- rolling trust regime is the most implementable next upgrade with current constraints
- `SMT` work improves source-truth usability without needing a larger research/statistics stack
- `R²` and `Rank IC` are more ambitious and deserve more history plus explicit validation design

## Non-Goals

Do not treat these improvements as reasons to reopen the current completed base implementation.

The current `flow-analysis` stack is already good enough for:

- deterministic preprocessing
- flow verdict
- trust-aware synthesis
- real workflow use

These improvements are for parity and refinement, not for basic viability.
