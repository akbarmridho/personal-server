import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import normalizeUrl from "normalize-url";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

const summarizePdf = async (url: string) => {
  const response = await generateText({
    model: openrouter("google/gemini-3-flash-preview", {
      models: ["openai/gpt-5-mini"],
    }),
    prompt: [
      {
        role: "system",
        content: `You are a Senior Investment Analyst at a top-tier Hedge Fund. Your mandate is to synthesize the provided equity research report into a high-conviction **Deal Memo** for our internal research archive.

**Your Goal:** Extract the "Signal" from the noise. We need the **Hard Numbers** (Valuation Inputs, Forecasts, Peer Relative Value) backed by the **"Vibe"** (The narrative, specific government catalysts, market sentiment).

**Crucial Style & Formatting Rules:**
1.  **Voice:** Write with energy and conviction. Use active verbs.
    * *Bad:* "It is anticipated that margins may improve."
    * *Good:* "Margins are set to expand to **25%** as the new facility comes online."
2.  **Narrative Flow:** Do **NOT** use tables in the Thesis, Operations, or Vibe sections. Tables kill the narrative flow. Weave data directly into your sentences and **bold** the key metrics.
3.  **Data Filtering:** **IGNORE** transient noise (daily volume, standard disclaimer text). **KEEP** the Analyst's Target Price, Rating, Forward-Looking Estimates, and Valuation Assumptions (WACC, Growth Rates).
4.  **Structural Freedom:** If you find high-value information that fits better in a unique category (e.g., "Management Profile," "Political Connections," "Litigation Update"), **create a new Markdown section (##) for it.**

**Target Sections (Include ONLY if Data is Present):**

## 1. Valuation Snapshot
*(Requirement: A clean Markdown table with: Target Price, Current Price, Implied Upside, Rating, Valuation Method (e.g., DCF, Blended), and Key Inputs (WACC, Terminal Growth, Beta). Follow this with a brief sentence on Peer Comparison/Relative Valuation if available).*

## 2. The Core Thesis (The "Why Now?")
*(Requirement: A punchy 2-3 sentence hook. If this is an **Initiation**, focus on the structural long-term story. If an **Update**, focus on the recent performance delta and outlook change. Why is this stock interesting *today*?)*

## 3. Operational Catalysts & Deep Dive
*(Requirement: Specific operational details—production targets, utilization rates, contract wins, capacity expansion. Use narrative bullet points with bolded numbers).*

## 4. The "Vibe" & Structural Drivers
*(Requirement: Non-traditional drivers. Government programs (e.g., MBG, Danantara), regulatory shifts, ESG angles, or specific management/board backgrounds).*

## [INSERT CUSTOM SECTIONS HERE IF NEEDED]
*(Instruction: If the document contains critical info that doesn't fit above—like a deep dive on a new CEO or a specific legal issue—create a custom header here).*

## 5. Financial Forecast (The Model)
*(Requirement: Reconstruct the Analyst's Forecast for the next 3 fiscal years in a Markdown table. Rows: Revenue, EBITDA, Net Income, EPS, ROE, NPM).*

## 6. Risks to the Thesis
*(Requirement: Specific threats to the story. Execution risk, commodity price sensitivity, regulatory changes, or client concentration).*`,
      },
      {
        role: "user",
        content: [
          {
            type: "file",
            data: new URL(url),
            mediaType: "application/pdf",
          },
        ],
      },
    ],
    maxRetries: 3,
  });

  if (!response.text) {
    throw new Error("Empty text");
  }

  return response.text;
};

const namespace = "48649116-a628-435a-ba35-523582c862ae";

export const kiwoomEquityReportIngest = inngest.createFunction(
  { id: "kiwoom-equity-report-ingest", concurrency: 1 },
  { event: "data/kiwoom-equity-report-ingest" },
  async ({ event, step }) => {
    const summary = await step.run("extract", async () => {
      return await summarizePdf(event.data.pdfUrl);
    });

    const payload: InvestmentDocument = await step.run(
      "prepare-payload",
      async () => {
        const symbols = (
          await extractSymbolFromTexts([`${event.data.title}\n${summary}`])
        )[0];

        const tagged = (
          await tagMetadata([
            {
              date: event.data.date,
              content: summary,
              title: event.data.title,
              urls: [],
              subindustries: [],
              subsectors: [],
              symbols: symbols,
              indices: [],
            },
          ])
        )[0];

        const normalizedUrl = normalizeUrl(event.data.pdfUrl);

        return {
          id: uuidv5(`${event.data.id}`, namespace),
          type: "analysis" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source: {
            name: "kiwoom-equity-report",
            url: normalizedUrl,
          },
          urls: [] as string[],
          symbols: tagged.symbols,
          subindustries: tagged.subindustries,
          subsectors: tagged.subsectors,
          indices: tagged.indices,
        };
      },
    );

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: [payload],
      });
    });

    await step.sendEvent("notify-discord", [
      {
        name: "notify/discord-kb-ingestion",
        data: { payload: [payload] },
      },
    ]);
  },
);
