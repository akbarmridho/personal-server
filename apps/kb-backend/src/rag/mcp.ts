import { logger } from "@personal-server/common/utils/logger";
import { FastMCP } from "fastmcp";
import z from "zod";
import { db } from "../db/db.js";
import { env } from "../env.js";
import { retriever } from "./storage/retrieve.js";

const EMBEDDING_WEIGHT = 0.7;
const FULLTEXT_WEIGHT = 0.3;

let cache: {
  data: { id: string; description: string; name: string }[];
  expires: number;
} | null = null;

const getCollection = async () => {
  const now = Date.now();

  // return cached data if still valid
  if (cache && cache.expires > now) {
    return cache.data;
  }

  // otherwise fetch fresh from DB
  const collection = await db
    .selectFrom("collections")
    .select(["id", "name", "description"])
    .execute();

  // cache it for 5 minutes
  cache = {
    data: collection,
    expires: now + 5 * 60 * 1000,
  };

  return collection;
};

export const setupRAGMcp = async () => {
  const server = new FastMCP({
    name: "Knowledge Base Server",
    version: "1.0.0",
    ping: {
      enabled: true,
      intervalMs: 25000,
      logLevel: "info",
    },
  });

  server.addTool({
    name: "get_search_guide",
    description:
      "Returns a detailed system prompt to guide an AI in properly using the 'search-knowledge-base' tool. Includes dynamic context like the current date and available collections.",
    parameters: z.object({}), // No parameters needed
    execute: async () => {
      const collections = await getCollection();
      const currentDateTime = new Date().toISOString();

      // Format the collections list for easy parsing by the LLM
      const collectionsGuide = collections
        .map(
          (c) =>
            `- ID: ${c.id}, Name: "${c.name}", Description: "${c.description}"`,
        )
        .join("\n");

      // UPDATED PROMPT STARTS HERE
      const prompt = `This document outlines the workflow for using the \`search-knowledge-base\` tool. Your goal is to process a user's request by following the steps below to correctly format and call the tool.

## Context for your task:
- **Current Date:** ${currentDateTime}
- **Available Knowledge Base Collections:**
You MUST choose one of the following collections based on the user's query.
${collectionsGuide}

## Processing Steps:
1.  **Analyze Query & Select Collection**: Understand the user's intent from their query. Based on the query's topic, you **must** select the most relevant \`collectionId\` from the list of available collections above. This is a mandatory step.
2.  **Refine & Expand Query**: Refine and expand the original query for better retrieval. Correct obvious typos (e.g., "fleder" -> "felder") and add relevant synonyms (e.g., "meetings" -> "calls"). This becomes the \`query\` parameter for the tool call.
3.  **Generate HyDE Answer**: Create a concise (25-50 words) hypothetical answer to the refined query. This will be the value for the \`hydeAnswer\` parameter.
4.  **Determine Weights**: Set the search weights. Default to \`embeddingWeight: 0.7\` (for semantic meaning) and \`fulltextWeight: 0.3\` (for keywords). You should only adjust this if the query is highly technical or requires exact keyword matches (then increase \`fulltextWeight\`). The weights must always sum to 1.0.
5.  **Identify Time Filter**: If the user asks for documents *created* or *updated* within a specific timeframe (e.g., "last month", "in January"), populate the \`startDate\` and \`endDate\` parameters in \`YYYY-MM-DD\` format. Otherwise, leave them undefined.

## Final Action:
After performing the steps above, call the \`search-knowledge-base\` tool with all the derived parameters.

---

### Example 1: Standard Query
**User Query**: "Find meeting notes about Project Phoenix from last month"
**Current Date**: 2025-09-25
**Assumed Collections**: ID: 1, Name: "HR", ...; ID: 2, Name: "Project Documents", ...
**Expected Tool Call**:
\`\`\`json
{
  "tool_name": "search-knowledge-base",
  "parameters": {
    "query": "meeting notes calls Project Phoenix",
    "collectionId": 2,
    "hydeAnswer": "Here are the meeting notes and call summaries regarding Project Phoenix from August 2025, detailing project updates and action items.",
    "embeddingWeight": 0.7,
    "fulltextWeight": 0.3,
    "startDate": "2025-08-01",
    "endDate": "2025-08-31"
  }
}
\`\`\`

### Example 2: Typo Correction & Different Language
**User Query**: "welche fleder muss ich ausfüllen für den urlaub" (German for "which fields do I have to fill out for vacation")
**Current Date**: 2025-09-25
**Assumed Collections**: ID: 1, Name: "HR Documents", ...; ID: 2, Name: "Engineering Docs", ...
**Expected Tool Call**:
\`\`\`json
{
  "tool_name": "search-knowledge-base",
  "parameters": {
    "query": "Urlaubsantrag Felder ausfüllen Formular",
    "collectionId": 1,
    "hydeAnswer": "Für den Urlaubsantrag müssen die Felder für Startdatum, Enddatum, Grund und Vertretung ausgefüllt werden, um den Prozess abzuschließen.",
    "embeddingWeight": 0.7,
    "fulltextWeight": 0.3
  }
}
\`\`\`
`;

      return {
        content: [{ type: "text", text: prompt }],
        isError: false,
      };
    },
  });

  server.addTool({
    name: "search-knowledge-base",
    description:
      "Searches the knowledge base to find relevant documents and information. Returns detailed search results with content, source information, and URLs.",
    parameters: z.object({
      query: z
        .string()
        .describe(
          "The search query to use. Be specific and include keywords related to what you are looking for.",
        ),
      collectionId: z
        .number()
        .describe("The collection id to be searched for."),
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
    execute: async (args) => {
      const {
        query,
        hydeAnswer,
        embeddingWeight,
        fulltextWeight,
        startDate,
        endDate,
        collectionId,
      } = args;

      logger.info(args, "Executing search");

      const collections = await getCollection();

      if (!collections.map((c) => c.id).includes(String(collectionId))) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Invalid collectionId. See collections to see all available collection.",
                  collections,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        const searchResults = await retriever.hierarchicalSearch(
          query,
          hydeAnswer,
          collectionId,
          {
            embedding_weight: embeddingWeight,
            fulltext_weight: fulltextWeight,
            start_date: startDate,
            end_date: endDate,
          },
        );

        const returnObj = {
          success: true,
          query,
          hydeAnswer,
          results: searchResults,
          stats: {
            totalResults: searchResults.length,
            embeddingWeight,
            fulltextWeight,
            timeRange: startDate || endDate ? { startDate, endDate } : null,
          },
        };

        logger.info(returnObj, "Return search");

        return { type: "text", text: JSON.stringify(returnObj, null, 2) };
      } catch (error) {
        logger.error(error, "Error in KB search.");

        const returnObj = {
          success: false,
          query,
          error: error instanceof Error ? error.message : String(error),
        };

        return {
          content: [{ type: "text", text: JSON.stringify(returnObj, null, 2) }],
          isError: true,
        };
      }
    },
  });

  await server.start({
    transportType: "httpStream",
    httpStream: {
      enableJsonResponse: true,
      stateless: true,
      host: "127.0.0.1", // bind to localhost (127.0.0.1) instead of 0.0.0.0. the request came from proxy so it's fine
      port: env.RAG_MCP_PORT,
    },
  });

  return server;
};
