import { KV } from "../../infrastructure/db/kv.js";
import { logger } from "../../utils/logger.js";
import { type CompanyMeta, companyMetaKeys } from "../profiles/companies.js";
import { getMentionedIndices } from "../profiles/indices.js";
import { classifySector } from "../profiles/sector.js";
import type { Document } from "./types.js";

export async function tagMetadata(docs: Document[]): Promise<Document[]> {
  const companies = await KV.get(companyMetaKeys);

  if (!companies || (companies as []).length <= 950) {
    throw new Error("Invalid companies raw data");
  }

  const companyMap = new Map<string, CompanyMeta>();

  (companies as any as CompanyMeta[]).forEach((company) => {
    companyMap.set(company.symbol, company);
  });

  const results = await Promise.all(
    docs.map(async (doc) => {
      const subsectors = new Set<string>();
      const subindustries = new Set<string>();

      for (const symbol of doc.symbols) {
        const company = companyMap.get(symbol);

        if (!company) {
          continue;
        }

        subsectors.add(company.subSector);
        subindustries.add(company.subIndustry);
      }

      doc.subindustries = [...subindustries];
      doc.subsectors = [...subsectors];
      doc.indices = getMentionedIndices(doc.content);

      // LLM-based tagging (Only if no symbols were matched)
      if (doc.symbols.length === 0) {
        try {
          const classification = await classifySector(doc.content);

          // Merge LLM results (deduplicating just in case)
          doc.subsectors = [
            ...new Set([...doc.subsectors, ...classification.subsectors]),
          ];
          doc.subindustries = [
            ...new Set([...doc.subindustries, ...classification.subindustries]),
          ];
        } catch (error) {
          logger.error(error, "Failed to classify snip via LLM after retries.");
          // Fallback: leave as empty arrays, do not fail the whole process
        }
      }

      return doc;
    }),
  );

  return results;
}
