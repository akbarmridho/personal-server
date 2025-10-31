import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import pRetry from "p-retry";
import z from "zod";
import { getRawCompanies } from "../stock/aggregator/companies.js";

export const News = z.object({
  title: z.string().describe("News headline"),
  content: z.string().describe("Full news content in markdown"),
  urls: z
    .string()
    .array()
    .describe(
      "News source URLs (news outlets, PDFs, official reports only - exclude internal links and images)",
    ),
  primaryTickers: z
    .string()
    .array()
    .describe("Main ticker subjects (e.g., ['BMRI'])"),
  mentionedTickers: z
    .string()
    .array()
    .describe("Secondary ticker mentions (e.g., ['BBCA'])"),
});

export const Newsletter = z.object({
  publishDate: z.string().describe("Publication date in YYYY-MM-DD format"),
  marketNews: News.array().describe(
    "Macro/sector news (IHSG, foreign flow, MSCI changes)",
  ),
  tickerNews: News.array().describe(
    "News focused on specific company tickers (identified by $TICKER or 4-letter uppercase codes)",
  ),
});

export const processNewsletter = async (content: string) => {
  const companies = await getRawCompanies();
  const validTickers = companies.map((c) => c.ticker).join(", ");

  let lastError: string | null = null;
  let lastResult: z.infer<typeof Newsletter> | null = null;

  const result = await pRetry(
    async () => {
      const systemPrompt = `
You are a strict financial-news JSON extractor.
Input = markdown text with multiple bullet items (\`•\`).
Output = **one JSON object** for the entire input with this exact schema:

\`\`\`json
{
  "publishDate": "YYYY-MM-DD",
  "marketNews": [],
  "tickerNews": []
}
\`\`\`

Each bullet (\`•\`) represents **one independent news item** to be placed in either \`marketNews\` or \`tickerNews\`.
**Never merge or omit bullets.**

---

### **1. Classification Rules (deterministic)**

1. **Ticker classification (requires explicit ticker):**

   * Classify as \`tickerNews\` **only if** the bullet contains **at least one explicit ticker token**, detected as:

     * \`$TICKER\` format (e.g. \`$ASSA\`), **or**
     * 3–5 character uppercase stock codes (e.g. \`ASSA\`, \`PTBA\`, \`ADMR\`) appearing as standalone words.
   * Extract those tickers as \`primaryTickers\`.
     Other uppercase codes mentioned → \`mentionedTickers\`.
   * If company names appear **without explicit ticker tokens**, classify as \`marketNews\`.

2. **Market classification:**

   * Use \`marketNews\` for macro, regulatory, policy, index, interest rate, GDP, commodity, sector, or general economy news.
   * Also use \`marketNews\` if **no explicit ticker token** is detected.

3. **Mixed content:**

   * If both macro context and explicit ticker(s) exist → classify as \`tickerNews\` (ticker takes precedence).

---

### **2. JSON Object Format (per bullet)**

#### For ticker news

\`\`\`json
{
  "title": "short descriptive headline",
  "content": "plain text only, full news text",
  "urls": ["https://..."],
  "primaryTickers": ["TICKER"],
  "mentionedTickers": ["TICKER"]
}
\`\`\`

#### For market news

\`\`\`json
{
  "title": "short descriptive headline",
  "content": "plain text only, full news text",
  "urls": ["https://..."],
  "primaryTickers": [],
  "mentionedTickers": []
}
\`\`\`

---

### **3. Content Cleaning (strict)**

* \`content\` must be **complete plain text** — no markdown, links, or images.

  * \`[Text](url)\` → keep only \`"Text"\`; put URL in \`urls\`.
  * Remove \`![](image)\` and any image references entirely.
  * Strip all markdown syntax (\`#\`, \`>\`, \`*\`, backticks, lists, etc.).
* Extract all valid URLs into \`urls\`, excluding:

  * Tracking links (e.g. \`emailer.stockbit.com\`)
  * Image links (\`.jpg\`, \`.png\`, \`.gif\`, \`.webp\`)
* **Translation rules:**

  * Translate to English if source is non-English.
  * **Preserve proper nouns:** Keep organization names, government agencies, and official entities in their original language.
  * For well-known entities, provide both: \`"Original Name (English Translation)"\` on first mention.
  * Examples:
    * \`"Badan Gizi Nasional (BGN)"\` → keep as is or \`"Badan Gizi Nasional (BGN, National Nutrition Agency)"
    * \`"Bank Indonesia"\` → keep as is (widely recognized)
    * \`"Otoritas Jasa Keuangan (OJK)"\` → \`"Otoritas Jasa Keuangan (OJK, Financial Services Authority)"
* Never summarize, truncate, or use placeholders (e.g., \`<full text>\`).

---

### **4. Output Formatting**

* \`publishDate\` (top level): \`"YYYY-MM-DD"\`
* Output must be **valid JSON only** — no commentary or markdown.
* All fields must exist exactly as shown; arrays may be empty.

---

### **5. Quick Heuristics**

* Contains \`$TICKER\` or uppercase 3–5 code → \`tickerNews\`.
* Else → \`marketNews\`.
* Both macro + ticker → \`tickerNews\`.
* Don’t infer tickers from names.

---

### ✅ **Example 1 — Ticker News**

Input bullet:

\`\`\`
• ADRO to pay interim dividend of IDR 100 per share for FY2025.
\`\`\`

Output JSON fragment:

\`\`\`json
{
  "publishDate": "2025-10-20",
  "marketNews": [],
  "tickerNews": [
    {
      "title": "ADRO announces interim dividend of IDR 100 per share",
      "content": "Adaro Energy (ADRO) announced an interim dividend of IDR 100 per share for fiscal year 2025.",
      "urls": [],
      "primaryTickers": ["ADRO"],
      "mentionedTickers": []
    }
  ]
}
\`\`\`

---

### ✅ **Example 2 — Market News**

Input bullet:

\`\`\`
• Bank Indonesia expected to cut BI Rate by 25bps to 4.5% this week.
\`\`\`

Output JSON fragment:

\`\`\`json
{
  "publishDate": "2025-10-20",
  "marketNews": [
    {
      "title": "Economists expect BI Rate cut to 4.5%",
      "content": "Bank Indonesia is expected to lower the BI Rate by 25 basis points to 4.5% this week according to economists' consensus.",
      "urls": [],
      "primaryTickers": [],
      "mentionedTickers": []
    }
  ],
  "tickerNews": []
}
\`\`\`

## Valid Tickers

${validTickers}
`;

      let finalContent = content;

      if (lastError) {
        finalContent += `\n\nPrevious error: ${lastError}`;
      }

      if (lastResult) {
        finalContent += `\n\nPrevious result had invalid tickers. Please correct them.`;
      }

      const { object } = await generateObject({
        model: openrouter("openai/gpt-oss-120b", {
          reasoning: {
            effort: "medium",
          },
        }),
        system: systemPrompt,
        prompt: finalContent,
        schema: Newsletter,
      });

      const allTickers = [
        ...object.marketNews.flatMap((n) => [
          ...n.primaryTickers,
          ...n.mentionedTickers,
        ]),
        ...object.tickerNews.flatMap((n) => [
          ...n.primaryTickers,
          ...n.mentionedTickers,
        ]),
      ];

      const validTickerSet = new Set(companies.map((c) => c.ticker));
      const invalidTickers = allTickers.filter((t) => !validTickerSet.has(t));

      if (invalidTickers.length > 0) {
        lastError = `Invalid tickers found: ${invalidTickers.join(", ")}`;
        lastResult = object;
        throw new Error(lastError);
      }

      return object;
    },
    { retries: 3 },
  );

  return result;
};
