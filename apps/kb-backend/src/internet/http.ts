import { Elysia, t } from "elysia";
import { logger } from "../utils/logger.js";
import { fetchUrlContent } from "./services/crawl-page.js";
import {
  performGeneralSearch,
  performInvestmentSearch,
} from "./services/internet-search.js";

export const setupInternetRoutes = () =>
  new Elysia({ prefix: "/internet", tags: ["Internet"] })
    .post(
      "/search/general",
      async ({ body }) => {
        try {
          const result = await performGeneralSearch({ query: body.query });
          return { success: true, ...result };
        } catch (err) {
          logger.error({ err }, "General search failed");
          return { success: false, error: (err as Error).message };
        }
      },
      { body: t.Object({ query: t.String() }) },
    )
    .post(
      "/search/investment",
      async ({ body }) => {
        try {
          const result = await performInvestmentSearch({ query: body.query });
          return { success: true, ...result };
        } catch (err) {
          logger.error({ err }, "Investment search failed");
          return { success: false, error: (err as Error).message };
        }
      },
      { body: t.Object({ query: t.String() }) },
    )
    .post(
      "/crawl",
      async ({ body }) => {
        try {
          const content = await fetchUrlContent(body);
          return { success: true, content };
        } catch (err) {
          logger.error({ err }, "Crawl page failed");
          return { success: false, error: (err as Error).message };
        }
      },
      {
        body: t.Object({
          url: t.String({ format: "uri" }),
          readImage: t.Boolean({ default: false }),
        }),
      },
    );
