import { KV } from "../../db/kv.js";
import { logger } from "../../utils/logger.js";
import { type CompanyMeta, companyMetaKeys } from "../profiles/companies.js";
import { getMentionedIndices } from "../profiles/indices.js";
import { classifySector } from "../profiles/sector.js";
import type { Snips } from "./types.js";

export async function tagSnips(snips: Snips[]): Promise<Snips[]> {
  const companies = await KV.get(companyMetaKeys);

  if (!companies || (companies as []).length <= 950) {
    throw new Error("Invalid companies raw data");
  }

  const companyMap = new Map<string, CompanyMeta>();

  (companies as any as CompanyMeta[]).forEach((company) => {
    companyMap.set(company.symbol, company);
  });

  const results = await Promise.all(
    snips.map(async (snip) => {
      const subsectors = new Set<string>();
      const subindustries = new Set<string>();

      for (const symbol of snip.symbols) {
        const company = companyMap.get(symbol);

        if (!company) {
          continue;
        }

        subsectors.add(company.subSector);
        subindustries.add(company.subIndustry);
      }

      snip.subindustries = [...subindustries];
      snip.subsectors = [...subsectors];
      snip.indices = getMentionedIndices(snip.content);

      // LLM-based tagging (Only if no symbols were matched)
      if (snip.symbols.length === 0) {
        try {
          const classification = await classifySector(snip.content);

          // Merge LLM results (deduplicating just in case)
          snip.subsectors = [
            ...new Set([...snip.subsectors, ...classification.subsectors]),
          ];
          snip.subindustries = [
            ...new Set([
              ...snip.subindustries,
              ...classification.subindustries,
            ]),
          ];
        } catch (error) {
          logger.error(error, "Failed to classify snip via LLM after retries.");
          // Fallback: leave as empty arrays, do not fail the whole process
        }
      }

      return snip;
    }),
  );

  return results;
}
