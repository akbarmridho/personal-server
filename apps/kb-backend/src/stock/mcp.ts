import { FastMCP } from "fastmcp";
import yaml from "js-yaml";
import z from "zod";
import {
  sectors,
  supportedSubsectors,
} from "../data-modules/profiles/sector.js";
import { env } from "../infrastructure/env.js";
import { knowledgeService } from "../infrastructure/knowledge-service.js";
import { logger } from "../utils/logger.js";
import { GetCompaniesParams, getCompanies } from "./aggregator/companies.js";
import { getStockBandarmology } from "./endpoints/stock/bandarmology.js";
import { getStockFinancials } from "./endpoints/stock/financials.js";
import { getCompanyFundamental } from "./endpoints/stock/fundamental.js";
import { getStockManagement } from "./endpoints/stock/management.js";
import { getStockOwnership } from "./endpoints/stock/ownership.js";
import { getStockProfileReport } from "./endpoints/stock/profile.js";
// import { getStockTechnicals } from "./endpoints/stock/technicals.js";
// import { getBottomFishingSignal } from "./skills/catalog/bottom-fishing-playbook.js";
// import { getGCStochPSARSignal } from "./skills/catalog/gc-oversold-playbook.js";
// import { getSkill, listSkills } from "./skills/index.js";
import { searchTwitter } from "./twitter-search.js";
import { removeKeysRecursive } from "./utils.js";

// why yaml instead of json?
// see: https://www.improvingagents.com/blog/best-nested-data-format

let sourceNamesCache: {
  data: string[] | null;
  timestamp: number | null;
} = {
  data: null,
  timestamp: null,
};

const SOURCE_NAMES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const SymbolSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase().replace(/\.JK$/, ""))
  .refine(
    (value) => /^[A-Z]{4}$/.test(value),
    "Symbol must be 4 uppercase letters (e.g., BBCA).",
  );

const SymbolArraySchema = z
  .array(SymbolSchema)
  .describe("Array of stock symbols represented as four-letter uppercase.");

const DateYmdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.");

const LimitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .describe("The search limit. Default to 10. Min is 1 and max is 100");

const SubsectorArraySchema = z
  .array(z.string())
  .describe(
    `Array of subsector. Supported slugs: ${Array.from(supportedSubsectors).join(", ")}`,
  );

const SourceNamesSchema = z
  .array(z.string())
  .describe(
    "Array of source names from metadata.source.name. Use get-document-sources to discover valid values.",
  );

const SearchQuerySchema = z
  .string()
  .trim()
  .min(2)
  .max(300)
  .superRefine((query, ctx) => {
    const hasInlineFilterSyntax =
      /\b(limit|date_from|date_to|symbols|subsectors|types|source_names|pure_sector)\s*=/.test(
        query,
      );
    if (hasInlineFilterSyntax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Do not embed filter keys in query text. Use dedicated fields (symbols, types, date_from/date_to, source_names, etc.).",
      });
    }

    if (/\bsite:/i.test(query)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Do not use site: in query. Use source_names filter (discoverable via get-document-sources).",
      });
    }
  });

const DocumentFiltersSchema = z
  .object({
    limit: LimitSchema.optional(),
    page: z
      .number()
      .int()
      .min(1)
      .describe("Page number for pagination (1-indexed). Default to 1.")
      .optional(),
    symbols: SymbolArraySchema.optional(),
    subsectors: SubsectorArraySchema.optional(),
    types: z.enum(["news", "filing", "analysis", "rumour"]).array().optional(),
    date_from: DateYmdSchema.describe(
      "Start date limit in YYYY-MM-DD format",
    ).optional(),
    date_to: DateYmdSchema.describe(
      "End date limit in YYYY-MM-DD format",
    ).optional(),
    source_names: SourceNamesSchema.optional(),
    pure_sector: z
      .boolean()
      .describe(
        "Filter for documents without symbols (pure sector/market news). If true, will return document without symbols. If false, return document WITH symbols. If nonexistent this filter doesn't apply",
      )
      .optional(),
  })
  .superRefine((args, ctx) => {
    if (args.date_from && args.date_to && args.date_from > args.date_to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "date_from must be earlier than or equal to date_to.",
        path: ["date_to"],
      });
    }
  });

export const setupStockMcp = async () => {
  const server = new FastMCP({
    name: "Stock Tools Server",
    version: "1.0.0",
    ping: {
      enabled: true,
      intervalMs: 25000,
      logLevel: "info",
    },
  });

  server.addTool({
    name: "get-sectors",
    description:
      "Returns all available stock sectors and subsectors with their slugs.",
    parameters: z.object({}),
    execute: async () => {
      logger.info("Executing get-sectors");

      const subsectors = removeKeysRecursive(sectors, ["industries"]);

      try {
        return { type: "text", text: yaml.dump(subsectors) };
      } catch (error) {
        logger.error({ error }, "Get sectors failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  // server.addTool({
  //   name: "get-sectors-report",
  //   description:
  //     "Returns detailed report for specified subsectors. Use get-sectors first to see available subsector slugs.",
  //   parameters: GetSectorsReportParams,
  //   execute: async (args) => {
  //     logger.info(
  //       { subsectors: args.subsectors },
  //       "Executing get-sectors-report",
  //     );
  //     try {
  //       const result = await getSectorsReport(args);
  //       logger.info(
  //         { subsectors: args.subsectors },
  //         "Get sectors report completed",
  //       );
  //       return { type: "text", text: yaml.dump(result) };
  //     } catch (error) {
  //       logger.error(
  //         { error, subsectors: args.subsectors },
  //         "Get sectors report failed",
  //       );
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: error instanceof Error ? error.message : String(error),
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   },
  // });

  server.addTool({
    name: "get-companies",
    description:
      "Returns companies filtered by subsectors or symbols. Provide either subsectors array or symbols array.",
    parameters: GetCompaniesParams,
    execute: async (args) => {
      logger.info({ args }, "Executing get-companies");
      try {
        const result = await getCompanies(args);
        logger.info({ args }, "Get companies completed");
        return { type: "text", text: yaml.dump(result) };
      } catch (error) {
        logger.error({ error, args }, "Get companies failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  server.addTool({
    name: "get-stock-fundamental",
    description: "Returns fundamental data for a specific stock symbol.",
    parameters: z.object({ symbol: SymbolSchema }),
    execute: async (args) => {
      logger.info({ symbol: args.symbol }, "Executing get-stock-fundamental");
      try {
        const data = await getCompanyFundamental(args.symbol);
        logger.info({ symbol: args.symbol }, "Get fundamental completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, symbol: args.symbol }, "Get fundamental failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  server.addTool({
    name: "get-stock-profile",
    description:
      "Returns an enriched company profile for a stock symbol. Uses Stockbit profile as baseline and grounded web research for updates. If not cached, execution may take a while while research completes.",
    parameters: z.object({ symbol: SymbolSchema }),
    execute: async (args) => {
      logger.info({ symbol: args.symbol }, "Executing get-stock-profile");
      try {
        const data = await getStockProfileReport(args.symbol);
        logger.info({ symbol: args.symbol }, "Get stock profile completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error(
          { error, symbol: args.symbol },
          "Get stock profile failed",
        );
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  server.addTool({
    name: "get-stock-bandarmology",
    description: "Returns market detector data for a specific stock symbol.",
    parameters: z.object({
      symbol: SymbolSchema,
      period: z.enum(["1d", "1w", "1m", "3m", "1y"]),
    }),
    execute: async (args) => {
      logger.info(
        { symbol: args.symbol, period: args.period },
        "Executing get-stock-bandarmology",
      );
      try {
        const data = await getStockBandarmology(args.symbol, args.period);
        logger.info({ symbol: args.symbol }, "Get bandarmology completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, symbol: args.symbol }, "Get bandarmology failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  server.addTool({
    name: "get-stock-financials",
    description: "Returns financial statements for a specific stock symbol.",
    parameters: z.object({
      symbol: SymbolSchema,
      reportType: z.enum(["income-statement", "balance-sheet", "cash-flow"]),
      statementType: z.enum(["quarterly", "annually", "ttm"]),
    }),
    execute: async (args) => {
      logger.info(
        {
          symbol: args.symbol,
          reportType: args.reportType,
          statementType: args.statementType,
        },
        "Executing get-stock-financials",
      );
      try {
        const data = await getStockFinancials(args);
        logger.info({ symbol: args.symbol }, "Get financials completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, symbol: args.symbol }, "Get financials failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  server.addTool({
    name: "get-stock-governance",
    description:
      "Returns governance data for a specific stock symbol including management, executives, ownership structure, and insider activity.",
    parameters: z.object({ symbol: SymbolSchema }),
    execute: async (args) => {
      logger.info({ symbol: args.symbol }, "Executing get-stock-governance");
      try {
        const [management, ownership] = await Promise.all([
          getStockManagement(args.symbol),
          getStockOwnership(args.symbol),
        ]);
        const data = { management, ownership };
        logger.info({ symbol: args.symbol }, "Get governance completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, symbol: args.symbol }, "Get governance failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  // server.addTool({
  //   name: "get-stock-technical",
  //   description:
  //     "Returns technical analysis data for a specific stock symbol including indicators, patterns, and seasonality.",
  //   parameters: z.object({ symbol: z.string() }),
  //   execute: async (args) => {
  //     logger.info({ symbol: args.symbol }, "Executing get-stock-technical");
  //     try {
  //       const data = await getStockTechnicals(args.symbol);
  //       logger.info({ symbol: args.symbol }, "Get technicals completed");
  //       return { type: "text", text: yaml.dump(data) };
  //     } catch (error) {
  //       logger.error({ error, symbol: args.symbol }, "Get technicals failed");
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: error instanceof Error ? error.message : String(error),
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   },
  // });

  // server.addTool({
  //   name: "get-ihsg-overview",
  //   description:
  //     "Returns IHSG (Indonesia Stock Exchange Composite Index) overview with market data, technical indicators, and seasonality.",
  //   parameters: z.object({}),
  //   execute: async () => {
  //     logger.info("Executing get-ihsg-overview");
  //     try {
  //       const data = await getIHSGOverview();
  //       logger.info("Get IHSG overview completed");
  //       return { type: "text", text: yaml.dump(data) };
  //     } catch (error) {
  //       logger.error({ error }, "Get IHSG overview failed");
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: error instanceof Error ? error.message : String(error),
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   },
  // });

  // server.addTool({
  //   name: "get-forex",
  //   description:
  //     "Return current and historical forex rates from IDR into various currencies. Available currency: USD, CNY, EUR, JPY, SGD",
  //   parameters: z.object({
  //     currencies: z
  //       .enum(["USD", "CNY", "EUR", "JPY", "SGD"])
  //       .array()
  //       .describe("The currencies to compare against IDR"),
  //   }),
  //   execute: async (args) => {
  //     logger.info({ args }, "Executing get-forex");
  //     try {
  //       const result: Record<string, PriceSummaryData> = {};

  //       const raw = await Promise.all(
  //         args.currencies.map(async (currency) => {
  //           return {
  //             currency,
  //             data: await getForexSummary(currency),
  //           };
  //         }),
  //       );

  //       for (const each of raw) {
  //         result[each.currency] = each.data;
  //       }

  //       logger.info({ args }, "Get forex completed");
  //       return { type: "text", text: yaml.dump(result) };
  //     } catch (error) {
  //       logger.error({ error, args }, "Get forex failed");
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: error instanceof Error ? error.message : String(error),
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   },
  // });

  // server.addTool({
  //   name: "get-commodity",
  //   description:
  //     "Return current and historical commodity prices in USD. Available commodity: GOLD, SILVER, OIL_WTI, OIL_BRENT, COPPER, COAL, NICKEL, CPO",
  //   parameters: z.object({
  //     commodities: z
  //       .enum([
  //         "GOLD",
  //         "SILVER",
  //         "OIL_WTI",
  //         "OIL_BRENT",
  //         "COPPER",
  //         "COAL",
  //         "NICKEL",
  //         "CPO",
  //       ])
  //       .array()
  //       .describe("The commodities name"),
  //   }),
  //   execute: async (args) => {
  //     logger.info({ args }, "Executing get-forex");
  //     try {
  //       const result: Record<string, PriceSummaryData> = {};

  //       const raw = await Promise.all(
  //         args.commodities.map(async (commodity) => {
  //           return {
  //             commodity,
  //             data: await getCommoditySummary(commodity),
  //           };
  //         }),
  //       );

  //       for (const each of raw) {
  //         result[each.commodity] = each.data;
  //       }

  //       logger.info({ args }, "Get commodity completed");
  //       return { type: "text", text: yaml.dump(result) };
  //     } catch (error) {
  //       logger.error({ error, args }, "Get commodity failed");
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: error instanceof Error ? error.message : String(error),
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   },
  // });

  server.addTool({
    name: "get-document",
    description:
      "Retrieve a specific investment document by its ID. Returns the complete document with all metadata.",
    parameters: z.object({
      documentId: z.string().describe("The document ID to retrieve"),
    }),
    execute: async (args) => {
      logger.info({ documentId: args.documentId }, "Executing get-document");
      try {
        const data = await knowledgeService.getDocument(args.documentId);
        logger.info({ documentId: args.documentId }, "Get document completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error(
          { error, documentId: args.documentId },
          "Get document failed",
        );
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  server.addTool({
    name: "get-document-sources",
    description:
      "Returns unique source names from document metadata.source.name. Use these values for source_names filters in list-documents and search-documents.",
    parameters: z.object({}),
    execute: async () => {
      logger.info("Executing get-document-sources");
      try {
        const now = Date.now();

        if (
          sourceNamesCache.data &&
          sourceNamesCache.timestamp &&
          now - sourceNamesCache.timestamp < SOURCE_NAMES_CACHE_TTL_MS
        ) {
          logger.info("Returning cached document source names");
          return { type: "text", text: yaml.dump(sourceNamesCache.data) };
        }

        const sourceNames = await knowledgeService.listSourceNames();
        sourceNamesCache = {
          data: sourceNames,
          timestamp: now,
        };

        logger.info(
          { sourceCount: sourceNames.length },
          "Get document sources completed",
        );
        return { type: "text", text: yaml.dump(sourceNames) };
      } catch (error) {
        logger.error({ error }, "Get document sources failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  server.addTool({
    name: "list-documents",
    description:
      "List investment documents with optional filters. Returns document snapshots (table of contents) with id, type, title, first 100 tokens of content preview, date, symbols, and source metadata (including source.name). Use get-document tool to retrieve full content.",
    parameters: DocumentFiltersSchema,
    execute: async (args) => {
      logger.info({ args }, "Executing list-documents");
      try {
        // todo don't return all
        const data = await knowledgeService.listDocumentsPreview(args);

        logger.info({ args }, "List documents completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, args }, "List documents failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  server.addTool({
    name: "search-documents",
    description:
      "Search investment documents using semantic search. Returns relevant documents with similarity scores based on the query.",
    parameters: DocumentFiltersSchema.safeExtend({
      query: SearchQuerySchema.describe("The search query"),
    }),
    execute: async (args) => {
      logger.info({ args }, "Executing search-documents");
      try {
        const data = await knowledgeService.searchDocuments(args);
        logger.info({ args }, "Search documents completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, args }, "Search documents failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  // server.addTool({
  //   name: "list-skills",
  //   description:
  //     "List all available stock market skills. Returns skill names and descriptions. Use get-skill to retrieve full content.",
  //   parameters: z.object({}),
  //   execute: async () => {
  //     logger.info("Executing list-skills");
  //     try {
  //       const data = listSkills();
  //       logger.info("List skills completed");
  //       return { type: "text", text: yaml.dump(data) };
  //     } catch (error) {
  //       logger.error({ error }, "List skills failed");
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: error instanceof Error ? error.message : String(error),
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   },
  // });

  // server.addTool({
  //   name: "get-skill",
  //   description:
  //     "Retrieve a specific stock market skill by name. Returns modular knowledge like broker information, fundamental calculation methods, etc.",
  //   parameters: z.object({
  //     name: z.string().describe("The skill name to retrieve"),
  //   }),
  //   execute: async (args) => {
  //     logger.info({ name: args.name }, "Executing get-skill");
  //     try {
  //       const data = getSkill(args.name);
  //       if (!data) {
  //         return {
  //           content: [
  //             {
  //               type: "text",
  //               text: `Skill '${args.name}' not found`,
  //             },
  //           ],
  //           isError: true,
  //         };
  //       }
  //       logger.info({ name: args.name }, "Get skill completed");
  //       return { type: "text", text: yaml.dump(data) };
  //     } catch (error) {
  //       logger.error({ error, name: args.name }, "Get skill failed");
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: error instanceof Error ? error.message : String(error),
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   },
  // });

  // server.addTool({
  //   name: "get-gc-stoch-psar-signal",
  //   description:
  //     "Analyzes a stock symbol for the 'Golden Cross + Stochastic Oversold + PSAR' swing trading setup. Returns predictive phases (FORMING, READY, TRIGGERED, ACTIVE), current technical levels, signal confidence, and actionable insights. Use this to validate entry/exit signals or monitor watchlists.",
  //   parameters: z.object({
  //     symbol: z.string().describe("The stock ticker symbol (e.g., BBCA, ASII)"),
  //   }),
  //   execute: async (args) => {
  //     logger.info(
  //       { symbol: args.symbol },
  //       "Executing get-gc-stoch-psar-signal",
  //     );
  //     try {
  //       const data = await getGCStochPSARSignal(args.symbol);
  //       logger.info(
  //         { symbol: args.symbol },
  //         "Get GC Stoch PSAR signal completed",
  //       );
  //       return { type: "text", text: yaml.dump(data) };
  //     } catch (error) {
  //       logger.error(
  //         { error, symbol: args.symbol },
  //         "Get GC Stoch PSAR signal failed",
  //       );
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: error instanceof Error ? error.message : String(error),
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   },
  // });

  // server.addTool({
  //   name: "get-bottom-fishing-signal",
  //   description:
  //     "Analyzes a stock symbol for bottom fishing opportunities during market crashes. Uses Weekly RSI, Volume Spikes, and Heikin Ashi patterns to identify safe entry points. Returns predictive phases (WATCHING, MINOR_OPPORTUNITY, MAJOR_ALERT, CAPITULATION_DETECTED, REVERSAL_CONFIRMED), current indicator states, signal confidence, and actionable insights.",
  //   parameters: z.object({
  //     symbol: z.string().describe("The stock ticker symbol (e.g., BBCA, ASII)"),
  //   }),
  //   execute: async (args) => {
  //     logger.info(
  //       { symbol: args.symbol },
  //       "Executing get-bottom-fishing-signal",
  //     );
  //     try {
  //       const data = await getBottomFishingSignal(args.symbol);
  //       logger.info(
  //         { symbol: args.symbol },
  //         "Get bottom fishing signal completed",
  //       );
  //       return { type: "text", text: yaml.dump(data) };
  //     } catch (error) {
  //       logger.error(
  //         { error, symbol: args.symbol },
  //         "Get bottom fishing signal failed",
  //       );
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: error instanceof Error ? error.message : String(error),
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   },
  // });

  server.addTool({
    name: "search-twitter",
    description: `Search X (Twitter) for Indonesian stock market discussions, analysis, and sentiment.

Returns structured results including:
- Relevant tweets with full content, author, date, and URL
- Stock tickers mentioned
- Key insights extracted from posts and images (charts, screeners, flow data)
- Summary synthesis per query

Best for:
- Finding discussions about specific stocks/tickers (e.g., "BBRI", "ANTM")
- Sector sentiment and themes (e.g., "coal sector outlook", "banking stocks")
- Market events and corporate actions (e.g., "rights issue", "akuisisi")
- "Bandar" activity, foreign flow discussions, and trading signals

Results prioritize trusted Indonesian stock market accounts but include other relevant sources.`,
    parameters: z.object({
      queries: z.array(z.string()).describe(
        `Search queries to find on Twitter. Each query is processed separately.

Examples:
- Stock ticker: "BBRI", "$ANTM", "BRIS saham"
- Company name: "Bank BRI", "Telkom"
- Sector/theme: "saham batubara", "coal stocks", "banking sector"
- Events: "rights issue 2024", "dividen TLKM"
- General: "saham undervalue", "foreign flow"

Use Indonesian keywords for better results on local market topics.`,
      ),
      daysOld: z
        .number()
        .optional()
        .describe(
          "Number of days to search back. Default is 14 days. Use shorter (3-7) for recent news, longer (30-60) for historical research.",
        ),
      prioritizeGoldenHandles: z
        .boolean()
        .optional()
        .describe(
          "Whether to prioritize results from trusted Indonesian stock market accounts. Default is true. Set to false for broader search.",
        ),
    }),
    execute: async (args) => {
      logger.info({ args }, "Executing search-twitter");
      try {
        const data = await searchTwitter(args);
        logger.info(
          { queries: args.queries, resultLength: data.result.length },
          "Twitter search completed",
        );
        return { type: "text", text: data.result };
      } catch (error) {
        logger.error({ error, args }, "Twitter search failed");
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  });

  await server.start({
    transportType: "httpStream",
    httpStream: {
      enableJsonResponse: true,
      stateless: true,
      port: env.STOCK_MCP_PORT,
      host: "0.0.0.0",
    },
  });

  return server;
};
