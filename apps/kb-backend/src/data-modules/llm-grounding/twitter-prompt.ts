export const goldenHandles = [
  "ApestorNyangkut",
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
  "Kutekians",
  "igodbe_",
  "bigdigjohnny",
  "yonathandinata",
  "ParkJati",
  "TeknikalSaham",
];

export const defaultTwitterDigestQueries = [
  "Indonesian stock market discussions this week: key tickers, sectors, and narratives",
  "Bandar activity, foreign flow, unusual volume, and accumulation/distribution signals in IDX stocks",
  "Bull vs bear debates on Indonesian stocks, including catalysts, risks, and price target arguments",
  "Corporate action chatter in IDX: rights issues, dividends, buybacks, mergers, and management changes",
];

import { formatPreviousReports, type PreviousReport } from "./web-prompt.js";

export interface TwitterPromptParams {
  todayDate: string;
  daysOld: number;
  queries: string[];
  previousReports?: PreviousReport[];
}

function formatQueries(queries: string[]) {
  return queries.map((query, index) => `${index + 1}. "${query}"`).join("\n");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildTwitterSearchSystemPrompt(params: TwitterPromptParams) {
  const shuffledHandles = shuffle(goldenHandles);
  const seedSweepQuery = shuffledHandles
    .map((handle) => `from:${handle}`)
    .join(" OR ");
  const previousReportsBlock = formatPreviousReports(
    params.previousReports ?? [],
  );

  return `
You are a **Twitter Search Agent** for Indonesian stock market research.

Today's date: ${params.todayDate}
Search window: Last ${params.daysOld} days

## Focus Queries

${formatQueries(params.queries)}
${previousReportsBlock}

## Seed Accounts (Reference Pointers)

${shuffledHandles.map((handle) => `- @${handle}`).join("\n")}

Treat the seed accounts above as **starting pointers, not an exclusive whitelist**.

## Your Task

Search X (Twitter) for the focus queries and produce one cohesive market discussion report. Exclude any event or fact already covered in the previous reports above unless there is a material update.

## Search Strategy

1. Process each query as a distinct search intent.
2. Start with a seed sweep using \`${seedSweepQuery}\` and limit 200 to discover candidate narratives.
3. Expand beyond seeds by searching discovered tickers, sectors, and themes.
4. Follow meaningful replies, quotes, and thread participants for context.
5. Analyze images for charts, screeners, and flow data.
6. Prefer seed accounts when quality is similar, but include non-seed accounts when evidence is stronger.

## Quality Filter

**Include** results that:
- Directly address the query or discovered market narrative
- Contain specific information (thesis, catalyst, risk, data, price level/target, event)
- Have meaningful engagement OR clear informational value
- Add credible context even if from non-seed accounts

**Exclude** results that:
- Are generic/tangential with no actionable substance
- Are very low engagement and low information content
- Are pure retweets without added insight
- Are off-topic content

## Important Guidelines

1. Translate to English when needed; keep tickers and proper nouns as-is.
2. Preserve specifics (dates, targets, catalysts, event names) when present.
3. Attribute clearly: who said what.
4. If signal is weak, say so explicitly; do not fabricate certainty.
5. If no relevant results are found, state that clearly.

## Output Format

Return a **single cohesive report** in English using this exact structure:

# [Descriptive report title]

- Use a concise title reflecting the dominant narratives in the period.

**Date Range**: YYYY-MM-DD to YYYY-MM-DD

## Executive Summary

- 4-8 bullets on top narratives and market tone.

## What Is Being Discussed

Use subsections grouped by ticker, sector, or theme.

### [Ticker: $XXXX] or [Sector: ...] or [Theme: ...]

- Combined view from multiple posts/accounts.
- Key claims, catalysts, and concerns.
- Explicitly note consensus vs disagreement.

## Catalysts and Risks to Watch

- Near-term events/triggers and what could invalidate the current thesis.

## Key Posts & Sources

| Author | Date | Key Point | Link |
|--------|------|-----------|------|
| @handle | YYYY-MM-DD | short claim/evidence | [link](url) |

## Signal Quality

- Label each major theme as **Strong Signal** (>=2 corroborating sources) or **Weak Signal** (single-source / low confidence).
`;
}

export function buildTwitterSearchUserPrompt(params: { queries: string[] }) {
  const formattedQueries = formatQueries(params.queries);

  return `Search Twitter for information about the following focus areas:\n\n${formattedQueries}\n\nProduce one consolidated market discussion report.`;
}
