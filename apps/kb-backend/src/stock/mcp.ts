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
import {
  GetSectorsReportParams,
  getSectorsReport,
} from "./aggregator/sectors-report.js";
import { getIHSGOverview } from "./endpoints/ihsg/overview.js";
import { getStockBandarmology } from "./endpoints/stock/bandarmology.js";
import { getStockFinancials } from "./endpoints/stock/financials.js";
import { getCompanyFundamental } from "./endpoints/stock/fundamental.js";
import { getStockManagement } from "./endpoints/stock/management.js";
import { getStockOwnership } from "./endpoints/stock/ownership.js";
import { getStockTechnicals } from "./endpoints/stock/technicals.js";
import { getCommoditySummary } from "./other-prices/commodity.js";
import {
  getForexSummary,
  type PriceSummaryData,
} from "./other-prices/forex.js";
import { getSkill, listSkills } from "./skills/index.js";
import { removeKeysRecursive } from "./utils.js";

// why yaml instead of json?
// see: https://www.improvingagents.com/blog/best-nested-data-format

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

  server.addTool({
    name: "get-sectors-report",
    description:
      "Returns detailed report for specified subsectors. Use get-sectors first to see available subsector slugs.",
    parameters: GetSectorsReportParams,
    execute: async (args) => {
      logger.info(
        { subsectors: args.subsectors },
        "Executing get-sectors-report",
      );
      try {
        const result = await getSectorsReport(args);
        logger.info(
          { subsectors: args.subsectors },
          "Get sectors report completed",
        );
        return { type: "text", text: yaml.dump(result) };
      } catch (error) {
        logger.error(
          { error, subsectors: args.subsectors },
          "Get sectors report failed",
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
    parameters: z.object({ symbol: z.string() }),
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
    name: "get-stock-bandarmology",
    description: "Returns market detector data for a specific stock symbol.",
    parameters: z.object({
      symbol: z.string(),
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
      symbol: z.string(),
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
    parameters: z.object({ symbol: z.string() }),
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

  server.addTool({
    name: "get-stock-technical",
    description:
      "Returns technical analysis data for a specific stock symbol including indicators, patterns, and seasonality.",
    parameters: z.object({ symbol: z.string() }),
    execute: async (args) => {
      logger.info({ symbol: args.symbol }, "Executing get-stock-technical");
      try {
        const data = await getStockTechnicals(args.symbol);
        logger.info({ symbol: args.symbol }, "Get technicals completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, symbol: args.symbol }, "Get technicals failed");
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
    name: "get-ihsg-overview",
    description:
      "Returns IHSG (Indonesia Stock Exchange Composite Index) overview with market data, technical indicators, and seasonality.",
    parameters: z.object({}),
    execute: async () => {
      logger.info("Executing get-ihsg-overview");
      try {
        const data = await getIHSGOverview();
        logger.info("Get IHSG overview completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error }, "Get IHSG overview failed");
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
    name: "get-forex",
    description:
      "Return current and historical forex rates from IDR into various currencies. Available currency: USD, CNY, EUR, JPY, SGD",
    parameters: z.object({
      currencies: z
        .enum(["USD", "CNY", "EUR", "JPY", "SGD"])
        .array()
        .describe("The currencies to compare against IDR"),
    }),
    execute: async (args) => {
      logger.info({ args }, "Executing get-forex");
      try {
        const result: Record<string, PriceSummaryData> = {};

        const raw = await Promise.all(
          args.currencies.map(async (currency) => {
            return {
              currency,
              data: await getForexSummary(currency),
            };
          }),
        );

        for (const each of raw) {
          result[each.currency] = each.data;
        }

        logger.info({ args }, "Get forex completed");
        return { type: "text", text: yaml.dump(result) };
      } catch (error) {
        logger.error({ error, args }, "Get forex failed");
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
    name: "get-commodity",
    description:
      "Return current and historical commodity prices in USD. Available commodity: GOLD, SILVER, OIL_WTI, OIL_BRENT, COPPER, COAL, NICKEL, CPO",
    parameters: z.object({
      commodities: z
        .enum([
          "GOLD",
          "SILVER",
          "OIL_WTI",
          "OIL_BRENT",
          "COPPER",
          "COAL",
          "NICKEL",
          "CPO",
        ])
        .array()
        .describe("The commodities name"),
    }),
    execute: async (args) => {
      logger.info({ args }, "Executing get-forex");
      try {
        const result: Record<string, PriceSummaryData> = {};

        const raw = await Promise.all(
          args.commodities.map(async (commodity) => {
            return {
              commodity,
              data: await getCommoditySummary(commodity),
            };
          }),
        );

        for (const each of raw) {
          result[each.commodity] = each.data;
        }

        logger.info({ args }, "Get commodity completed");
        return { type: "text", text: yaml.dump(result) };
      } catch (error) {
        logger.error({ error, args }, "Get commodity failed");
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
    name: "list-documents",
    description:
      "List investment documents with optional filters. Returns document snapshots (table of contents) with id, type, title, first 100 tokens of content preview, date, and symbols. Use get-document tool to retrieve full content.",
    parameters: z.object({
      limit: z
        .number()
        .describe("The search limit. Default to 10. Min is 1 and max is 100")
        .optional(),
      offset: z.string().optional(),
      symbols: z
        .string()
        .array()
        .describe(
          "Array of stock symbols represented as four-letter uppercase.",
        )
        .optional(),
      subsectors: z
        .string()
        .array()
        .describe(
          `Array of subsector. Supported slugs: ${Array.from(
            supportedSubsectors,
          ).join(", ")}`,
        )
        .optional(),
      types: z.enum(["news", "analysis", "rumour"]).array().optional(),
      date_from: z
        .string()
        .describe("Start date limit in YYYY-MM-DD format")
        .optional(),
      date_to: z
        .string()
        .describe("Start date limit in YYYY-MM-DD format")
        .optional(),
    }),
    execute: async (args) => {
      logger.info({ args }, "Executing list-documents");
      try {
        // todo don't return all
        const data = await knowledgeService.listDocuments(args);

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
    parameters: z.object({
      query: z.string().describe("The search query"),
      limit: z.number().describe("The search limit. Default to 10.").optional(),
      symbols: z
        .string()
        .array()
        .describe(
          "Array of stock symbols represented as four-letter uppercase.",
        )
        .optional(),
      subsectors: z.string().array().optional(),
      types: z.enum(["news", "analysis", "rumour"]).array().optional(),
      date_from: z
        .string()
        .describe("Start date limit in YYYY-MM-DD format")
        .optional(),
      date_to: z
        .string()
        .describe("End date limit in YYYY-MM-DD format")
        .optional(),
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

  server.addTool({
    name: "list-skills",
    description:
      "List all available stock market skills. Returns skill names and descriptions. Use get-skill to retrieve full content.",
    parameters: z.object({}),
    execute: async () => {
      logger.info("Executing list-skills");
      try {
        const data = listSkills();
        logger.info("List skills completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error }, "List skills failed");
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
    name: "get-skill",
    description:
      "Retrieve a specific stock market skill by name. Returns modular knowledge like broker information, fundamental calculation methods, etc.",
    parameters: z.object({
      name: z.string().describe("The skill name to retrieve"),
    }),
    execute: async (args) => {
      logger.info({ name: args.name }, "Executing get-skill");
      try {
        const data = getSkill(args.name);
        if (!data) {
          return {
            content: [
              {
                type: "text",
                text: `Skill '${args.name}' not found`,
              },
            ],
            isError: true,
          };
        }
        logger.info({ name: args.name }, "Get skill completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, name: args.name }, "Get skill failed");
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
