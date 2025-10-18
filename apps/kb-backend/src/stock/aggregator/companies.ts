import { logger } from "@personal-server/common/utils/logger";
import axios from "axios";
import dayjs from "dayjs";
import z from "zod";
import { KV } from "../../db/kv.js";
import { env } from "../../env.js";
import { supportedSubsectors } from "./sectors.js";
import { normalizeSlug } from "./utils.js";

interface RawCompany {
  ticker: string;
  sector: string;
  subsector: string;
  subsectorSlug: string;
  companyName: string;
}

let memoryCache: { data: RawCompany[]; expiresAt: number } | null = null;

export const getRawCompanies = async (): Promise<RawCompany[]> => {
  if (memoryCache && Date.now() < memoryCache.expiresAt) {
    return memoryCache.data;
  }

  const data = (
    (await KV.getOrSet(
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
    )) as {
      sector: string;
      sub_sector: string;
      symbol: string;
      company_name: string;
    }[]
  ).map((e) => {
    return {
      ticker: e.symbol.toUpperCase().replaceAll(".JK", ""),
      sector: e.sector,
      subsector: e.sub_sector,
      subsectorSlug: normalizeSlug(e.sub_sector),
      companyName: e.company_name,
    };
  });

  memoryCache = { data, expiresAt: Date.now() + 30 * 60 * 1000 };

  return data;
};

export const GetCompaniesParams = z.union([
  z.object({
    subsectors: z
      .string()
      .array()
      .describe(
        `Array of subsector slugs. Supported slugs: ${Array.from(supportedSubsectors).join(", ")}`,
      ),
  }),
  z.object({
    tickers: z.string().array().describe("Array of stock ticker symbols"),
  }),
]);

export const getCompanies = async (
  input: z.infer<typeof GetCompaniesParams>,
): Promise<
  { success: true; data: any } | { success: false; message: string }
> => {
  try {
    const data = await getRawCompanies();

    if ("subsectors" in input) {
      const normalizedInput = input.subsectors.map((s) =>
        supportedSubsectors.has(s) ? s : normalizeSlug(s),
      );

      const invalidSlugs = normalizedInput.filter(
        (s) => !supportedSubsectors.has(s),
      );

      if (invalidSlugs.length > 0) {
        return {
          success: false,
          message: `Invalid subsectors. Supported slugs: ${Array.from(supportedSubsectors).join(", ")}`,
        };
      }

      const filtered = data
        .filter((item) =>
          normalizedInput.includes(normalizeSlug(item.subsector)),
        )
        .sort((a, b) => a.ticker.localeCompare(b.ticker));

      return { success: true, data: filtered };
    }

    const normalizedTickers = input.tickers.map((e) =>
      e.toUpperCase().replaceAll(".JK", ""),
    );

    const filtered = data
      .filter((item) => normalizedTickers.includes(item.ticker))
      .sort((a, b) => a.ticker.localeCompare(b.ticker));

    return { success: true, data: filtered };
  } catch (error) {
    logger.error({ err: error }, "Failed to get companies");
    return { success: false, message: "Failed to get companies" };
  }
};
