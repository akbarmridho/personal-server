import { FastMCP } from "fastmcp";
import yaml from "js-yaml";
import z from "zod";
import { supportedSubsectors } from "../data-modules/profiles/sector.js";
import { env } from "../infrastructure/env.js";
import { knowledgeService } from "../infrastructure/knowledge-service.js";
import { logger } from "../utils/logger.js";
import { getStockFinancials } from "./endpoints/stock/financials.js";
import { getCompanyFundamental } from "./endpoints/stock/fundamental.js";
import { getStockManagement } from "./endpoints/stock/management.js";
import { getStockOwnership } from "./endpoints/stock/ownership.js";
import { getStockProfileReport } from "./endpoints/stock/profile.js";
import { searchTwitter } from "./twitter-search.js";

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

const normalizeSymbol = (value: string) =>
  value.trim().toUpperCase().replace(/\.JK$/, "");

const SYMBOL_REGEX = /^[A-Z]{4}$/;
const DATE_YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const SymbolSchema = z
  .string()
  .describe(
    "Stock symbol. Accepts 4 letters, optionally with .JK suffix (e.g., BBCA or BBCA.JK).",
  );

const SymbolArraySchema = z
  .array(SymbolSchema)
  .describe("Array of stock symbols represented as four-letter uppercase.");

const DateYmdSchema = z.string().describe("Date in YYYY-MM-DD format.");

const LimitSchema = z
  .number()
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

const SearchQuerySchema = z.string();

const DocumentFiltersSchema = z.object({
  limit: LimitSchema.optional(),
  page: z
    .number()
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
});

const normalizeAndValidateSymbol = (value: string): string => {
  const normalized = normalizeSymbol(value);
  if (!SYMBOL_REGEX.test(normalized)) {
    throw new Error(
      "Symbol must be 4 letters, optionally with .JK suffix (e.g., BBCA or BBCA.JK).",
    );
  }
  return normalized;
};

const validateDateYmd = (value: string, fieldName: "date_from" | "date_to") => {
  if (!DATE_YMD_REGEX.test(value)) {
    throw new Error(`${fieldName} must be in YYYY-MM-DD format.`);
  }
};

const validateSearchQuery = (value: string): string => {
  const query = value.trim();
  if (query.length < 2 || query.length > 300) {
    throw new Error("query must be between 2 and 300 characters.");
  }

  const hasInlineFilterSyntax =
    /\b(limit|date_from|date_to|symbols|subsectors|types|source_names|pure_sector)\s*=/.test(
      query,
    );
  if (hasInlineFilterSyntax) {
    throw new Error(
      "Do not embed filter keys in query text. Use dedicated fields (symbols, types, date_from/date_to, source_names, etc.).",
    );
  }

  if (/\bsite:/i.test(query)) {
    throw new Error(
      "Do not use site: in query. Use source_names filter (discoverable via get-document-sources).",
    );
  }

  return query;
};

const normalizeAndValidateDocumentFilters = (
  args: z.infer<typeof DocumentFiltersSchema>,
) => {
  if (
    args.limit !== undefined &&
    (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)
  ) {
    throw new Error("limit must be an integer between 1 and 100.");
  }

  if (
    args.page !== undefined &&
    (!Number.isInteger(args.page) || args.page < 1)
  ) {
    throw new Error("page must be an integer greater than or equal to 1.");
  }

  if (args.date_from) {
    validateDateYmd(args.date_from, "date_from");
  }

  if (args.date_to) {
    validateDateYmd(args.date_to, "date_to");
  }

  if (args.date_from && args.date_to && args.date_from > args.date_to) {
    throw new Error("date_from must be earlier than or equal to date_to.");
  }

  return {
    ...args,
    symbols: args.symbols?.map(normalizeAndValidateSymbol),
  };
};

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
    name: "get-stock-profile",
    description:
      "Returns an enriched company profile for a stock symbol. Uses Stockbit profile as baseline and grounded web research for updates. If not cached, execution may take a while while research completes.",
    parameters: z.object({ symbol: SymbolSchema }),
    execute: async (args) => {
      const symbol = normalizeAndValidateSymbol(args.symbol);
      logger.info({ symbol }, "Executing get-stock-profile");
      try {
        const data = await getStockProfileReport(symbol);
        logger.info({ symbol }, "Get stock profile completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, symbol }, "Get stock profile failed");
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
    name: "get-stock-keystats",
    description: "Returns keystats data for a specific stock symbol.",
    parameters: z.object({ symbol: SymbolSchema }),
    execute: async (args) => {
      const symbol = normalizeAndValidateSymbol(args.symbol);
      logger.info({ symbol }, "Executing get-stock-keystats");
      try {
        const data = await getCompanyFundamental(symbol);
        logger.info({ symbol }, "Get keystats completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, symbol }, "Get keystats failed");
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
    description:
      "Returns unified financial statements format for a specific stock symbol.",
    parameters: z.object({
      symbol: SymbolSchema,
      reportType: z.enum(["income-statement", "balance-sheet", "cash-flow"]),
      statementType: z.enum(["quarterly", "annually", "ttm"]),
    }),
    execute: async (args) => {
      const normalizedArgs = {
        ...args,
        symbol: normalizeAndValidateSymbol(args.symbol),
      };
      logger.info(
        {
          symbol: normalizedArgs.symbol,
          reportType: normalizedArgs.reportType,
          statementType: normalizedArgs.statementType,
        },
        "Executing get-stock-financials",
      );
      try {
        const data = await getStockFinancials(normalizedArgs);
        logger.info(
          { symbol: normalizedArgs.symbol },
          "Get financials completed",
        );
        return { type: "text", text: data.markdown };
      } catch (error) {
        logger.error(
          { error, symbol: normalizedArgs.symbol },
          "Get financials failed",
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
    name: "get-stock-governance",
    description:
      "Returns governance data for a specific stock symbol including management, executives, ownership structure, and insider activity.",
    parameters: z.object({ symbol: SymbolSchema }),
    execute: async (args) => {
      const symbol = normalizeAndValidateSymbol(args.symbol);
      logger.info({ symbol }, "Executing get-stock-governance");
      try {
        const [management, ownership] = await Promise.all([
          getStockManagement(symbol),
          getStockOwnership(symbol),
        ]);

        const data = { management, ownership };

        logger.info({ symbol }, "Get governance completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, symbol }, "Get governance failed");
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
      const normalizedArgs = normalizeAndValidateDocumentFilters(args);
      logger.info({ args: normalizedArgs }, "Executing list-documents");
      try {
        // todo don't return all
        const data =
          await knowledgeService.listDocumentsPreview(normalizedArgs);

        logger.info({ args: normalizedArgs }, "List documents completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, args: normalizedArgs }, "List documents failed");
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
      const normalizedArgs = {
        ...normalizeAndValidateDocumentFilters(args),
        query: validateSearchQuery(args.query),
      };
      logger.info({ args: normalizedArgs }, "Executing search-documents");
      try {
        const data = await knowledgeService.searchDocuments(normalizedArgs);
        logger.info({ args: normalizedArgs }, "Search documents completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error(
          { error, args: normalizedArgs },
          "Search documents failed",
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
