import type { DocumentSource } from "@tm/ai";
import { HierarchicalRetriever } from "@tm/ai/storage";
import { getSupabaseServerClient } from "@tm/supabase/server-client";
import { tool } from "ai";
import { z } from "zod";

const DOC_SEARCH_LIMIT = 128;
const CHUNK_SEARCH_LIMIT = 512;
const EMBEDDING_WEIGHT = 0.7;
const FULLTEXT_WEIGHT = 0.3;

/**
 * Performs knowledge base search with comprehensive search parameters
 */
export const createKbSearchTool = (
  userId: string,
  source?: DocumentSource | DocumentSource[],
) =>
  tool({
    description:
      "Searches the organization's knowledge base to find relevant documents and information. Returns detailed search results with content, source information, and URLs.",
    parameters: z.object({
      query: z
        .string()
        .describe(
          "The search query to use. Be specific and include keywords related to what you are looking for.",
        ),
      hydeAnswer: z
        .string()
        .describe(
          "A hypothetical answer (HYDE) to guide the retrieval process. This improves search quality significantly. Should be 25-50 words that directly answer the query.",
        ),
      embeddingWeight: z
        .number()
        .min(0)
        .max(1)
        .default(EMBEDDING_WEIGHT)
        .describe(
          "Weight for semantic (embedding) search between 0 and 1. Higher values prioritize conceptual matches.",
        ),
      fulltextWeight: z
        .number()
        .min(0)
        .max(1)
        .default(FULLTEXT_WEIGHT)
        .describe(
          "Weight for keyword (full-text) search between 0 and 1. Higher values prioritize exact keyword matches.",
        ),
      startDate: z
        .string()
        .optional()
        .describe(
          'Optional start date for time-constrained queries in ISO format (e.g., "2023-01-01").',
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'Optional end date for time-constrained queries in ISO format (e.g., "2023-12-31").',
        ),
    }),
    execute: async ({
      query,
      hydeAnswer,
      embeddingWeight = EMBEDDING_WEIGHT,
      fulltextWeight = FULLTEXT_WEIGHT,
      startDate,
      endDate,
    }) => {
      const supabase = getSupabaseServerClient({ admin: true });

      try {
        console.log(
          `Executing KB search for query: "${query}" for user ${userId}`,
        );

        const hierarchicalRetriever = new HierarchicalRetriever({
          client: supabase,
          docSearchLimit: DOC_SEARCH_LIMIT,
          chunkSearchLimit: CHUNK_SEARCH_LIMIT,
          embeddingWeight: embeddingWeight,
          fulltextWeight: fulltextWeight,
        });

        console.time("KNOWLEDGE_SEARCH");
        const searchParams = {
          target_user_id: userId,
          start_date: startDate,
          end_date: endDate,
          embedding_weight: embeddingWeight,
          fulltext_weight: fulltextWeight,
          source: source as DocumentSource | DocumentSource[] | undefined,
          concatChunks: true,
        };

        const searchResults = await hierarchicalRetriever.hierarchicalSearch(
          query,
          hydeAnswer,
          searchParams,
        );
        console.timeEnd("KNOWLEDGE_SEARCH");

        const processedResults = searchResults.map((result) => ({
          title: result.title || "Untitled Document",
          url: result.url || null,
          source: result.source || null,
          content: (result.contentParts as string) || null,
          documentId: result.documentId,
          updatedAt: result.sourceUpdatedAt || null,
        }));

        return {
          success: true,
          query,
          hydeAnswer,
          results: processedResults,
          stats: {
            totalResults: processedResults.length,
            embeddingWeight,
            fulltextWeight,
            source,
            timeRange: startDate || endDate ? { startDate, endDate } : null,
          },
        };
      } catch (error) {
        console.error("Error in KB search:", error);
        return {
          success: false,
          query,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
