import { logger } from "@personal-server/common/utils/logger";
import { FastMCP } from "fastmcp";
import yaml from "js-yaml";
import z from "zod";
import { env } from "../env.js";
import { fetchUrlContent } from "./services/crawl-page.js";
import { performInvestmentSearch } from "./services/internet-search.js";

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
    name: "investment-search",
    description:
      "Performs financial and investment-focused search. Analyzes market trends, stocks, economic factors, and provides market intelligence. Use this for queries about stocks, markets, economic conditions, or investment-related topics.",
    parameters: z.object({
      queries: z
        .string()
        .array()
        .describe(
          "The investment or financial queries. Include stock symbols, market names, or economic topics.",
        ),
    }),
    execute: async (args) => {
      const { queries } = args;
      logger.info({ queries }, "Executing investment search");

      const query = `Perform research for the following queries:\n${queries.map((q) => `- ${q}`).join("\n")}`;

      try {
        const result = await performInvestmentSearch({ query });
        const returnObj = {
          result: result.result,
          citations: result.citations,
        };

        logger.info(
          { query, citationCount: result.citations.length },
          "Investment search completed",
        );
        return { type: "text", text: yaml.dump(returnObj) };
      } catch (error) {
        logger.error({ error, query }, "Investment search failed");
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
          readImage,
          content,
        };

        logger.info(
          { url, readImage, contentLength: content.length },
          "URL crawl completed",
        );
        return { type: "text", text: yaml.dump(returnObj) };
      } catch (error) {
        logger.error({ error, url }, "URL crawl failed");
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
      port: env.INTERNET_MCP_PORT,
      host: "0.0.0.0",
    },
  });

  return server;
};
