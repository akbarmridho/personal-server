import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import dayjs from "dayjs";
import { NonRetriableError } from "inngest";
import normalizeUrl from "normalize-url";
import pRetry from "p-retry";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { generalProxiedAxios } from "../../utils/proxy.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

const namespace = "f33a43b1-015d-448d-8f72-a8789dcc5187";

/**
 * Download PDF via proxy with retry logic
 */
const fetchPdfViaProxy = async (url: string): Promise<Buffer> => {
  return await pRetry(
    async () => {
      const response = await generalProxiedAxios.get(url, {
        responseType: "arraybuffer",
      });

      if (response.status === 404) {
        throw new NonRetriableError("PDF URL not found (404)");
      }

      if (!response.data) {
        throw new Error("Empty PDF response");
      }

      return Buffer.from(response.data);
    },
    { retries: 5 },
  );
};

/**
 * Download PDF via proxy and summarize using Gemini
 */
const downloadAndSummarizePdf = async (url: string): Promise<string> => {
  // Download PDF via proxy
  const pdfBuffer = await fetchPdfViaProxy(url);

  // Summarize with LLM
  const response = await generateText({
    model: openrouter("google/gemini-3-flash-preview", {
      models: ["openai/gpt-5-mini"],
    }),
    prompt: [
      {
        role: "system",
        content: `You are a Senior Investment Analyst at a top-tier Hedge Fund. Your mandate is to synthesize the provided document into a high-conviction **Deal Memo** for our internal research archive.

**Your Goal:** Extract the "Signal" from the noise. We need the **Hard Numbers** (Valuation, Forecasts) backed by the **"Vibe"** (The narrative, the specific catalysts, the market sentiment). The output must be exciting to read, information-dense, and factually accurate.

**Crucial Style & Formatting Rules:**
1.  **Voice:** Write with energy and conviction. Use active verbs.
    * *Bad:* "It is anticipated that margins may improve."
    * *Good:* "Margins are set to expand to **25%** as the new smelter comes online."
2.  **Narrative Flow:** Do **NOT** use tables in the Thesis, Operations, or Vibe sections. Tables kill the narrative flow. Weave data directly into your sentences and **bold** the key metrics.
3.  **Data Filtering:** **IGNORE** transient noise (daily volume, current price charts, "Last 3M" performance). **KEEP** the Analyst's Target Price, Rating, and Forward-Looking Estimates.
4.  **Structural Freedom:** The sections below are a guide. If you find high-value information that fits better in a unique category (e.g., "Management Profile," "Geopolitical Angle," "Litigation Update"), **you must create a new Markdown section (##) for it.**

**Target Sections (Include ONLY if Data is Present):**

## 1. Valuation Snapshot
*(Requirement: Must contain a Target Price/Rating. Format: A clean Markdown table with Call, Target Price, Implied Upside, Valuation Method, and Forward Multiples).*

## 2. The Core Thesis (The "Why Now?")
*(Requirement: A punchy 2-3 sentence hook. Why is this stock interesting *today*? Focus on the structural shift or turnaround story).*

## 3. Operational Catalysts & Deep Dive
*(Requirement: Specific operational details—production targets, utilization rates, contract wins. Use narrative bullet points with bolded numbers).*

## 4. The "Vibe" & Narrative Strategy
*(Requirement: Non-traditional drivers. ESG angles, hidden assets, government backing, or "retail-friendly" narratives).*

## [INSERT CUSTOM SECTIONS HERE IF NEEDED]
*(Instruction: If the document contains critical info that doesn't fit above—like a deep dive on a new CEO or a specific legal issue—create a custom header here).*

## 5. Financial Forecast (The Model)
*(Requirement: Reconstruct the Analyst's P&L Forecast for the next 1-2 fiscal years in a Markdown table. Rows: Revenue, EBITDA, Net Income, EPS, ROE).*

## 6. Risks to the Thesis
*(Requirement: Specific threats to the story. Execution risk, commodity price sensitivity, regulatory changes).*`,
      },
      {
        role: "user",
        content: [
          {
            type: "file",
            data: pdfBuffer,
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

export const phintracoCompanyUpdateIngest = inngest.createFunction(
  { id: "phintraco-company-update-ingest", concurrency: 1 },
  { event: "data/phintraco-company-update-ingest" },
  async ({ event, step }) => {
    const summary = await step.run("download-and-extract", async () => {
      return await downloadAndSummarizePdf(event.data.pdfUrl);
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
              date: dayjs(event.data.date).format("YYYY-MM-DD"),
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
          id: uuidv5(`${event.data.pdfUrl}`, namespace),
          type: "analysis" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source: {
            name: "phintraco-company-update",
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
