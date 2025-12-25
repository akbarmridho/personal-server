import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

import OpenAI from "openai";
import { env } from "../../infrastructure/env.js";
import { logger } from "../../utils/logger.js";

const handles = [
  "ApestorNyangkut",
  // "JudiSaham",
  "rakyatkapitalis",
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
];

export const searchRumourTargetted = async (params: { daysOld?: number }) => {
  const client = new OpenAI({
    apiKey: env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 600_000, // Override default timeout with longer timeout for reasoning models
  });

  const todayDate = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");

  const searchTool: Record<string, any> = {
    type: "x_search",
    // allowed_x_handles: handles,
    enable_image_understanding: true,
  };

  if (params.daysOld) {
    searchTool.from_date = dayjs()
      .tz("Asia/Jakarta")
      .subtract(params.daysOld, "day")
      .format("YYYY-MM-DD");
  }

  // need to change todayDate if newest date is filtered
  // if (params.newestDate) {
  //   searchTool.to_date = params.newestDate;
  // }

  const response = await client.responses.create({
    model: "grok-4-1-fast-reasoning",
    input: [
      {
        role: "system",
        content: `
You are a **Social Media Search Agent** focused on finding **informations, discussions, and rumours about Indonesia Stock Market** on **X (Twitter)**.
You are helping me gathering news for my "narrative play" investing style.

I want you to present any early leads, post discussion, or even rumours. These information doesn't have to contain the stock ticker/symbol or the stock name. This can also
in form of sector research or anything stock-related in general. Include discussion about "unknown" or "unmentioned" stock as well.

I want to know what are the targetted accounts mentioned below are discussing as these are key information for my investment information gathering.

Today date is: ${todayDate}.

## Search Strategy

- Focus on these handles: ${handles.join(", ")}
- Retrieve the **latest post** (including replies and threads) from these target handles with 100-200 limit.
- When you find an interesting post, perform full thread fetch on that post.
- Try to use other tools, like keyword or semantic search to explore more if existing result is insufficient. When use this approach, combine all target handles into a **single keyword or semantic search query** using OR operators (e.g., \`${handles.map((e) => `from:${e}`).join(" OR ")}\`) with \`limit: 100\` instead of making separate queries per account.
- Do not include lang code in the query or tool search.
- Use Indonesian keywords for search.

## Domain Information

- These information rarely label it explicitly as "rumour", "speculation", etc, but as a regular post discussion.
- Mostly written in Indonesia language (Bahasa Indonesia), but sometimes in English.
- Sometimes just a screenshoot of stock screener or chart drawing for technical analysis.
- Sometimes discuss about ownership changes, expansion plan, future prospects, foreign flows, "bandar", corporate actions, etc.
- Sometimes images/screenshots contains important information, so carefully inspect post images whenever available.

## Output Format

Use **exactly** the structure defined inside the \`<output_format>\` block below when generating your final answer.

- The \`<output_format>\` block is only a **specification**.
- **Do not** include \`<output_format>\` or \`</output_format>\` tags in your actual answer.
- In your real output, only produce the described Markdown content.
- Write your final answer **in English**, even if the tweets are in Indonesian.
- Sort rumours by quality from BEST to LEAST significant** - put the most substantial, well-supported rumours first, followed by lighter or more speculative ones.

<output_format>
For **each thread**, create a section as follows:

## Thread Rumour Title [YYYY-MM-DD](Tweet URL)

- A concise, descriptive title summarizing the main rumour in that thread, followed by markdown link with the text is the date of the post/tweet in YYYY-MM-DD format, and the link is full tweet URL.

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
  `,
      },
      {
        role: "user",
        content: `Perform research`,
      },
    ],
    tools: [searchTool as any],
  });

  if (response.status !== "completed") {
    logger.error(response, "response error");
    throw new Error("Search rumour twitter didn't succeed");
  }

  logger.info(response, "search rumour output");

  return { result: response.output_text, raw: response };
};
