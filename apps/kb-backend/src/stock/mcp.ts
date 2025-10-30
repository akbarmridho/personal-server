import { logger } from "@personal-server/common/utils/logger";
import { FastMCP } from "fastmcp";
import yaml from "js-yaml";
import z from "zod";
import { env } from "../env.js";
import { GetCompaniesParams, getCompanies } from "./aggregator/companies.js";
import { getSectors } from "./aggregator/sectors.js";
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
      try {
        const data = getSectors();
        logger.info({ count: data.length }, "Get sectors completed");
        return { type: "text", text: yaml.dump(data) };
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
      "Returns companies filtered by subsectors or tickers. Provide either subsectors array or tickers array.",
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
    description: "Returns fundamental data for a specific stock ticker.",
    parameters: z.object({ ticker: z.string() }),
    execute: async (args) => {
      logger.info({ ticker: args.ticker }, "Executing get-stock-fundamental");
      try {
        const data = await getCompanyFundamental(args.ticker);
        logger.info({ ticker: args.ticker }, "Get fundamental completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get fundamental failed");
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
    description: "Returns market detector data for a specific stock ticker.",
    parameters: z.object({
      ticker: z.string(),
      period: z.enum(["1d", "1w", "1m", "3m", "1y"]),
    }),
    execute: async (args) => {
      logger.info(
        { ticker: args.ticker, period: args.period },
        "Executing get-stock-bandarmology",
      );
      try {
        const data = await getStockBandarmology(args.ticker, args.period);
        logger.info({ ticker: args.ticker }, "Get bandarmology completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get bandarmology failed");
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
    description: "Returns financial statements for a specific stock ticker.",
    parameters: z.object({
      ticker: z.string(),
      reportType: z.enum(["income-statement", "balance-sheet", "cash-flow"]),
      statementType: z.enum(["quarterly", "annually", "ttm"]),
    }),
    execute: async (args) => {
      logger.info(
        {
          ticker: args.ticker,
          reportType: args.reportType,
          statementType: args.statementType,
        },
        "Executing get-stock-financials",
      );
      try {
        const data = await getStockFinancials(args);
        logger.info({ ticker: args.ticker }, "Get financials completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get financials failed");
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
    name: "get-stock-management",
    description:
      "Returns management and executive data for a specific stock ticker.",
    parameters: z.object({ ticker: z.string() }),
    execute: async (args) => {
      logger.info({ ticker: args.ticker }, "Executing get-stock-management");
      try {
        const data = await getStockManagement(args.ticker);
        logger.info({ ticker: args.ticker }, "Get management completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get management failed");
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
    name: "get-stock-ownership",
    description:
      "Returns ownership and insider activity data for a specific stock ticker.",
    parameters: z.object({ ticker: z.string() }),
    execute: async (args) => {
      logger.info({ ticker: args.ticker }, "Executing get-stock-ownership");
      try {
        const data = await getStockOwnership(args.ticker);
        logger.info({ ticker: args.ticker }, "Get ownership completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get ownership failed");
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
      "Returns technical analysis data for a specific stock ticker including indicators, patterns, and seasonality.",
    parameters: z.object({ ticker: z.string() }),
    execute: async (args) => {
      logger.info({ ticker: args.ticker }, "Executing get-stock-technical");
      try {
        const data = await getStockTechnicals(args.ticker);
        logger.info({ ticker: args.ticker }, "Get technicals completed");
        return { type: "text", text: yaml.dump(data) };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get technicals failed");
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
