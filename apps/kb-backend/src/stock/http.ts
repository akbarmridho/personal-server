import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { Elysia, t } from "elysia";

dayjs.extend(utc);
dayjs.extend(timezone);

import { sectors } from "../data-modules/profiles/sector.js";
import { logger } from "../utils/logger.js";
import { getCompanies } from "./aggregator/companies.js";
import { getSectorsReport } from "./aggregator/sectors-report.js";
import { getIHSGOverview } from "./endpoints/ihsg/overview.js";
import { getStockBandarmology } from "./endpoints/stock/bandarmology.js";
import { getStockFinancials } from "./endpoints/stock/financials.js";
import { getCompanyFundamental } from "./endpoints/stock/fundamental.js";
import { getStockManagement } from "./endpoints/stock/management.js";
import { getStockOwnership } from "./endpoints/stock/ownership.js";
import { getStockTechnicals } from "./endpoints/stock/technicals.js";
import { getCommoditySummary } from "./other-prices/commodity.js";
import { getForexSummary } from "./other-prices/forex.js";
import { getBottomFishingSignal } from "./skills/catalog/bottom-fishing-playbook.js";
import { getGCStochPSARSignal } from "./skills/catalog/gc-oversold-playbook.js";
import { stockbitAuth } from "./stockbit/auth.js";
import { removeKeysRecursive } from "./utils.js";

export const setupStockRoutes = () =>
  new Elysia({ prefix: "/stock-market-id", tags: ["Stock Market (Indonesia)"] })
    .get("/sectors", async ({ set }) => {
      try {
        const subsectors = removeKeysRecursive(sectors, ["industries"]);

        return { success: true, data: subsectors };
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
            : { symbols: query.symbols!.split(",") };
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
          symbols: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/stock/:symbol/fundamental",
      async ({ params, set }) => {
        try {
          const data = await getCompanyFundamental(params.symbol);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get fundamental failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      { params: t.Object({ symbol: t.String() }) },
    )
    .get(
      "/stock/:symbol/bandarmology",
      async ({ params, query, set }) => {
        try {
          const period = query.period || "1m";
          const data = await getStockBandarmology(params.symbol, period);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get bandarmology failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        params: t.Object({ symbol: t.String() }),
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
      "/stock/:symbol/financials",
      async ({ params, query, set }) => {
        try {
          const reportType = query.reportType || "income-statement";
          const statementType = query.statementType || "quarterly";
          const data = await getStockFinancials({
            symbol: params.symbol,
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
        params: t.Object({ symbol: t.String() }),
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
      "/stock/:symbol/management",
      async ({ params, set }) => {
        try {
          const data = await getStockManagement(params.symbol);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get management failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      { params: t.Object({ symbol: t.String() }) },
    )
    .get(
      "/stock/:symbol/ownership",
      async ({ params, set }) => {
        try {
          const data = await getStockOwnership(params.symbol);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get ownership failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      { params: t.Object({ symbol: t.String() }) },
    )
    .get(
      "/stock/:symbol/technical",
      async ({ params, set }) => {
        try {
          const data = await getStockTechnicals(params.symbol);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get technicals failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      { params: t.Object({ symbol: t.String() }) },
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
      "/playbook/gc-oversold/:symbol",
      async ({ params, query, set }) => {
        try {
          const asOfDate = query.asOf
            ? dayjs.tz(query.asOf, "Asia/Jakarta").toDate()
            : dayjs().tz("Asia/Jakarta").toDate();
          const data = await getGCStochPSARSignal(params.symbol, asOfDate);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get GC Oversold signal failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        params: t.Object({ symbol: t.String() }),
        query: t.Object({ asOf: t.Optional(t.String()) }),
      },
    )
    .get(
      "/playbook/bottom-fishing/:symbol",
      async ({ params, query, set }) => {
        try {
          const asOfDate = query.asOf
            ? dayjs.tz(query.asOf, "Asia/Jakarta").toDate()
            : dayjs().tz("Asia/Jakarta").toDate();
          const data = await getBottomFishingSignal(params.symbol, asOfDate);
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get Bottom Fishing signal failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        params: t.Object({ symbol: t.String() }),
        query: t.Object({ asOf: t.Optional(t.String()) }),
      },
    );
