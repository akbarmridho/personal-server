import { openrouter } from "@openrouter/ai-sdk-provider";
import { logger } from "@personal-server/common/utils/logger";
import { generateObject } from "ai";
import pRetry from "p-retry";
import z from "zod";
import { getRawCompanies } from "../stock/aggregator/companies.js";

const delistedTickers = [
  "APOL",
  "ATPK",
  "BAEK",
  "BBNP",
  "BORN",
  "BRAU",
  "CKRA",
  "CPGT",
  "CTRP",
  "CTRS",
  "DAJK",
  "DAVO",
  "FINN",
  "GMCW",
  "GREN",
  "INVS",
  "ITTG",
  "JPRS",
  "LAMI",
  "NAGA",
  "RMBA",
  "SCBD",
  "SIAP",
  "SOBI",
  "SQBB",
  "TKGA",
  "TMPI",
  "TRUB",
  "TURI",
  "UNTX",
];

export const News = z.object({
  title: z.string().describe("News headline"),
  content: z.string().describe("Full news content in plain text"),
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
  const validTickers = [
    ...companies.map((c) => c.ticker),
    ...delistedTickers,
  ].join(", ");

  let lastError: string | null = null;
  let lastResult: z.infer<typeof Newsletter> | null = null;

  const result = await pRetry(
    async (retryCount) => {
      const systemPrompt = `Extract financial news from Indonesian newsletter. Group related content into news objects based on document structure.

## Rules

1. Group by structure: Use bullets, headings, and paragraphs to identify separate news items
2. Related sub-bullets belong to parent bullet (merge into one news object)
3. Extract ALL news items (never skip)
4. Ticker = \`$CODE\` or uppercase 3-5 letters (BBCA, ASII)
5. Has ticker → tickerNews, no ticker → marketNews
6. SKIP daily IHSG percentage movement news (e.g., "IHSG declines 0.78%", "IHSG rises 1.2%")
7. ONLY Indonesian tickers in primaryTickers/mentionedTickers (must be in valid list). Skip foreign tickers (e.g., US, China stocks)

## Fields

- title: Short headline with ticker if applicable
- content: Full text in English, no markdown, translate Indonesian
- urls: Extract from [text](url), exclude emailer.stockbit.com and images
- primaryTickers: Main Indonesian tickers only (must be in valid list)
- mentionedTickers: Other Indonesian tickers only (must be in valid list)

## Examples

Input: \`• $BBCA: Bank Central Asia laba Rp15T\`
Output:
\`\`\`json
{
  "title": "BBCA net profit IDR 15 trillion",
  "content": "Bank Central Asia (BBCA) recorded net profit of IDR 15 trillion.",
  "urls": [],
  "primaryTickers": ["BBCA"],
  "mentionedTickers": []
}
\`\`\`

Input: \`• Bank Indonesia cut rates 25bps\`
Output:
\`\`\`json
{
  "title": "Bank Indonesia cuts rates 25bps",
  "content": "Bank Indonesia cut interest rates by 25 basis points.",
  "urls": [],
  "primaryTickers": [],
  "mentionedTickers": []
}
\`\`\`

Valid tickers: ${validTickers}`;

      let finalContent = content;

      if (lastError) {
        finalContent += `\n\nPrevious error: ${lastError}`;
      }

      if (lastResult) {
        finalContent += `\n\nPrevious result had invalid tickers. Please correct them.`;
      }

      const { object } = await generateObject({
        model: openrouter("openai/gpt-oss-120b", {
          models: ["qwen/qwen3-30b-a3b-instruct-2507"],
        }),
        system: systemPrompt,
        prompt: finalContent,
        schema: Newsletter,
        temperature: 0.1,
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
        if (retryCount >= 3) {
          // Return output on final retry
        } else {
          lastError = `Invalid tickers found: ${invalidTickers.join(", ")}`;
          lastResult = object;
          logger.error(`[Retry ${retryCount}] ${lastError}`);
          throw new Error(lastError);
        }
      }

      // Detect merged ticker news
      const totalNews = object.marketNews.length + object.tickerNews.length;
      const hasManyMentioned = [
        ...object.marketNews,
        ...object.tickerNews,
      ].some((n) => n.mentionedTickers.length > 4);

      if (totalNews < 3 && hasManyMentioned) {
        if (retryCount >= 3) {
          // Return output on final retry
        } else {
          lastError = `Detected merged ticker news with multiple tickers. Split each ticker into separate news objects.`;
          lastResult = null; // Don't include previous output
          logger.error(`[Retry ${retryCount}] ${lastError}`);
          throw new Error(lastError);
        }
      }

      // Post-process: Clean URLs
      const cleanUrl = (url: string) => {
        try {
          const parsed = new URL(url);
          parsed.hash = ""; // Remove text fragments (#:~:text=...)
          return parsed.toString();
        } catch {
          return ""; // Invalid URL
        }
      };

      object.marketNews.forEach((n) => {
        n.urls = n.urls.map(cleanUrl).filter((u) => u);
      });
      object.tickerNews.forEach((n) => {
        n.urls = n.urls.map(cleanUrl).filter((u) => u);
      });

      return object;
    },
    { retries: 3 },
  );

  return result;
};
