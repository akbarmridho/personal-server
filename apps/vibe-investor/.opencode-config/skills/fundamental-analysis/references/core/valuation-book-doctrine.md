# Valuation Book Doctrine

Curated doctrine hub derived from `apps/vibe-investor/valuation-book-extract/`.

Use this layer when refining valuation references, not during normal runtime analysis. The extraction folder remains the raw archive. This curation layer keeps only reusable doctrine.

## What This Layer Captures

- philosophy that should shape valuation behavior
- method selection and exclusion logic
- assumption discipline
- sector- and model-specific method fit
- reconciliation rules when outputs diverge

## Curation Map

- `valuation-method-selection.md`
  - best method by business model
  - wrong-method exclusions
  - how to choose primary and secondary checks
- `valuation-assumption-discipline.md`
  - intrinsic value framing
  - margin-of-safety discipline
  - assumption quality, normalization, macro sensitivity, and failure cases
- `valuation-sector-fit.md`
  - sector or business-model-specific valuation fit
  - key metrics, invalid methods, and what actually drives justified premium or discount
- `valuation-reconciliation-rules.md`
  - how to explain method divergence
  - when to weight, scenario-frame, or discard a method

## Runtime Relationship

- `valuation-methods-framework.md` is the runtime-ready reference.
- This doctrine layer is the research-to-reference bridge.
- `valuation-book-extract/` is source archive only.

## High-Level Takeaways From The Ebook

- Valuation is range-based judgment, not point precision.
- Method fit matters more than formula complexity.
- Cheapness without quality validation is often a trap.
- Financials, cyclicals, growth names, and conglomerates require different valuation logic.
- Divergence across methods is an analytical clue, not something to average away mechanically.
