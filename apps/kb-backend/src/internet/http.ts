import { logger } from "@personal-server/common/utils/logger";
import { Elysia } from "elysia";
import z from "zod";
import {
  FetchUrlContentSchema,
  fetchUrlContent,
} from "./services/crawl-page.js";
import {
  performGeneralSearch,
  performInvestmentSearch,
} from "./services/internet-search.js";

const SearchBody = z.object({
  query: z.string(),
});

export const setupInternetRoutes = () =>
  new Elysia({ prefix: "/internet" })
    .post(
      "/search/general",
      async ({ body }: { body: z.infer<typeof SearchBody> }) => {
        try {
          const result = await performGeneralSearch({ query: body.query });
          return { success: true, ...result };
        } catch (err) {
          logger.error({ err }, "General search failed");
          return { success: false, error: (err as Error).message };
        }
      },
      { body: SearchBody },
    )
    .post(
      "/search/investment",
      async ({ body }: { body: z.infer<typeof SearchBody> }) => {
        try {
          const result = await performInvestmentSearch({ query: body.query });
          return { success: true, ...result };
        } catch (err) {
          logger.error({ err }, "Investment search failed");
          return { success: false, error: (err as Error).message };
        }
      },
      { body: SearchBody },
    )
    .post(
      "/crawl",
      async ({ body }: { body: z.infer<typeof FetchUrlContentSchema> }) => {
        try {
          const content = await fetchUrlContent(body);
          return { success: true, content };
        } catch (err) {
          logger.error({ err }, "Crawl page failed");
          return { success: false, error: (err as Error).message };
        }
      },
      { body: FetchUrlContentSchema },
    );
