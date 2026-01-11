import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { AxiosError } from "axios";
import { NonRetriableError } from "inngest";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { proxiedAxios } from "../../stock/proxy.js";
import { stockbitAuth } from "../../stock/stockbit/auth.js";
import { logger } from "../../utils/logger.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

// UUID v5 namespace for stockbit-filing module
const namespace = "6f18d6c3-57f1-4397-a433-5eaca89af048";

interface AnnouncementDetailItem {
  id: number;
  company_id: number;
  posted_on: string;
  headline: string;
  title: string;
  attachment: string;
  retrieved_on: string;
  symbol: string;
  name: string;
  company_icon_url: string;
}

interface AnnouncementDetailResponse {
  message: string;
  data: AnnouncementDetailItem[];
}

export interface FilingEventData {
  stream_id: number;
  title_url: string;
  title: string;
  created_at: string;
  symbol: string;
  report_type: "RUPS" | "CORPORATE_ACTION" | "OTHER";
}

export const stockbitAnnouncementIngest = inngest.createFunction(
  {
    id: "stockbit-announcement-ingest",
    concurrency: 3, // Limit concurrent LLM calls
  },
  { event: "data/stockbit-announcement-ingest" },
  async ({ event, step }) => {
    const eventData = event.data;

    logger.info(
      `Starting announcement ingest: ${eventData.title} (${eventData.stream_id})`,
    );

    // Step 1: Fetch announcement detail
    const announcement = await step.run("fetch-detail", async () => {
      const authData = await stockbitAuth.get();
      if (!authData) {
        throw new NonRetriableError("Stockbit auth not found");
      }

      const hash = eventData.title_url.split("/").pop();
      const url = `https://exodus.stockbit.com/stream/announcement/${hash}`;

      try {
        const response = await proxiedAxios.get<AnnouncementDetailResponse>(
          url,
          {
            headers: {
              Authorization: `Bearer ${authData.accessToken}`,
            },
          },
        );

        logger.info(
          `Fetched announcement detail: ${response.data.data.length} items`,
        );
        return response.data.data;
      } catch (error) {
        // Handle authentication errors as non-retriable
        if (error instanceof AxiosError) {
          const status = error.response?.status;
          if (status === 401 || status === 403) {
            logger.error(
              `Authentication error (${status}) fetching announcement detail`,
            );
            throw new NonRetriableError(
              `Stockbit API authentication failed: ${status}`,
            );
          }
        }

        logger.error(
          `Error fetching announcement detail: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    });

    // Step 2: Summarize with LLM
    const summary = await step.run("summarize", async () => {
      // Collect all PDF URLs from announcement items
      const pdfUrls = announcement
        .map((item) => item.attachment)
        .filter((url) => url && url.endsWith(".pdf"));

      if (pdfUrls.length === 0) {
        // No PDFs, use title + headline as content
        logger.info("No PDFs found, using title as content");
        return {
          summary: eventData.title,
          pdfUrls: [],
        };
      }

      logger.info(
        `Summarizing ${pdfUrls.length} PDF(s) with LLM via OpenRouter (direct URLs)`,
      );

      try {
        // Use Vercel AI SDK with OpenRouter - pass PDF URLs directly
        const response = await generateText({
          model: openrouter("google/gemini-2.5-flash-lite-preview-09-2025", {
            models: ["google/gemini-3-flash-preview"],
          }),
          messages: [
            {
              role: "system",
              content: `You are an expert Investment Analyst for the Indonesian Stock Market.

TASK: Extract ALL material information from the corporate filing documents with MAXIMUM DETAIL.

EXTRACTION PRIORITIES (capture EVERYTHING with details):

1. **Corporate Actions & Transactions**
   - Acquisitions: Target company name, industry, location, size, purchase price, payment terms, strategic rationale
   - Mergers: Parties involved, ownership structure, valuation, timeline, regulatory approvals needed
   - Divestitures: What's being sold, buyer details, transaction value, reasons for sale
   - Joint ventures: Partners, ownership split, project scope, investment amounts, location, timeline

2. **Financial Details**
   - Exact figures: Revenue, profit, losses, margins, EBITDA, cash flow
   - Capital structure: Share issuance, debt levels, interest rates, maturity dates
   - Valuations: Asset values, goodwill, impairments, fair value adjustments
   - Dividends: Amount per share, payment dates, yield, payout ratio
   - Capex plans: Investment amounts, project names, locations, expected returns

3. **Operational Information**
   - Production volumes: Capacity, utilization rates, output figures by product/mine/facility
   - Facilities: Names, locations, sizes, capacities, operational status
   - Projects: Project names, stages, locations, investment to date, completion timelines
   - Contracts: Client/supplier names, contract values, durations, terms, renewal status

4. **Strategic & Material Events**
   - Expansions: Where, how much investment, expected capacity increase, timeline
   - New products/services: What, when, target market, expected revenue contribution
   - Management changes: Names, positions, backgrounds, effective dates
   - Regulatory matters: Approvals needed/obtained, licenses, compliance issues, fines
   - Legal proceedings: Nature, parties, amounts at stake, status, potential impact

5. **Market & Competitive Context**
   - Commodity prices if relevant (coal, nickel, oil, etc.)
   - Market share positions
   - Competitive advantages mentioned
   - Industry trends affecting the company

6. **Shareholder Matters**
   - Voting items: What's being voted on, management recommendation, required approvals
   - Ownership changes: Major shareholders, percentage changes, control implications
   - Rights issues: Terms, pricing, subscription ratio, use of proceeds
   - Stock splits/reverse splits: Ratio, effective date, rationale

OUTPUT FORMAT:
- Write in detailed English (translate from Indonesian)
- Use markdown with ## (h2) for main sections, ### (h3) for subsections
- Section headings must be factual and descriptive (e.g., "Corporate Actions & Transactions", "Financial Performance", "Operational Details")
- DO NOT include methodology, analysis type, or meta-commentary in headings
- Include ALL specific names, numbers, dates, locations, and amounts
- Use bullet points for lists but provide complete sentences with context
- Preserve exact numerical data and percentages as stated
- Target 4-8 comprehensive paragraphs or equivalent detailed structure
- If information is missing, state "Not disclosed" rather than omitting

CRITICAL RULES:
1. MAXIMIZE DETAIL - specifics are everything
2. Never say "a company" - always use the actual company name if provided
3. Never say "a location" - always use the actual location/region/province if provided
4. Include ALL financial figures, not just major ones
5. Capture corporate timeline details (when things happened, will happen)
6. Be factual - only report what's explicitly in the document
7. DO NOT summarize or compress information - expand and detail it
8. If multiple items (e.g., multiple acquisitions), list ALL with full details for each`,
            },
            {
              role: "user",
              content: [
                // Pass all PDF URLs directly (no download needed)
                ...pdfUrls.map((url) => ({
                  type: "file" as const,
                  data: new URL(url),
                  mediaType: "application/pdf",
                })),
                {
                  type: "text",
                  text: `Filing: ${eventData.title}\nSymbol: ${eventData.symbol}\nDate: ${eventData.created_at}`,
                },
              ],
            },
          ],
          maxRetries: 3,
        });

        const summaryText = response.text || eventData.title;
        logger.info(`Generated summary (${summaryText.length} chars)`);

        return {
          summary: summaryText,
          pdfUrls,
        };
      } catch (error) {
        logger.error(
          `Error in LLM summarization: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Fallback to title if LLM fails
        return {
          summary: eventData.title,
          pdfUrls,
        };
      }
    });

    // Step 3: Prepare payload
    const payload: InvestmentDocument = await step.run(
      "prepare-payload",
      async () => {
        // Extract symbols from summary + title
        const textToAnalyze = `${eventData.title}\n\n${summary.summary}`;
        const symbols = await extractSymbolFromTexts([textToAnalyze]);

        // Ensure the original symbol is included
        if (!symbols[0].includes(eventData.symbol)) {
          symbols[0].push(eventData.symbol);
        }

        // Tag metadata
        const tagged = await tagMetadata([
          {
            date: eventData.created_at.split(" ")[0], // Extract date part
            content: summary.summary,
            title: eventData.title,
            urls: summary.pdfUrls,
            subindustries: [],
            subsectors: [],
            symbols: symbols[0],
            indices: [],
          },
        ]);

        // Generate UUID from stream_id
        const docId = uuidv5(eventData.stream_id.toString(), namespace);

        logger.info(
          `Prepared payload: docId=${docId}, symbols=${tagged[0].symbols.join(", ")}`,
        );

        return {
          id: docId,
          type: "filing" as const,
          title: eventData.title,
          content: summary.summary,
          document_date: tagged[0].date,
          source: {
            name: "stockbit-filing",
            category: eventData.report_type,
            url: `https://stockbit.com/${eventData.title_url}`,
          },
          urls: summary.pdfUrls,
          symbols: tagged[0].symbols,
          subindustries: tagged[0].subindustries,
          subsectors: tagged[0].subsectors,
          indices: tagged[0].indices,
        };
      },
    );

    // Step 4: Ingest to knowledge service
    await step.run("ingest-document", async () => {
      try {
        const result = await knowledgeService.ingestDocuments({
          documents: [payload],
        });
        logger.info(`Ingested document ${payload.id} to knowledge service`);
        return result;
      } catch (error) {
        logger.error(
          `Error ingesting document: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    });

    return { success: true, docId: payload.id };
  },
);
