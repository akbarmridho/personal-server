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
  "FREN",
  "MFIN",
];

export const News = z.object({
  title: z
    .string()
    .describe(
      "Exact English translation of the section or article headline. Must correspond to one identifiable section in the newsletter.",
    ),
  content: z
    .string()
    .describe(
      "Full translated text of the section, preserving all original facts, figures, and chronology. Do not summarize, paraphrase, or shorten.",
    ),
  urls: z
    .array(z.string())
    .describe(
      "List of valid external URLs (IDX, news media, PDFs, KSEI, etc.). Exclude internal or tracking links.",
    ),
  primaryTickers: z
    .array(z.string())
    .describe(
      "Main Indonesian stock tickers that are the primary focus of the news item. Use [] if none.",
    ),
  mentionedTickers: z
    .array(z.string())
    .describe(
      "Secondary Indonesian tickers mentioned in the content. Use [] if none.",
    ),
});

export const Newsletter = z.object({
  publishDate: z
    .string()
    .describe(
      "Publication date in YYYY-MM-DD format (e.g., '2023-12-28'). Extract directly from the newsletter.",
    ),
  marketNews: z
    .array(News)
    .describe(
      "Each item represents a full macroeconomic, policy, or sectoral section (e.g., 'Snips Recap 2023'). Content must preserve all details within that section.",
    ),
  tickerNews: z
    .array(News)
    .describe(
      "Each item corresponds to a company-specific section or paragraph containing ticker mentions. Preserve full detail.",
    ),
});

export const processNewsletter = async (filename: string, content: string) => {
  const companies = await getRawCompanies();
  const validTickers = [
    ...companies.map((c) => `${c.ticker} (${c.companyName})`),
    ...delistedTickers,
  ].join(", ");

  let lastError: string | null = null;
  let lastResult: z.infer<typeof Newsletter> | null = null;

  const result = await pRetry(
    async (retryCount) => {
      const systemPrompt = `Extract and structure financial news from an Indonesian daily newsletter into a **fully faithful, machine-readable translation in english**.  
Do **not summarize, paraphrase, merge, or omit** any facts, figures, or sentences.  
Your goal is to preserve all original information and structure it cleanly into JSON.

---

## OUTPUT STRUCTURE

Return a JSON object with this schema:

Newsletter = {
  publishDate: string (YYYY-MM-DD),
  marketNews: News[],     // macroeconomic, policy, or sectoral updates (grouped by newsletter sections)
  tickerNews: News[]      // company-specific news with $TICKER or uppercase 3–5 letter codes
}

News = {
  title: string,                 // section or article title from the newsletter
  content: string,               // full English translation of the entire section's text, preserving every detail
  urls: string[],                // valid external URLs only
  primaryTickers: string[],      // Indonesian tickers that are the main subject
  mentionedTickers: string[]     // other Indonesian tickers mentioned secondarily
}

---

## EXTRACTION RULES

### 1️. Structure and granularity

- Treat **each visible section or subheading** in the newsletter as one \`News\` object.
- For example, “▶️ Snips Recap 2023: Normalisasi Harga Komoditas dan Inflasi” becomes a single \`marketNews\` item, and its content includes everything until the next major section heading.
- Do **not merge** multiple sections or paragraphs into one \`News\` entry.
- Preserve **all chronological bullet points, statistics, and month-by-month data** within that section.

### 2️. Ticker separation

- Any paragraph or bullet that includes \`$CODE\` or a 3–5-letter uppercase ticker (e.g., ASII, BBCA) → goes into \`tickerNews\`.
- Combine sub-bullets about the same ticker into one item only if they belong to the same newsletter section.
- Each ticker gets its own distinct news object.

### 3️. Inclusion

- Skip daily IHSG movement lines (e.g., “IHSG +0.5% today”) unless part of a larger section recap.
- Include **all** macro, policy, or corporate events with full detail.
- Include only **Indonesian tickers** in primary/mentionedTickers (exclude foreign tickers).
- Only include tickers that exist in the valid tickers list provided. If a ticker is not in the list, do not include it in primaryTickers or mentionedTickers.

### 4️. Content formatting

- Translate Indonesian text to clear English while keeping all quantitative and contextual details.
- Do not compress or shorten content.
- Preserve all lists, figures, and chronology.
- Write as plain text only: no markdown formatting (no underscores, asterisks for bold/italic, or inline links).
- URLs belong in the urls property, not in content text.

### 5️. Titles

- For market news: use the section headline.
- For ticker news: use a factual headline derived from the paragraph.

### 6️. URLs

- Collect only valid external URLs (IDX, KSEI, news sites).
- Remove duplicates and internal links (e.g., emailer.stockbit.com).

---

## STYLE GUIDELINES

- Use neutral, factual tone.
- Preserve chronological and structural fidelity.
- Output should have approximately the **same length** as the original newsletter text.
- The result is a **faithful translation + structural mapping**, not a summary.

Valid tickers: ${validTickers}
`;

      let finalContent = content;

      if (lastError) {
        finalContent += `\n\nPrevious error: ${lastError}`;
      }

      if (lastResult) {
        finalContent += `\n\nPrevious result had invalid tickers. Please correct them.`;
      }

      const { object } = await generateObject({
        model: openrouter(
          "google/gemini-2.5-flash-lite-preview-09-2025",
          // "openai/gpt-5-nano",
          // "openai/gpt-oss-120b",
          // "qwen/qwen3-235b-a22b-2507",
          {
            models: ["google/gemini-2.5-flash-lite"],

            // provider: {
            //   ignore: ["novita"],
            //   quantizations: ["bf16", "fp16", "fp8", "int8"],
            // },
          },
        ),
        system: systemPrompt,
        prompt: `Filename (contains email date): ${filename}\n\nContent:${finalContent}`,
        schema: Newsletter,
        temperature: 1,
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

      const validTickerSet = new Set([
        ...companies.map((c) => c.ticker),
        ...delistedTickers,
      ]);
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

      // Post-process: Deduplicate tickers and remove primary from mentioned
      [...object.marketNews, ...object.tickerNews].forEach((n) => {
        n.primaryTickers = [...new Set(n.primaryTickers)];
        const primarySet = new Set(n.primaryTickers);
        n.mentionedTickers = [
          ...new Set(n.mentionedTickers.filter((t) => !primarySet.has(t))),
        ];
      });

      return object;
    },
    { retries: 3 },
  );

  return result;
};
