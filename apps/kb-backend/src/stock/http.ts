import { logger } from "@personal-server/common/utils/logger";
import { Elysia, t } from "elysia";
import { getCompanies } from "./aggregator/companies.js";
import { getSectors } from "./aggregator/sectors.js";
import { getSectorsReport } from "./aggregator/sectors-report.js";
import { getIHSGOverview } from "./endpoints/ihsg/overview.js";
import { getStockBandarmology } from "./endpoints/stock/bandarmology.js";
import { getStockFinancials } from "./endpoints/stock/financials.js";
import { getCompanyFundamental } from "./endpoints/stock/fundamental.js";
import { getStockManagement } from "./endpoints/stock/management.js";
import { getStockOwnership } from "./endpoints/stock/ownership.js";
import { getStockTechnicals } from "./endpoints/stock/technicals.js";
import {
  getWeeklyMoodData,
  mergeWeeklyMoodData,
} from "./news-summary/weekly-mood.js";
import { getCommoditySummary } from "./other-prices/commodity.js";
import { getForexSummary } from "./other-prices/forex.js";
import { stockbitAuth } from "./stockbit/auth.js";

export const setupStockRoutes = () =>
  new Elysia({ prefix: "/stock-market-id", tags: ["Stock Market (Indonesia)"] })
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
    .get(
      "/sectors/report",
      async ({ query, set }) => {
        try {
          const subsectors = query.subsectors?.split(",") || [];
          const result = await getSectorsReport({ subsectors });
          if (!result.success) set.status = 400;
          return result;
        } catch (err) {
          logger.error({ err }, "Get sectors report failed");
          set.status = 500;
          return { success: false, message: (err as Error).message };
        }
      },
      { query: t.Object({ subsectors: t.String() }) },
    )
    .get(
      "/stock",
      async ({ query, set }) => {
        try {
          const body = query.subsectors
            ? { subsectors: query.subsectors.split(",") }
            : { tickers: query.tickers!.split(",") };
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
        query: t.Object({
          subsectors: t.Optional(t.String()),
          tickers: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/stock/:ticker/fundamental",
      async ({ params, set }) => {
        try {
          const data = await getCompanyFundamental(params.ticker);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get fundamental failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      { params: t.Object({ ticker: t.String() }) },
    )
    .get(
      "/stock/:ticker/bandarmology",
      async ({ params, query, set }) => {
        try {
          const period = query.period || "1m";
          const data = await getStockBandarmology(params.ticker, period);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get bandarmology failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        params: t.Object({ ticker: t.String() }),
        query: t.Object({
          period: t.Optional(
            t.Union([
              t.Literal("1d"),
              t.Literal("1w"),
              t.Literal("1m"),
              t.Literal("3m"),
              t.Literal("1y"),
            ]),
          ),
        }),
      },
    )
    .get(
      "/stock/:ticker/financials",
      async ({ params, query, set }) => {
        try {
          const reportType = query.reportType || "income-statement";
          const statementType = query.statementType || "quarterly";
          const data = await getStockFinancials({
            ticker: params.ticker,
            reportType,
            statementType,
          });
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get financials failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        params: t.Object({ ticker: t.String() }),
        query: t.Object({
          reportType: t.Optional(
            t.Union([
              t.Literal("income-statement"),
              t.Literal("balance-sheet"),
              t.Literal("cash-flow"),
            ]),
          ),
          statementType: t.Optional(
            t.Union([
              t.Literal("quarterly"),
              t.Literal("annually"),
              t.Literal("ttm"),
            ]),
          ),
        }),
      },
    )
    .get(
      "/stock/:ticker/management",
      async ({ params, set }) => {
        try {
          const data = await getStockManagement(params.ticker);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get management failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      { params: t.Object({ ticker: t.String() }) },
    )
    .get(
      "/stock/:ticker/ownership",
      async ({ params, set }) => {
        try {
          const data = await getStockOwnership(params.ticker);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get ownership failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      { params: t.Object({ ticker: t.String() }) },
    )
    .get(
      "/stock/:ticker/technical",
      async ({ params, set }) => {
        try {
          const data = await getStockTechnicals(params.ticker);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get technicals failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      { params: t.Object({ ticker: t.String() }) },
    )
    .get("/ihsg/technical", async ({ set }) => {
      try {
        const data = await getIHSGOverview();
        return { success: true, data };
      } catch (err) {
        logger.error({ err }, "Get IHSG Overview failed");
        set.status = 500;
        return { success: false, error: (err as Error).message };
      }
    })
    .get(
      "/forex",
      async ({ query, set }) => {
        try {
          const data = await getForexSummary(query.currency);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get forex failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        query: t.Object({
          currency: t.Union([
            t.Literal("USD"),
            t.Literal("CNY"),
            t.Literal("EUR"),
            t.Literal("JPY"),
            t.Literal("SGD"),
          ]),
        }),
      },
    )
    .get(
      "/commodity",
      async ({ query, set }) => {
        try {
          const data = await getCommoditySummary(query.commodity);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get commodity failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        query: t.Object({
          commodity: t.Union([
            t.Literal("GOLD"),
            t.Literal("SILVER"),
            t.Literal("OIL_WTI"),
            t.Literal("OIL_BRENT"),
            t.Literal("COPPER"),
            t.Literal("COAL"),
            t.Literal("NICKEL"),
            t.Literal("CPO"),
          ]),
        }),
      },
    )
    .post(
      "/stockbit-auth/set",
      async ({ body, set }) => {
        try {
          await stockbitAuth.set(body);
          return { success: true };
        } catch (err) {
          logger.error({ err }, "Set auth failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        body: t.Object({
          // refreshToken: t.String(),
          // refreshExpiredAt: t.String(),
          accessToken: t.String(),
          // accessExpiredAt: t.String(),
        }),
      },
    )
    .get("/stockbit-auth/test", async ({ set }) => {
      try {
        await stockbitAuth.test();
        return { success: true };
      } catch (err) {
        logger.error({ err }, "Test auth failed");
        set.status = 500;
        return { success: false, error: (err as Error).message };
      }
    })
    .get(
      "/weekly-mood",
      async ({ set }) => {
        try {
          return { success: true, data: await getWeeklyMoodData(100) };
        } catch (err) {
          logger.error({ err }, "Get weekly mood failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        body: t.Object({
          data: t.Array(
            t.Object({
              date: t.String(),
              content: t.String(),
            }),
          ),
        }),
      },
    )
    .post(
      "/weekly-mood/merge",
      async ({ body, set }) => {
        try {
          await mergeWeeklyMoodData(body.data);
          return { success: true };
        } catch (err) {
          logger.error({ err }, "Merge weekly mood failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        body: t.Object({
          data: t.Array(
            t.Object({
              date: t.String(),
              content: t.String(),
            }),
          ),
        }),
      },
    );
// .post("/stockbit-auth/refresh", async ({ set }) => {
//   try {
//     await stockbitAuth.refresh();
//     return { success: true };
//   } catch (err) {
//     logger.error({ err }, "Refresh auth failed");
//     set.status = 500;
//     return { success: false, error: (err as Error).message };
//   }
// });
