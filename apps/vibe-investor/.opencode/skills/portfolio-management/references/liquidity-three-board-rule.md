---
name: liquidity-three-board-rule
description: Exit-liquidity sizing reference — “three-board” order-book depth heuristic plus ADTV fallback sizing for weekly–monthly positions.
category: portfolio-management
---

# Liquidity Sizing (Weekly–Monthly) — “Three-Board” Rule

Liquidity is relative to **your size**. A stock can be liquid for a 10-lot trader and illiquid for a 500,000-lot trader.

## Three-board heuristic (order-book depth)

Reference idea: estimate the value available in the first **3 price levels** (“tiga papan”) on the bid.

| If your intended position is… | Then the stock is… | Why it matters |
|---|---|---|
| **≤** the value in top 3 bid levels | More “exitable” | You can exit without smashing through many levels |
| **>** the value in top 3 bid levels | Illiquid *for you* | Your sell becomes the crash catalyst |

## ADTV fallback (when you don’t want to rely on order-book snapshots)

Use **Average Daily Trading Value (ADTV)** as a sizing anchor:

| Position size vs ADTV | Liquidity risk |
|---|---|
| ≤ 1% of ADTV | Low (usually) |
| 1–5% of ADTV | Medium (needs staged exits) |
| > 5% of ADTV | High (assume slippage + long exit time) |

## Practical note

Even if you invest weekly–monthly, **exits happen in days** when narratives fail. Size for the exit you might need, not the entry you want.
