import { logger } from "@personal-server/common/utils/logger";
import { FastMCP } from "fastmcp";
import z from "zod";
import { env } from "../env.js";
import { GetCompaniesParams, getCompanies } from "./aggregator/companies.js";
import { getSectors } from "./aggregator/sectors.js";
import {
  GetSectorsReportParams,
  getSectorsReport,
} from "./aggregator/sectors-report.js";
import { getStockBandarmology } from "./endpoints/stock/bandarmology.js";
import { getStockFinancials } from "./endpoints/stock/financials.js";
import { getCompanyFundamental } from "./endpoints/stock/fundamental.js";
import { getStockManagement } from "./endpoints/stock/management.js";
import { getStockOwnership } from "./endpoints/stock/ownership.js";

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
        return {
          type: "text",
          text: JSON.stringify({ success: true, data }, null, 2),
        };
      } catch (error) {
        logger.error({ error }, "Get sectors failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
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
          { subsectors: args.subsectors, success: result.success },
          "Get sectors report completed",
        );
        return {
          type: "text",
          text: JSON.stringify(result, null, 2),
        };
      } catch (error) {
        logger.error(
          { error, subsectors: args.subsectors },
          "Get sectors report failed",
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
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
        logger.info(
          { args, success: result.success },
          "Get companies completed",
        );
        return {
          type: "text",
          text: JSON.stringify(result, null, 2),
        };
      } catch (error) {
        logger.error({ error, args }, "Get companies failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
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
        return {
          type: "text",
          text: JSON.stringify({ success: true, data }, null, 2),
        };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get fundamental failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
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
        return {
          type: "text",
          text: JSON.stringify({ success: true, data }, null, 2),
        };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get bandarmology failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
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
        return {
          type: "text",
          text: JSON.stringify({ success: true, data }, null, 2),
        };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get financials failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
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
        return {
          type: "text",
          text: JSON.stringify({ success: true, data }, null, 2),
        };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get management failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
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
        return {
          type: "text",
          text: JSON.stringify({ success: true, data }, null, 2),
        };
      } catch (error) {
        logger.error({ error, ticker: args.ticker }, "Get ownership failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
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
    },
  });

  return server;
};
