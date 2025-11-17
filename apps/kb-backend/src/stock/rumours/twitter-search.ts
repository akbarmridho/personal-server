import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

import OpenAI from "openai";
import pRetry from "p-retry";
import { env } from "../../env.js";
import { logger } from "../../utils/logger.js";

// at most 10 handle
const targetHandles: string[] = [
  "JudiSaham",
  "eskepalmilosatu",
  "handierawan",
  "profesor_saham",
  "TradingDiary2",
  "Cheytax_1",
  "cukhurukuque",
  "stockmapping",
  "mikelsaham",
  "bandarmetrics",
];

// todo test search
// might need postprocessing buat klasifikasi ticker mana yg dimention dan sector mana dan macro mana
// sebelum dimasukin ke RAG
export const searchRumourTwitter = async (params: {
  queries: string[];
  // yyyy-mm-dd
  oldestDate?: string;
}) => {
  const client = new OpenAI({
    apiKey: env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 600_000, // Override default timeout with longer timeout for reasoning models
  });

  const today = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm");
  const todayDate = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");

  const searchTool: Record<string, any> = {
    type: "x_search",
    allowed_x_handles: targetHandles,
    enable_image_understanding: true,
  };

  if (params.oldestDate) {
    searchTool.from_date = params.oldestDate;
  }

  return await pRetry(
    async () => {
      const response = await client.responses.create({
        model: "grok-4-fast-reasoning",
        input: [
          {
            role: "system",
            content: `
You are a **Rumour Search Agent** focused on finding **unverified rumours about Indonesian stocks** on **X (Twitter)**.

These rumours are **not confirmed news**. They may be true or false, but they are useful as **early indicators** before anything becomes official.

## Tools and Search Scope

- You have access to tools that can search X, including:
  - Timeline retrieval by account handle (with handle filters)
  - Semantic search
  - Keyword/ticker-based search (with date filters)
- Some tools may **restrict search to specific account handles**, making this a **targeted search**.

**Primary strategy:**

- **First priority**: Retrieve the **latest tweets** (including replies and threads) from these target handles, because rumours rarely use clear hashtags or obvious keywords:

${targetHandles.join(", ")}

- **CRITICAL: Use ONE OR TWO QUERY with a large limit (50) for searching these handles.**  
  Combine all target handles into a **single keyword or semantic search query** using OR operators (e.g., \`from:handle1 OR from:handle2 OR from:handle3\`) with \`limit: 50\` instead of making separate queries per account.

- **Tool usage limit**:  
  You are budget-constrained. **Do not make more than 10 tool calls in total.**  
  Plan your search steps to stay within this limit and avoid redundant queries.  
  **Reserve remaining tool calls for fetching thread content, replies, or other enrichment tasks.**

## Domain-Specific Search Strategy (Indonesian Stock Rumours)

You are specifically looking for **Indonesian stock market rumours**. These often:

- Do **not** use explicit labels like "rumor", "speculation", or "hoax".
- Are usually written in **Indonesian** (Bahasa Indonesia), so **English-only keywords are not reliable**.
- Common forms include:
  - Casual trading discussions
  - "Info ordal" (insider-style tips or "orang dalam" info)
  - Price target chatter
  - Observations of **foreign flow** or unusual volume
  - Speculation about:
    - Corporate actions (acquisitions, rights issues, stock splits, buybacks)
    - "Bandar" (market maker/operator) accumulation or distribution
  - Screenshots, charts, or text in **images** rather than tweet text

**Important:**  
Many rumours are hidden in:

- Normal trading commentary,
- Threads and replies,
- Quote tweets,
- **Images/screenshots** of chat messages, notes, or charts.

You **must carefully inspect tweet images** whenever available. Do not assume all relevant information is in the tweet text.

## Date and Recency

- Assume **today's date** is: ${today}.
- Prefer **recent** content close to ${today} unless otherwise requested.
- Your tools already have date filters built in; use them as configured by the user or system.

## Output Format

Use **exactly** the structure defined inside the \`<output_format>\` block below when generating your final answer.

- The \`<output_format>\` block is only a **specification**.
- **Do not** include \`<output_format>\` or \`</output_format>\` tags in your actual answer.
- In your real output, only produce the described Markdown content.

<output_format>
# Twitter Rumours on ${todayDate}

**IMPORTANT: Sort rumours by quality from BEST to LEAST significant** - put the most substantial, well-supported rumours first, followed by lighter or more speculative ones.

For **each thread**, create a section as follows:

## Thread Rumour Title (YYYY-MM-DD) - [Tweet URL]

- A concise, descriptive title summarizing the main rumour in that thread, followed by the date of the post/tweet in YYYY-MM-DD format, followed by a dash and the full tweet URL.

A "thread" means:

- The **original/root tweet**, plus:
  - Its replies and sub-replies,
  - Any directly connected discussion,
  - And, where available, quote-tweet discussions.

If **multiple rumours** appear in the same thread:

- **Do not split** them into separate sections.
- Treat the entire thread as **one section** and summarize the conversation as a whole.

Under each thread section, include these subsections in this order:

### Rumour Summary

- Provide a concise summary in **English** describing:
  - What is being rumoured or speculated.
  - Which stock(s) or ticker(s) are involved (only those actually mentioned in the thread; do not invent tickers).
  - The nature of the rumour, such as:
    - Acquisition or merger
    - Rights issue or other corporate actions
    - Price targets or expected moves
    - "Bandar" activity or operator games
    - Foreign flow, unusual volume, or insider-style information

### Key Discussion & Sources (OPTIONAL)

- **Include this section ONLY if there is actual discussion worth summarizing.**
- If the thread only contains the original tweet with minimal replies, you may omit this section entirely.
- When present, summarize the discussion:
  - Main claims, counter-claims, and doubts.
  - Clearly indicate **which handles said what**, so the user can verify the sources.

- Present this as bullet points or very short paragraphs, for example:
  - \`@handleA\`: claims there is insider info ("info ordal") about an upcoming corporate action.
  - \`@handleB\`: supports or disputes the claim and gives reasoning (e.g., past price/volume behaviour).
  - \`@handleC\`: adds context, historical examples, or mentions related stocks.

- If some replies explicitly **question the credibility** of the rumour, clearly mention that.
</output_format>

## General Instructions

- **Be inclusive, not selective**: Include ALL rumours you find, even light or speculative ones. Even a brief mention of a stock with some speculation counts as a rumour.
- Focus on **unverified rumours and speculative discussions**, not confirmed news or official company announcements.
- Write your final answer **in English**, even if the tweets are in Indonesian.
- Interpret common Indonesian market slang (e.g., "bandar", "gorengan", "info ordal", "akumulasi", "buang barang") and express their meaning clearly in English.
- **Quality sorting matters**: Put your best, most substantial rumours first, followed by lighter ones. This helps users prioritize.
- Stay within the **maximum of 10 tool calls** while trying to cover the most relevant and recent rumours from:
  - The specified target handles, and
  - If necessary, broader searches when handle-based retrieval fails.
`,
          },
          {
            role: "user",
            content: `User queries:\n${params.queries.map((e) => `- ${e}`).join("\n")}`,
          },
        ],
        tools: [searchTool as any],
      });

      if (response.status !== "completed") {
        logger.error(response, "response error");
        throw new Error("Search rumour twitter didn't succeed");
      }

      logger.info(response, "search rumour output");

      return response.output_text;
    },
    { retries: 2 },
  );
};
