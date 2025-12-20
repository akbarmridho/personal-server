import axios from "axios";
import z from "zod";
import { KV } from "../../infrastructure/db/kv.js";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import { normalizeSector } from "./sector.js";

export interface CompanyMeta {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  industry: string;
  subIndustry: string;
}

export const companyMetaKeys = "data-modules.profiles.companies";

export async function fetchRawCompanies(): Promise<CompanyMeta[]> {
  const response = await axios.get(env.AGGREGATOR_COMPANIES_ENDPOINT, {
    headers: {
      ...JSON.parse(env.AGGREGATOR_AUTH),
      "Content-Type": "application/json",
    },
  });

  const companiesRaw = z
    .object({
      symbol: z.string(),
      company_name: z.string(),
      sector: z.string(),
      sub_sector: z.string(),
      industry: z.string(),
      sub_industry: z.string(),
    })
    .array()
    // last time the data was 954 so it shouln't be less than that
    .min(954)
    .parse(response.data);

  return companiesRaw.map((company) => {
    return {
      symbol: company.symbol.toUpperCase().replaceAll(".JK", ""),
      name: company.company_name,
      sector: normalizeSector(company.sector),
      subSector: normalizeSector(company.sub_sector),
      industry: normalizeSector(company.industry),
      subIndustry: normalizeSector(company.sub_industry),
    };
  });
}

export const updateCompanies = inngest.createFunction(
  { id: "profiles/update-companies" },
  // run every friday 16.00
  { cron: "TZ=Asia/Jakarta 0 16 * * 5" },
  async ({ step }) => {
    const companies = await step.run(
      "fetch-companies",
      async () => await fetchRawCompanies(),
    );

    await step.run("upsert-companies", async () => {
      await KV.set(companyMetaKeys, companies);
    });
  },
);

// Define prefixes that are too generic to be used as a 2-word identifier base.
// If a name starts with these, we should match the FULL name to be safe.
const GENERIC_PREFIXES = new Set([
  "bank",
  "mitra",
  "sumber",
  "global",
  "jaya",
  "indo",
  "indonesia", // e.g. "Indonesia Kendaraan Terminal"
  "graha",
  "duta",
  "multi",
  "mega",
  "sinar",
  "wahana",
  "tri",
  "bina",
  "inti",
  "prima",
  "fortune", // e.g. "Fortune Indonesia"
]);

interface CompanyMatcher {
  symbol: string;
  pattern: RegExp;
}

/**
 * Cleans the company name by removing legal entities and common suffixes.
 */
const cleanCompanyName = (rawName: string): string => {
  return (
    rawName
      // Remove "PT" or "PT." at the start
      .replace(/^(PT\.?)\s+/i, "")
      // Remove "Tbk" or "Tbk." at the end
      .replace(/\s+(Tbk\.?)$/i, "")
      // Remove "(Persero)"
      .replace(/\(Persero\)/i, "")
      // Remove punctuation but keep spaces/alphanumeric
      .replace(/[^\w\s]/g, "")
      // Remove extra whitespace
      .trim()
  );
};

const createCompanyMatchers = (companies: CompanyMeta[]): CompanyMatcher[] => {
  const matchers: CompanyMatcher[] = [];

  for (const company of companies) {
    const symbol = company.symbol;
    const cleanName = cleanCompanyName(company.name);
    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    const firstWordLower = nameParts[0]?.toLowerCase();

    // 1. Always match the Symbol (e.g., "BBRI")
    // IMPORTANT: Ticker symbols are always 4 letters and MUST be UPPERCASE only.
    // This prevents false matches with common lowercase words.
    // DO NOT change this to case-insensitive matching.
    matchers.push({
      symbol: symbol,
      pattern: new RegExp(`(\\b|\\$)${symbol}(?=\\b|:)`),
    });

    // 2. Determine Name Matching Strategy
    if (nameParts.length > 0) {
      let searchTerm = "";

      // STRATEGY A: Single Word Name -> Match Exact
      // e.g. "Elnusa", "Telkom"
      if (nameParts.length === 1) {
        searchTerm = nameParts[0];
      }
      // STRATEGY B: Generic Prefix Exception -> Match Full Name
      // e.g. "Bank Rakyat Indonesia" (Starts with Bank, >2 words)
      // e.g. "Sumber Energi Andalan" (Starts with Sumber, >2 words)
      else if (GENERIC_PREFIXES.has(firstWordLower) && nameParts.length > 2) {
        searchTerm = cleanName;
      }
      // STRATEGY C: Standard Multi-Word -> Match First 2 Words
      // e.g. "Cita Mineral Investindo" -> "Cita Mineral"
      // e.g. "Bank Mega" -> "Bank Mega" (Short enough to be distinct)
      else {
        searchTerm = `${nameParts[0]} ${nameParts[1]}`;
      }

      // Escape special regex characters just in case
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      matchers.push({
        symbol: symbol,
        pattern: new RegExp(`\\b${escapedTerm}\\b`, "i"),
      });
    }
  }

  return matchers;
};

export const extractSymbolFromTexts = async (
  texts: string[],
): Promise<string[][]> => {
  const companies = (await KV.get(companyMetaKeys)) as any as CompanyMeta[];
  const allMatchers = createCompanyMatchers(companies);

  const results = texts.map((text) => {
    const foundSymbols = new Set<string>();

    for (const matcher of allMatchers) {
      if (matcher.pattern.test(text)) {
        foundSymbols.add(matcher.symbol);
      }
    }

    return Array.from(foundSymbols);
  });

  return results;
};
