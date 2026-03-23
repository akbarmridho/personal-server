import { knowledgeService } from "../../infrastructure/knowledge-service.js";
import type { PreviousReport } from "./web-prompt.js";

const PREVIOUS_REPORT_SOURCES = [
  "web-grounding",
  "twitter-scoped-search",
] as const;

const PREVIOUS_REPORT_LIMIT = 3;

export async function fetchPreviousReports(): Promise<PreviousReport[]> {
  const { items } = await knowledgeService.listDocuments({
    source_names: [...PREVIOUS_REPORT_SOURCES],
    types: ["rumour"],
    limit: PREVIOUS_REPORT_LIMIT,
  });

  return items.map((item) => ({
    date: item.payload.document_date,
    content: item.payload.content,
    source: item.payload.source?.name ?? "unknown",
  }));
}
