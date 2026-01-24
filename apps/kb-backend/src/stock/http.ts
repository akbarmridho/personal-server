import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { Elysia, t } from "elysia";

dayjs.extend(utc);
dayjs.extend(timezone);

import { sectors } from "../data-modules/profiles/sector.js";
import { KV } from "../infrastructure/db/kv.js";
import { inngest } from "../infrastructure/inngest.js";
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
import { getBottomFishingSignal } from "./skills/catalog/bottom-fishing-playbook.js";
import { getGCStochPSARSignal } from "./skills/catalog/gc-oversold-playbook.js";
import { stockbitAuth } from "./stockbit/auth.js";
import { removeKeysRecursive } from "./utils.js";

export const setupStockRoutes = () =>
  new Elysia({ prefix: "/stock-market-id" })
    .get(
      "/sectors",
      async ({ set }) => {
        try {
          const subsectors = removeKeysRecursive(sectors, ["industries"]);

          return { success: true, data: subsectors };
        } catch (err) {
          logger.error({ err }, "Get sectors failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        detail: {
          tags: ["Sectors & Companies"],
          summary: "Get all sectors and subsectors",
          description:
            "Returns the list of all sectors and subsectors in the Indonesian stock market",
        },
      },
    )
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
      {
        query: t.Object({ subsectors: t.String() }),
        detail: {
          tags: ["Sectors & Companies"],
          summary: "Get sector performance report",
          description:
            "Returns performance metrics for specified subsectors including top gainers and losers",
        },
      },
    )
    .get(
      "/stock",
      async ({ query, set }) => {
        try {
          // If no query params, return all companies
          if (!query.subsectors && !query.symbols) {
            const result = await getCompanies({});
            if (!result.success) set.status = 400;
            return result;
          }

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
        detail: {
          tags: ["Sectors & Companies"],
          summary: "Get companies by subsector or symbol",
          description:
            "Returns list of companies filtered by subsectors or specific symbols. Returns all companies if no filters specified.",
        },
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
      {
        params: t.Object({ symbol: t.String() }),
        detail: {
          tags: ["Stock Fundamentals"],
          summary: "Get stock fundamental data",
          description:
            "Returns fundamental analysis data for a stock including valuation metrics, growth rates, and financial ratios",
        },
      },
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
        detail: {
          tags: ["Stock Technical Analysis"],
          summary: "Get stock bandarmology data",
          description:
            "Returns bandarmology (smart money) analysis including foreign/domestic flow, broker activity, and accumulation/distribution patterns",
        },
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
        detail: {
          tags: ["Stock Fundamentals"],
          summary: "Get stock financial statements",
          description:
            "Returns income statement, balance sheet, or cash flow data. Supports quarterly, annual, and TTM (trailing twelve months) views.",
        },
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
      {
        params: t.Object({ symbol: t.String() }),
        detail: {
          tags: ["Stock Fundamentals"],
          summary: "Get stock management team",
          description:
            "Returns information about the company's board of directors and key management personnel",
        },
      },
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
      {
        params: t.Object({ symbol: t.String() }),
        detail: {
          tags: ["Stock Fundamentals"],
          summary: "Get stock ownership structure",
          description:
            "Returns major shareholders and ownership distribution including institutional and insider holdings",
        },
      },
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
      {
        params: t.Object({ symbol: t.String() }),
        detail: {
          tags: ["Stock Technical Analysis"],
          summary: "Get stock technical indicators",
          description:
            "Returns technical analysis indicators including moving averages, RSI, MACD, Bollinger Bands, and price action patterns",
        },
      },
    )
    .get(
      "/ihsg/technical",
      async ({ set }) => {
        try {
          const data = await getIHSGOverview();
          return { success: true, data };
        } catch (err) {
          logger.error({ err }, "Get IHSG Overview failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        detail: {
          tags: ["Market Data"],
          summary: "Get IHSG (Indonesian Composite Index) technical overview",
          description:
            "Returns technical analysis of the IHSG index including trend indicators and market sentiment",
        },
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
        detail: {
          tags: ["Authentication"],
          summary: "Set Stockbit access token",
          description:
            "Stores Stockbit API access token for authenticated requests to Stockbit services",
        },
      },
    )
    .get(
      "/stockbit-auth/test",
      async ({ set }) => {
        try {
          await stockbitAuth.test();
          return { success: true };
        } catch (err) {
          logger.error({ err }, "Test auth failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        detail: {
          tags: ["Authentication"],
          summary: "Test Stockbit authentication",
          description:
            "Validates the stored Stockbit access token by making a test API request",
        },
      },
    )
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
        detail: {
          tags: ["Trading Playbooks"],
          summary: "Golden Cross + Oversold playbook signal",
          description:
            "Returns swing trading setup combining Golden Cross, Stochastic Oversold, and PSAR indicators. Phases: FORMING, READY, TRIGGERED, ACTIVE.",
        },
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
        detail: {
          tags: ["Trading Playbooks"],
          summary: "Bottom fishing playbook signal",
          description:
            "Returns market crash reversal signals using weekly RSI, volume spikes, and Heikin Ashi patterns. Phases: WATCHING, MINOR_OPPORTUNITY, MAJOR_ALERT, CAPITULATION_DETECTED, REVERSAL_CONFIRMED.",
        },
      },
    )
    // Stock Universe Management
    .post(
      "/stock-universe/add",
      async ({ body, set }) => {
        try {
          const STOCK_UNIVERSE_KEY =
            "data-modules.stockbit-filing.stock-universe";

          // Validate and normalize symbols
          const symbols = body.symbols
            .map((s) => s.trim().toUpperCase())
            .filter((s) => s.length > 0);

          if (symbols.length === 0) {
            set.status = 400;
            return {
              success: false,
              error: "No valid symbols provided",
            };
          }

          // Get current stock universe
          const universe = (await KV.get(STOCK_UNIVERSE_KEY)) as {
            symbols: string[];
          } | null;
          const currentSymbols = universe?.symbols || [];

          // Determine which symbols are new
          const newSymbols = symbols.filter((s) => !currentSymbols.includes(s));
          const existingSymbols = symbols.filter((s) =>
            currentSymbols.includes(s),
          );

          // Update stock universe
          const updatedSymbols = [
            ...new Set([...currentSymbols, ...newSymbols]),
          ];
          await KV.set(STOCK_UNIVERSE_KEY, { symbols: updatedSymbols });

          logger.info(
            `Added ${newSymbols.length} new symbols to stock universe: ${newSymbols.join(", ")}`,
          );

          // Emit crawl events for NEW symbols only
          if (newSymbols.length > 0) {
            await inngest.send(
              newSymbols.map((symbol) => ({
                name: "data/stockbit-filing-crawl",
                data: { symbol },
              })),
            );

            logger.info(
              `Emitted crawl events for ${newSymbols.length} new symbols`,
            );
          }

          return {
            success: true,
            added: newSymbols,
            existing: existingSymbols,
            total: updatedSymbols.length,
            message: `Added ${newSymbols.length} new symbol(s), ${existingSymbols.length} already existed. Total: ${updatedSymbols.length}`,
          };
        } catch (err) {
          logger.error({ err }, "Error adding symbols to stock universe");
          set.status = 500;
          return {
            success: false,
            error: (err as Error).message,
          };
        }
      },
      {
        body: t.Object({
          symbols: t.Array(t.String(), {
            description:
              'Array of stock symbols to add (e.g., ["BBCA", "TLKM"])',
          }),
        }),
        detail: {
          tags: ["Stock Universe Management"],
          summary: "Add symbols to stock universe and trigger sync",
          description:
            "Adds new stock symbols to the tracked universe and immediately triggers filing crawl for newly added symbols. Existing symbols are not re-crawled.",
        },
      },
    )
    .post(
      "/stock-universe/sync-all",
      async ({ set }) => {
        try {
          const STOCK_UNIVERSE_KEY =
            "data-modules.stockbit-filing.stock-universe";

          // Get current stock universe
          const universe = (await KV.get(STOCK_UNIVERSE_KEY)) as {
            symbols: string[];
          } | null;

          if (!universe || universe.symbols.length === 0) {
            return {
              success: true,
              symbols: [],
              count: 0,
              message:
                "Stock universe is empty. Add symbols first using /stock-universe/add",
            };
          }

          // Emit crawl events for all symbols
          await inngest.send(
            universe.symbols.map((symbol) => ({
              name: "data/stockbit-filing-crawl",
              data: { symbol },
            })),
          );

          logger.info(
            `Triggered sync for ${universe.symbols.length} symbols: ${universe.symbols.join(", ")}`,
          );

          return {
            success: true,
            symbols: universe.symbols,
            count: universe.symbols.length,
            message: `Triggered sync for ${universe.symbols.length} symbol(s)`,
          };
        } catch (err) {
          logger.error({ err }, "Error syncing stock universe");
          set.status = 500;
          return {
            success: false,
            error: (err as Error).message,
          };
        }
      },
      {
        detail: {
          tags: ["Stock Universe Management"],
          summary: "Sync all symbols in stock universe",
          description:
            "Triggers filing crawl for all symbols currently in the stock universe. This will check for new filings across all three categories (RUPS, Corporate Action, Other) for each symbol.",
        },
      },
    )
    .post(
      "/stock-universe/sync/:symbol",
      async ({ params, set }) => {
        try {
          const STOCK_UNIVERSE_KEY =
            "data-modules.stockbit-filing.stock-universe";

          // Normalize symbol to uppercase
          const symbol = params.symbol.trim().toUpperCase();

          if (!symbol) {
            set.status = 400;
            return {
              success: false,
              error: "Symbol parameter is required",
            };
          }

          // Get current stock universe
          const universe = (await KV.get(STOCK_UNIVERSE_KEY)) as {
            symbols: string[];
          } | null;

          if (!universe || universe.symbols.length === 0) {
            set.status = 404;
            return {
              success: false,
              error:
                "Stock universe is empty. Add symbols first using /stock-universe/add",
            };
          }

          // Check if symbol exists in stock universe
          if (!universe.symbols.includes(symbol)) {
            set.status = 404;
            return {
              success: false,
              error: `Symbol "${symbol}" not found in stock universe. Please add it first using /stock-universe/add`,
              availableSymbols: universe.symbols,
            };
          }

          // Emit crawl event for the specific symbol
          await inngest.send({
            name: "data/stockbit-filing-crawl",
            data: { symbol },
          });

          logger.info(`Triggered sync for symbol: ${symbol}`);

          return {
            success: true,
            symbol,
            message: `Triggered sync for symbol "${symbol}"`,
          };
        } catch (err) {
          logger.error({ err }, "Error syncing symbol");
          set.status = 500;
          return {
            success: false,
            error: (err as Error).message,
          };
        }
      },
      {
        params: t.Object({ symbol: t.String() }),
        detail: {
          tags: ["Stock Universe Management"],
          summary: "Sync specific symbol from stock universe",
          description:
            "Triggers filing crawl for a specific symbol that exists in the stock universe. The symbol must already be in the universe (use /stock-universe/add first). This will check for new filings across all three categories (RUPS, Corporate Action, Other) for the specified symbol.",
        },
      },
    )
    .get(
      "/stock-universe/list",
      async ({ set }) => {
        try {
          const STOCK_UNIVERSE_KEY =
            "data-modules.stockbit-filing.stock-universe";

          const universe = (await KV.get(STOCK_UNIVERSE_KEY)) as {
            symbols: string[];
          } | null;

          return {
            success: true,
            symbols: universe?.symbols || [],
            count: universe?.symbols.length || 0,
          };
        } catch (err) {
          logger.error({ err }, "Error listing stock universe");
          set.status = 500;
          return {
            success: false,
            error: (err as Error).message,
          };
        }
      },
      {
        detail: {
          tags: ["Stock Universe Management"],
          summary: "List all symbols in stock universe",
          description:
            "Returns the complete list of stock symbols currently being tracked for filing ingestion.",
        },
      },
    );
