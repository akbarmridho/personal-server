import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

import OpenAI from "openai";
import { env } from "../../infrastructure/env.js";
import { logger } from "../../utils/logger.js";

export const goldenHandles = [
  "ApestorNyangkut",
  // "JudiSaham",
  "rakyatkapitalis",
  "Fountaine30",
  "stockmapping",
  "umarfikrii",
  "tuanpasar69",
  "SocialiteGhibah",
  "TradingDiary2",
  "ArvinHonami",
  "pinkbourbon8898",
  "cheytax_1",
  "cukhurukuque",
  "mikelsaham",
  "kr39__",
  "RashkaLLC",
  "buildportosaham",
];

export const searchRumourTargetted = async (params: { daysOld?: number }) => {
  const client = new OpenAI({
    apiKey: env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 600_000,
  });

  const todayDate = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");

  const searchTool: Record<string, any> = {
    type: "x_search",
    enable_image_understanding: true,
  };

  if (params.daysOld) {
    searchTool.from_date = dayjs()
      .tz("Asia/Jakarta")
      .subtract(params.daysOld, "day")
      .format("YYYY-MM-DD");
  }

  const response = await client.responses.create({
    model: "grok-4-1-fast-reasoning",
    input: [
      {
        role: "system",
        content: `
You are a **Social Media Research Agent** that curates **stock market discussions and investment theses** from key Indonesian stock market accounts on X (Twitter).

Your goal: Surface **meaningful conversations** that could inform investment decisions. Think of yourself as building a daily digest for a narrative-driven investor.

Today's date: ${todayDate}

## Target Accounts

${goldenHandles.map((h) => `- @${h}`).join("\n")}

## Search Strategy

1. **Primary Search**: Use \`${goldenHandles.map((e) => `from:${e}`).join(" OR ")}\` with limit 200.
2. **Thread Expansion**: Fetch full threads for posts with substantive replies or ongoing discussion.
3. **Image Analysis**: Many posts contain charts, screener screenshots, or flow data—extract key information from images.

## Quality Filter (IMPORTANT)

**Include** posts that meet ANY of these criteria:
- Has meaningful engagement (several likes, replies, or quote tweets)
- Contains a specific thesis or actionable insight
- Part of a thread with back-and-forth discussion
- Shares data (screener results, flow analysis, chart with annotations)
- Multiple accounts discussing the same ticker/topic (signal of relevance)

**Exclude** posts that are:
- Low engagement AND generic commentary (e.g., "market merah hari ini" with 2 likes)
- Pure retweets without added commentary
- Stale takes with no new information
- Personal/off-topic content

When in doubt about a borderline post, **include it** if it mentions a specific ticker with any form of thesis or observation.

## Content Types to Capture

- **Thesis/Conviction Posts**: "I'm accumulating X because..." or "X is undervalued due to..."
- **Technical Analysis**: Chart patterns, support/resistance, breakout setups
- **Flow & Bandar Activity**: Foreign flow, broker summary, unusual volume, "bandar masuk/keluar"
- **Corporate Actions**: Rights issue, M&A, dividends, stock splits, management changes
- **Sector Plays**: Rotation themes, commodity cycles, macro impact on sectors
- **Early Signals**: Watchlist mentions, "pantau X", "ada yang menarik di Y"
- **Contrarian/Debate**: Disagreements on a stock's direction, bull vs bear cases

## Output Format

Write in **English**. Group related discussions by **ticker, sector, or theme**.

---

## [Ticker: $XXXX] or [Sector: Banking/Coal/etc] or [Theme: descriptive title]

**Date Range**: YYYY-MM-DD to YYYY-MM-DD (or single date)

### Summary

- Consolidated summary of what's being discussed about this ticker/sector/theme
- Key claims, price targets, catalysts, or concerns mentioned
- Note if there's consensus or disagreement among accounts

### Key Posts & Sources

| Author | Date | Key Point | Link |
|--------|------|-----------|------|
| @handle1 | YYYY-MM-DD | Brief summary of their take | [link](url) |
| @handle2 | YYYY-MM-DD | Their perspective/addition | [link](url) |

### Notable Discussion (if any)

- Include if there's meaningful back-and-forth in replies
- \`@handleA\`: "argument or claim"
- \`@handleB\`: "counter-argument or supporting point"

---

## Grouping Rules

1. **Same ticker** → Always group together, even if discussed by different accounts
2. **Related tickers** (e.g., coal stocks ADRO, PTBA, ITMG) → Group under sector if the discussion is about the sector trend
3. **Thematic discussions** (e.g., "foreign flow rotation", "window dressing plays") → Group under theme
4. **Standalone insights** → Can be their own section if significant enough and doesn't fit elsewhere

## Output Expectations

- Typically **5-15 grouped topics** depending on market activity
- Quality over quantity—don't pad with low-value content
- If it's a quiet period with little discussion, it's fine to return fewer topics
- Sort by **relevance/significance**, not just recency
`,
      },
      {
        role: "user",
        content: `Search the target accounts and compile a curated digest of stock market discussions. Group related content by ticker or theme, and filter for quality—skip low-engagement generic posts.`,
      },
    ],
    tools: [searchTool as any],
  });

  if (response.status !== "completed") {
    logger.error(response, "response error");
    throw new Error("Search discussion twitter didn't succeed");
  }

  logger.info(response, "search discussion output");

  return { result: response.output_text, raw: response };
};
