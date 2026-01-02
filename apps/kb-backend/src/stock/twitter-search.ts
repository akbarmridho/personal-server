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
  prioritizeGoldenHandles?: boolean;
}

export const searchTwitter = async (params: TwitterSearchParams) => {
  const client = new OpenAI({
    apiKey: env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 600_000,
  });

  const todayDate = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");
  const daysOld = params.daysOld ?? 14; // Default 2 weeks - more relevant for markets
  const prioritizeGoldenHandles = params.prioritizeGoldenHandles ?? true;

  const searchTool: Record<string, any> = {
    type: "x_search",
    enable_image_understanding: true,
    from_date: dayjs()
      .tz("Asia/Jakarta")
      .subtract(daysOld, "day")
      .format("YYYY-MM-DD"),
  };

  // Format queries clearly for the prompt
  const formattedQueries = params.queries
    .map((q, i) => `${i + 1}. "${q}"`)
    .join("\n");

  const response = await client.responses.create({
    model: "grok-4-1-fast-reasoning",
    input: [
      {
        role: "system",
        content: `
You are a **Twitter Search Agent** for Indonesian stock market research. You serve as a tool for an LLM assistant that needs to find relevant social media discussions.

Today's date: ${todayDate}
Search window: Last ${daysOld} days

## Your Task

Search X (Twitter) for the requested queries and return **structured, relevant results** that the parent LLM can use for investment research.

## Search Strategy

1. **Process each query** - treat them as separate search intents, don't combine unrelated queries
2. **Search approach per query**:
   - For ticker/stock queries (e.g., "BBRI", "$ANTM"): Search for that ticker specifically
   - For sector/theme queries (e.g., "coal stocks", "banking sector"): Use semantic search
   - For general market queries: Broader keyword search
${
  prioritizeGoldenHandles
    ? `3. **Prioritize trusted handles**: When possible, weight results from these accounts higher: ${goldenHandles.join(", ")}
   - These are known quality sources for Indonesian stock market discussion
   - But don't exclude other sources if they have relevant information`
    : ""
}

## Search Parameters

- Use \`limit: 50-100\` per search
- Use Indonesian keywords when searching for Indonesian market topics
- Do not include lang code in queries
- Fetch full threads when a post has substantive replies

## Quality Filter

**Include** results that:
- Directly address the query topic
- Contain specific information (not just generic market commentary)
- Have some engagement (likes/replies) OR come from trusted handles
- Provide actionable insights, data, or analysis

**Exclude** results that:
- Are tangentially related but don't answer the query
- Are very low engagement AND low information content
- Are pure memes or off-topic

## Output Format

Return results in this **exact structure** for each query:

---

### Query: "[original query text]"

**Results Found**: [number] relevant posts
**Search Method**: [keyword/semantic/handle-specific]

#### Top Results

For each relevant post (max 10 per query, ranked by relevance):

**[N]. @handle — YYYY-MM-DD** ([link](tweet_url))

> [Full tweet text, translated to English if in Indonesian]

- **Ticker(s)**: $XXXX, $YYYY (or "None" if no specific ticker)
- **Key Info**: [1-2 sentence summary of why this is relevant to the query]
- **Image Content**: [If post has images, describe what they show: chart, screener data, etc., or "None"]

---

#### Summary for "[query]"

- **Main Takeaway**: [2-3 sentences synthesizing what the search results say about this query]
- **Consensus/Disagreement**: [Do sources agree? Any conflicting views?]
- **Data Quality**: [High/Medium/Low] — [brief note on how reliable the sources are]

---

## Important Guidelines

1. **Be selective but not too restrictive** - aim for 5-10 quality results per query, not 1-2 or 50
2. **Preserve specifics** - if someone mentions a price target, date, or specific event, include it exactly
3. **Attribute clearly** - the parent LLM needs to know WHO said WHAT
4. **Translate to English** - but keep ticker symbols and proper nouns as-is
5. **If no relevant results found** - say so clearly, don't make up content
`,
      },
      {
        role: "user",
        content: `Search Twitter for information about the following:

${formattedQueries}

Return structured results for each query.`,
      },
    ],
    tools: [searchTool as any],
  });

  if (response.status !== "completed") {
    logger.error(response, "response error");
    throw new Error("Twitter search didn't succeed");
  }

  logger.info(
    { queries: params.queries, resultLength: response.output_text.length },
    "Twitter search completed",
  );

  return { result: response.output_text, raw: response };
};
