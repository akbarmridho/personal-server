import { logger } from "@personal-server/common/utils/logger";
import { Elysia, t } from "elysia";
import { getCompanies } from "./aggregator/companies.js";
import { getCompanyReport } from "./aggregator/company-report.js";
import { getSectors } from "./aggregator/sectors.js";
import { getSectorsReport } from "./aggregator/sectors-report.js";

export const setupStockRoutes = () =>
  new Elysia({ prefix: "/stock", tags: ["Stock"] })
    .get("/sectors", async ({ set }) => {
      try {
        const data = getSectors();
        return { success: true, data };
      } catch (err) {
        logger.error({ err }, "Get sectors failed");
        set.status = 500;
        return { success: false, error: (err as Error).message };
      }
    })
    .post(
      "/sectors/report",
      async ({ body, set }) => {
        try {
          const result = await getSectorsReport(body);
          if (!result.success) set.status = 400;
          return result;
        } catch (err) {
          logger.error({ err }, "Get sectors report failed");
          set.status = 500;
          return { success: false, message: (err as Error).message };
        }
      },
      { body: t.Object({ subsectors: t.Array(t.String()) }) },
    )
    .post(
      "/companies",
      async ({ body, set }) => {
        try {
          const result = await getCompanies(body);
          if (!result.success) set.status = 400;
          return result;
        } catch (err) {
          logger.error({ err }, "Get companies failed");
          set.status = 500;
          return { success: false, message: (err as Error).message };
        }
      },
      {
        body: t.Union([
          t.Object({ subsectors: t.Array(t.String()) }),
          t.Object({ tickers: t.Array(t.String()) }),
        ]),
      },
    )
    .post(
      "/company/report",
      async ({ body, set }) => {
        try {
          const result = await getCompanyReport(body);
          if (!result.success) set.status = 400;
          return result;
        } catch (err) {
          logger.error({ err }, "Get company report failed");
          set.status = 500;
          return { success: false, message: (err as Error).message };
        }
      },
      {
        body: t.Object({
          ticker: t.String(),
          fields: t.Object({
            ownership: t.Boolean(),
            management: t.Boolean(),
            news: t.Boolean(),
            futureOutlook: t.Boolean(),
            comparePeers: t.Boolean(),
            dividendHistory: t.Boolean(),
            financialsHistory: t.Boolean(),
            valuationHistory: t.Boolean(),
          }),
        }),
      },
    );
