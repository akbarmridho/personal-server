---
name: ipo-analysis
description: IPO analysis reference — why traditional analysis fails for IPOs, underwriter role and track records, oversubscription/scarcity tactics, price cooking patterns, acceleration board risks, and lock-up expiry dynamics.
---

# IPO Analysis Reference

IPOs on IDX require a distinct analytical approach — traditional fundamental and technical analysis are largely ineffective.

## Why Traditional Analysis Fails

| Method | Problem |
|--------|---------|
| **Fundamental** | Prospectus financials often "dressed up." Proceeds usage is future promise. Many IPOs are founder/VC exits ("finish line"), not new beginnings |
| **Technical** | No price history. Charts start Day 1 — indicators (MA, RSI) are useless |
| **Valuation** | IPO price is negotiated between owner and underwriter, not set by market supply/demand |

## Three Key Elements

### The Asset

| Profile | Characteristics |
|---------|----------------|
| **High-profile / famous brand** | Easy to sell to retail, often boring price action (low volatility). Ex: GoTo, Bukalapak at IPO |
| **Unknown / obscure company** | Harder to sell, requires "marketing." Often highly volatile (easy to pump). High risk, high reward |

### The Seller (Underwriter)

- **Institutional UW**: Places large blocks to funds. Stable price, less explosive.
- **Retail UW**: Distributes to public. Often associated with aggressive price action ("gorengan").
- Always check UW's historical IPO track record (e.g., MG, YP, HD, EP).

### The Selling Strategy

- **Primary market**: Distribution during bookbuilding/offering phase
- **Secondary market**: Distribution after listing via active trading/manipulation

## Common Manipulation Patterns

### Oversubscription & Scarcity

1. Limit retail allotment → create "oversubscribed" news
2. Retailers get tiny allocation (0.1% of order) → FOMO
3. Retailers forced to chase price up in regular market on listing day

### Price Cooking (Goreng Saham)

Common in smaller, unknown IPOs:

1. **Listing day**: Price spikes to ARA (Auto Rejection Atas)
2. **Day 2-3**: Continued pump to attract attention
3. **Retail entry**: Volume surges as retailers chase
4. **Distribution**: UW/insiders dump shares
5. **Collapse**: Price crashes, often below IPO price

### Acceleration Board (Papan Akselerasi) Trap

- Stocks on Papan Akselerasi can drop to Rp 1 (not limited to Rp 50 like main/development board)
- Extremely high risk for inexperienced participants

## Post-IPO Dynamics

- **Lock-up period**: Pre-IPO shareholders typically locked for ~8 months
- **Lock-up expiry**: Often triggers massive selling pressure — key date to track
- **Use of proceeds**: Monitor if company executes promises (buy land, build factory) or just pays off debt

## Implementation Note

Enforcement: agent workflow when analyzing IPO or recently-listed stocks (see SKILL.md mechanism routing). Underwriter track record assessment uses historical data. Manipulation pattern identification is agent judgment based on price/volume behavior. Lock-up expiry dates are deterministic from prospectus.
