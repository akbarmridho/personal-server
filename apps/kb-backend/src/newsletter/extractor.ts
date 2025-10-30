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
      let systemPrompt = "Extract and translate financial news content. Read each news chunk to classify as 'market' (macro/indices/foreign flow/regulatory) or 'ticker' (focused on specific companies). For ticker news, extract primaryTickers (main subjects) and mentionedTickers (secondary references) from ticker symbols ($TICKER or 4-letter uppercase). Include only source URLs (news outlets, PDFs, reports). Translate to English if needed. Extract publishDate in YYYY-MM-DD format.";

      systemPrompt += `\n\nValid tickers: ${validTickers}`;

      if (lastError) {
        systemPrompt += `\n\nPrevious error: ${lastError}`;
      }

      if (lastResult) {
        systemPrompt += `\n\nPrevious result had invalid tickers. Please correct them.`;
      }

      const { object } = await generateObject({
        model: openrouter("openai/gpt-oss-120b"),
        system: systemPrompt,
        prompt: content,
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
