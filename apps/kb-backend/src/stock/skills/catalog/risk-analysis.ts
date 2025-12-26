import type { Skill } from "../types.js";

export const riskAnalysis: Skill = {
  name: "risk-analysis",
  description:
    "A concise IDX Stock Market 2.0 risk framework to judge “less risk” using the 4 most important risks: **flow (distribution), narrative failure, liquidity/exit, and dilution**—plus a simple scoring and sizing rule.",
  content: `### Definition (IDX 2.0)
**Risk = chance you get trapped or permanently damaged × how bad the damage is** (not just volatility).

### The 4 Core Risks (most important)
1) **Flow / Distribution Risk (Bandar risk)**
   *Are you buying into accumulation or becoming exit liquidity?*
   Highest priority because flow often overrides fundamentals.

2) **Narrative Failure Risk**
   *What story moves the stock, and what event makes it wrong (delay/policy flip/no progress)?*
   If the story breaks, price can re-rate instantly.

3) **Liquidity / Exit Risk**
   *Can you exit fast without crashing the price?*
   Thin liquidity turns “small loss” into “can;t sell”.

4) **Dilution / Funding Risk**
   *Does the thesis require new money (RI/placement/warrants) that can dilute you?*
   Common in capex/project stories.

### Quick Scoring (0-3 each)
Score each: **0 = low**, **1 = manageable**, **2 = high**, **3 = extreme**
**Total = 0-12**
- **0-4:** lower risk (can size larger)
- **5-8:** medium risk (moderate size, strict plan)
- **9-12:** high risk (small size / trading only)

### Hard Rules (gates)
- If **Flow risk = 3** → avoid unless you are scalping.
- If **Liquidity risk = 3** → position must be small regardless of upside.
- If **Dilution risk = 3** → don;t size up until funding is clear.

### One-line “Margin of Safety” (IDX 2.0)
Margin of safety = **(not distribution) + (exit is easy) + (thesis not binary) + (no dilution surprise)**.`,
};
