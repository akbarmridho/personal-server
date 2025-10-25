import { logger } from "@personal-server/common/utils/logger";
import { FastMCP } from "fastmcp";
import z from "zod";
import { env } from "../env.js";
import { fetchUrlContent } from "./services/crawl-page.js";
import {
  performGeneralSearch,
  performInvestmentSearch,
} from "./services/internet-search.js";

export const setupInternetMcp = async () => {
  const server = new FastMCP({
    name: "Internet Tools Server",
    version: "1.0.0",
    ping: {
      enabled: true,
      intervalMs: 25000,
      logLevel: "info",
    },
  });

  server.addTool({
    name: "general-search",
    description:
      "Performs broad, multi-step web search to find high-quality, diverse information. Use this for general queries, research, or when you need comprehensive information on any topic.",
    parameters: z.object({
      query: z
        .string()
        .describe(
          "The search query. Be specific and include relevant keywords.",
        ),
    }),
    execute: async (args) => {
      const { query } = args;
      logger.info({ query }, "Executing general search");

      try {
        const result = await performGeneralSearch({ query });
        const returnObj = {
          success: true,
          query,
          result: result.result,
          citations: result.citations,
        };

        logger.info(
          { query, citationCount: result.citations.length },
          "General search completed",
        );
        return { type: "text", text: JSON.stringify(returnObj, null, 2) };
      } catch (error) {
        logger.error({ error, query }, "General search failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  query,
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
    name: "investment-search",
    description:
      "Performs financial and investment-focused search. Analyzes market trends, stocks, economic factors, and provides market intelligence. Use this for queries about stocks, markets, economic conditions, or investment-related topics.",
    parameters: z.object({
      query: z
        .string()
        .describe(
          "The investment or financial query. Include stock symbols, market names, or economic topics.",
        ),
    }),
    execute: async (args) => {
      const { query } = args;
      logger.info({ query }, "Executing investment search");

      try {
        const result = await performInvestmentSearch({ query });
        const returnObj = {
          success: true,
          query,
          result: result.result,
          citations: result.citations,
        };

        logger.info(
          { query, citationCount: result.citations.length },
          "Investment search completed",
        );
        return { type: "text", text: JSON.stringify(returnObj, null, 2) };
      } catch (error) {
        logger.error({ error, query }, "Investment search failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  query,
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
    name: "crawl-url",
    description:
      "Fetches and extracts content from a URL. Returns the page content in markdown format. Can optionally use vision model to read page screenshots for complex layouts.",
    parameters: z.object({
      url: z
        .string()
        .url()
        .describe("The URL to fetch and extract content from."),
      readImage: z
        .boolean()
        .default(false)
        .describe(
          "If true, takes a screenshot and uses vision model to extract content. Use for complex layouts or when markdown extraction fails.",
        ),
    }),
    execute: async (args) => {
      const { url, readImage } = args;
      logger.info({ url, readImage }, "Executing URL crawl");

      try {
        const content = await fetchUrlContent({ url, readImage });
        const returnObj = {
          success: true,
          url,
          readImage,
          content,
          contentLength: content.length,
        };

        logger.info(
          { url, readImage, contentLength: content.length },
          "URL crawl completed",
        );
        return { type: "text", text: JSON.stringify(returnObj, null, 2) };
      } catch (error) {
        logger.error({ error, url }, "URL crawl failed");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  url,
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
      port: env.INTERNET_MCP_PORT,
      host: "0.0.0.0",
    },
  });

  return server;
};
