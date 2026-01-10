import z from "zod";
import {
  type CompanyMeta,
  fetchRawCompanies,
} from "../../data-modules/profiles/companies.js";
import {
  normalizeSector,
  supportedSubsectors,
} from "../../data-modules/profiles/sector.js";
import { logger } from "../../utils/logger.js";

export const GetCompaniesParams = z.object({
  subsectors: z
    .string()
    .array()
    .describe(
      `Array of subsector. Supported slugs: ${Array.from(
        supportedSubsectors,
      ).join(", ")}`,
    )
    .optional(),
  symbols: z.string().array().describe("Array of stock symbols").optional(),
});

export const getCompanies = async (
  input: z.infer<typeof GetCompaniesParams>,
): Promise<
  { success: true; data: CompanyMeta[] } | { success: false; message: string }
> => {
  try {
    const data = await fetchRawCompanies();

    // If no filters provided, return all companies sorted by symbol
    if (!input.subsectors && !input.symbols) {
      const sorted = data.sort((a, b) => a.symbol.localeCompare(b.symbol));
      return { success: true, data: sorted };
    }

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
        .filter((item) => normalizedInput.includes(item.subSector))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));

      return { success: true, data: filtered };
    } else if (input.symbols) {
      const normalizedSymbols = input.symbols.map((e) =>
        e.toUpperCase().replaceAll(".JK", ""),
      );

      const filtered = data
        .filter((item) => normalizedSymbols.includes(item.symbol))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));

      return { success: true, data: filtered };
    }

    return {
      success: false,
      message: "Either symbols or subsectors must be set",
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
