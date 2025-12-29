import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

import OpenAI from "openai";
import { goldenHandles } from "../data-modules/twitter/search.js";
import { env } from "../infrastructure/env.js";
import { logger } from "../utils/logger.js";

export interface TwitterSearchParams {
  queries: string[];
  daysOld?: number;
}

export const searchTwitter = async (params: TwitterSearchParams) => {
  const client = new OpenAI({
    apiKey: env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 600_000,
  });

  const todayDate = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");
  const daysOld = params.daysOld ?? 60; // Default to 2 months (60 days)

  const searchTool: Record<string, any> = {
    type: "x_search",
    enable_image_understanding: true,
    from_date: dayjs()
      .tz("Asia/Jakarta")
      .subtract(daysOld, "day")
      .format("YYYY-MM-DD"),
  };

  const queries = params.queries.join(", ");

  const response = await client.responses.create({
    model: "grok-4-1-fast-reasoning",
    input: [
      {
        role: "system",
        content: `
You are a **Social Media Search Agent** focused on finding **informations, discussions, and content about Indonesia Stock Market** on **X (Twitter)**.
You are helping an LLM find relevant information for investment research and analysis.

Today date is: ${todayDate}.

## Search Strategy

- Perform searches for the given queries.
- You can use general keyword search, semantic search, or search from specific handles
- Priority handles to search from: ${goldenHandles.join(", ")}
- When searching for stock-related information, use Indonesian keywords when appropriate
- Combine multiple search terms using OR operators for broader results
- Use \`limit: 50-100\` for search results
- Do not include lang code in the query or tool search

## Domain Information

- Content is mostly in Indonesian language (Bahasa Indonesia), but sometimes in English
- Posts may contain stock tickers/symbols, company names, sector information
- Images/screenshots may contain important information like charts, financial data, etc.
- Topics include: stock analysis, market sentiment, corporate actions, ownership changes, expansion plans, foreign flows, "bandar" activity, etc.

## Output Format

Provide search results in a clear, structured format that includes:

1. **Relevant tweets/posts** with:
   - Author handle and name
   - Post date (YYYY-MM-DD)
   - Full post content (including any images description if available)
   - Tweet URL

2. **Key insights extracted** from the posts:
   - Stock tickers/symbols mentioned
   - Main topics discussed
   - Any actionable information or signals
   - Context around the discussion

3. **Source attribution** - clearly indicate which handles provided the information

Present the output in **English**, even if the original tweets are in Indonesian.

Group related tweets together by topic or stock ticker when possible.
`,
      },
      {
        role: "user",
        content: `Search for information about: ${queries}`,
      },
    ],
    tools: [searchTool as any],
  });

  if (response.status !== "completed") {
    logger.error(response, "response error");
    throw new Error("Twitter search didn't succeed");
  }

  logger.info({ queries: params.queries }, "Twitter search completed");

  return { result: response.output_text, raw: response };
};
