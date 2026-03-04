import { Exa } from "exa-js";
import { z } from "zod";
import { env } from "../../../infrastructure/env.js";
import type { ScraperResult } from "./types.js";

const EXA_SUMMARY_QUERY =
  'Keep the original content, but remove irrelevant concepts, like "berita terkait", random js script, etc that are not relevant to the content.';

const EXA_SUMMARY_ZOD_SCHEMA = z
  .object({
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    published_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

const EXA_SUMMARY_SCHEMA = z.toJSONSchema(EXA_SUMMARY_ZOD_SCHEMA);

function parseExaSummary(
  summary: unknown,
  url: string,
): { title: string; content: string; published_date: string } {
  let parsedSummary: unknown = summary;

  if (typeof parsedSummary === "string") {
    try {
      parsedSummary = JSON.parse(parsedSummary);
    } catch {
      throw new Error(`Exa summary is not valid JSON for URL: ${url}`);
    }
  }

  return EXA_SUMMARY_ZOD_SCHEMA.parse(parsedSummary);
}

export async function scrapeArticleViaExa(url: string): Promise<ScraperResult> {
  const exa = new Exa(env.EXA_API_KEY);
  const result = await exa.getContents([url], {
    livecrawlTimeout: 30000,
    summary: {
      query: EXA_SUMMARY_QUERY,
      schema: EXA_SUMMARY_SCHEMA,
    },
  });

  const results = (result as { results?: unknown[] }).results;
  const firstResult =
    Array.isArray(results) && results.length > 0
      ? (results[0] as Record<string, unknown>)
      : null;

  if (!firstResult) {
    throw new Error(`Exa returned no content for URL: ${url}`);
  }

  const parsedSummary = parseExaSummary(firstResult.summary, url);

  return {
    title: parsedSummary.title,
    content: parsedSummary.content,
    publishedDate: parsedSummary.published_date,
    url: url,
  };
}
