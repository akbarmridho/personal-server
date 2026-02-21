# Entry, Exit, And Rebalancing Playbook

## Objective

Translate weekly-monthly operating rules into explicit entry, exit, and rebalance decision behavior.

## Entry Discipline

- Prefer entries during drawdowns when weakness is temporary and long-term thesis remains valid.
- Avoid discount entries when decline is driven by permanent impairment (business model break, governance failure, terminal dilution).

## Entry Strategies

### Dollar-Cost Averaging (DCA)

- Best for core/stable stocks.
- Fixed amount at regular intervals.

### Lump Sum

- Best for value stocks with confirmed momentum.
- Full position at once.

### Scaling Down (Averaging Down)

| Current Position Size | Trigger |
|-----------------------|---------|
| < 20% of portfolio | Every 10% price drop |
| > 20% of portfolio | Wait for 30% drop |

Only average down on fundamentally sound businesses.

### Scaling Up (Adding To Winners)

If profitable and MoS is still >30%:

- First buy: full initial size
- Second buy: 50% of first
- Third buy: 25% of first

Pyramid discipline:

- Add only if prior tranche is green and thesis/structure remains valid.
- Do not add to losing positions.
- After adding, tighten risk so aggregate trade does not violate portfolio heat limits.

## Exit Strategies

### Profit Taking (Staged)

| Price vs Intrinsic Value | Action |
|--------------------------|--------|
| 70-80% of IV | Hold |
| 90-100% of IV | Sell 30-50% |
| 100-120% of IV | Sell remaining |

After significant gains (>50%), realize part in cash. Do not endlessly roll gains without withdrawals.

### Early Exit (Before IV)

Acceptable when:

1. Better opportunity requires cash.
2. Portfolio cash is too low.
3. Market outlook turns bearish.
4. Position sizing breached limits.

### Cut Loss Framework

| Cut Loss | Do Not Cut Loss |
|----------|-----------------|
| Permanent fundamental change | Price fluctuation on healthy business |
| Governance violation | Market-wide correction |
| Better opportunity requires capital | Short-term noise without thesis break |

### Cut Loss Execution Discipline

- Cut loss is operating cost, not personal failure.
- No thesis, no hold.
- Do not widen stop after entry unless thesis quality objectively improves.
- Do not average down after thesis break.
- Let winners run while structure and thesis remain intact.

## Rebalancing Protocol

### Default Method (IDX Book)

- Baseline cadence: quarterly (monthly only for highly active books).
- Drift trigger: rebalance when weight deviates >20% from target.
- Event trigger: rebalance/replace when thesis breaks, governance risk appears, or liquidity deteriorates.

### Execution Rules

- Trim outperformers and add underweights only if thesis remains valid.
- If thesis breaks, replace the name; do not mechanically top up losers.
- Prefer replacement with lower correlation to current core holdings and acceptable liquidity.
- Include transaction cost/slippage; skip tiny rebalance trades with no material risk impact.

## Implementation Note

Enforcement: agent workflow during New Position Entry, Position Exit, and Rebalance Check workflows (see SKILL.md). Entry strategies are agent-selected based on stock category and conviction. Exit decisions involve agent judgment for cut-loss vs hold (permanent impairment assessment). Rebalancing drift triggers are deterministic (weight deviation >20%); event triggers require agent judgment.
