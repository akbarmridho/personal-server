import z from "zod";
import { fetchRawCompanies } from "../../data-modules/profiles/companies.js";
import {
  normalizeSector,
  supportedSubsectors,
} from "../../data-modules/profiles/sector.js";
import { logger } from "../../utils/logger.js";

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
    const data = await fetchRawCompanies();

    if (input.subsectors) {
      const normalizedInput = input.subsectors.map((s) =>
        supportedSubsectors.has(s) ? s : normalizeSector(s),
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
          normalizedInput.includes(normalizeSector(item.subSector)),
        )
        .sort((a, b) => a.symbol.localeCompare(b.symbol));

      return { success: true, data: filtered };
    } else if (input.tickers) {
      const normalizedTickers = input.tickers.map((e) =>
        e.toUpperCase().replaceAll(".JK", ""),
      );

      const filtered = data
        .filter((item) => normalizedTickers.includes(item.symbol))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));

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

export const checkSymbol = async (symbol: string): Promise<string> => {
  const data = await fetchRawCompanies();

  const normalized = symbol.toUpperCase().replaceAll(".JK", "");

  if (data.map((e) => e.symbol).includes(normalized)) {
    return normalized;
  }

  throw new Error(`Symbol ${symbol} not found`);
};
