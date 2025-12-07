import axios from "axios";
import dayjs from "dayjs";
import z from "zod";
import { KV } from "../../db/kv.js";
import { env } from "../../infrastructure/env.js";
import { logger } from "../../utils/logger.js";
import { normalizeSlug, withMemoryCache } from "../utils.js";
import { supportedSubsectors } from "./sectors.js";

interface RawCompany {
  ticker: string;
  sector: string;
  subsector: string;
  subsectorSlug: string;
  companyName: string;
}

/**
 * Raw company fetching function (without cache)
 */
async function fetchRawCompanies(): Promise<RawCompany[]> {
  const responseData = await KV.getOrSet(
    "stock.aggregator.companies",
    async () => {
      const response = await axios.get(env.AGGREGATOR_COMPANIES_ENDPOINT, {
        headers: {
          ...JSON.parse(env.AGGREGATOR_AUTH),
          "Content-Type": "application/json",
        },
      });

      return response.data;
    },
    dayjs().add(1, "week").toDate(),
    true,
  );

  return (
    responseData as {
      sector: string;
      sub_sector: string;
      symbol: string;
      company_name: string;
    }[]
  ).map((e) => ({
    ticker: e.symbol.toUpperCase().replaceAll(".JK", ""),
    sector: e.sector,
    subsector: e.sub_sector,
    subsectorSlug: normalizeSlug(e.sub_sector),
    companyName: e.company_name,
  }));
}

/**
 * Cached version of fetchRawCompanies (30 minutes TTL)
 */
export const getRawCompanies = withMemoryCache(
  fetchRawCompanies,
  30 * 60 * 1000,
);

export const GetCompaniesParams = z
  .object({
    subsectors: z
      .string()
      .array()
      .describe(
        `Array of subsector slugs. Supported slugs: ${Array.from(
          supportedSubsectors,
        ).join(", ")}`,
      )
      .optional(),
    tickers: z
      .string()
      .array()
      .describe("Array of stock ticker symbols")
      .optional(),
  })
  .refine((data) => data.subsectors || data.tickers, {
    message: "Either subsectors or tickers must be provided",
  });

export const getCompanies = async (
  input: z.infer<typeof GetCompaniesParams>,
): Promise<
  { success: true; data: any } | { success: false; message: string }
> => {
  try {
    const data = await getRawCompanies();

    if (input.subsectors) {
      const normalizedInput = input.subsectors.map((s) =>
        supportedSubsectors.has(s) ? s : normalizeSlug(s),
      );

      const invalidSlugs = normalizedInput.filter(
        (s) => !supportedSubsectors.has(s),
      );

      if (invalidSlugs.length > 0) {
        return {
          success: false,
          message: `Invalid subsectors. Supported slugs: ${Array.from(
            supportedSubsectors,
          ).join(", ")}`,
        };
      }

      const filtered = data
        .filter((item) =>
          normalizedInput.includes(normalizeSlug(item.subsector)),
        )
        .sort((a, b) => a.ticker.localeCompare(b.ticker));

      return { success: true, data: filtered };
    } else if (input.tickers) {
      const normalizedTickers = input.tickers.map((e) =>
        e.toUpperCase().replaceAll(".JK", ""),
      );

      const filtered = data
        .filter((item) => normalizedTickers.includes(item.ticker))
        .sort((a, b) => a.ticker.localeCompare(b.ticker));

      return { success: true, data: filtered };
    }

    return {
      success: false,
      message: "Either tickers or subsectors must be set",
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to get companies");
    return { success: false, message: "Failed to get companies" };
  }
};

export const checkTicker = async (ticker: string): Promise<string> => {
  const data = await getRawCompanies();

  const normalized = ticker.toUpperCase().replaceAll(".JK", "");

  if (data.map((e) => e.ticker).includes(normalized)) {
    return normalized;
  }

  throw new Error(`Ticker ${ticker} not found`);
};
