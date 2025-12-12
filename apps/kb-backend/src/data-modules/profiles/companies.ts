import axios from "axios";
import z from "zod";
import { KV } from "../../db/kv.js";
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

async function fetchRawCompanies(): Promise<CompanyMeta[]> {
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

export const extractSymbolFromText = async (
  text: string,
): Promise<string[]> => {
  const companies = (await KV.get(companyMetaKeys)) as any as CompanyMeta[];

  // Create a set of all valid symbols for faster lookup
  const validSymbols = new Set(companies.map((company) => company.symbol));

  // Use regex to find all 4-letter uppercase words in the text
  const matches = text.match(/\b[A-Z]{4}\b/g) || [];

  // Filter matches to only include valid company symbols
  const foundSymbols = new Set(
    matches.filter((match) => validSymbols.has(match)),
  );

  return [...foundSymbols];
};

export const extractSymbolFromTexts = async (
  texts: string[],
): Promise<string[][]> => {
  const companies = (await KV.get(companyMetaKeys)) as any as CompanyMeta[];

  const symbols = texts.map((text) => {
    // Create a set of all valid symbols for faster lookup
    const validSymbols = new Set(companies.map((company) => company.symbol));

    // Use regex to find all 4-letter uppercase words in the text
    const matches = text.match(/\b[A-Z]{4}\b/g) || [];

    // Filter matches to only include valid company symbols
    const foundSymbols = new Set(
      matches.filter((match) => validSymbols.has(match)),
    );

    return [...foundSymbols];
  });

  return symbols;
};
