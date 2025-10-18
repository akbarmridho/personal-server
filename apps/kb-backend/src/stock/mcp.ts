import { logger } from "@personal-server/common/utils/logger";
import { FastMCP } from "fastmcp";
import z from "zod";
import { env } from "../env.js";
import { GetCompaniesParams, getCompanies } from "./aggregator/companies.js";
import {
  GetCompanyReportParams,
  getCompanyReport,
} from "./aggregator/company-report.js";
import { getSectors } from "./aggregator/sectors.js";
import {
  GetSectorsReportParams,
  getSectorsReport,
} from "./aggregator/sectors-report.js";

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
    name: "get-company-report",
    description:
      "Returns detailed report for a specific company ticker. Use get-companies first to find valid tickers.",
    parameters: GetCompanyReportParams,
    execute: async (args) => {
      logger.info({ ticker: args.ticker }, "Executing get-company-report");
      try {
        const result = await getCompanyReport(args);
        logger.info(
          { ticker: args.ticker, success: result.success },
          "Get company report completed",
        );
        return {
          type: "text",
          text: JSON.stringify(result, null, 2),
        };
      } catch (error) {
        logger.error(
          { error, ticker: args.ticker },
          "Get company report failed",
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
