import { Elysia, t } from "elysia";
import {
  type DocumentType,
  knowledgeService,
} from "../infrastructure/knowledge-service.js";
import { logger } from "../utils/logger.js";

export const setupKnowledgeRoutes = () =>
  new Elysia({ prefix: "/knowledge" })
    .get(
      "/documents",
      async ({ query, set }) => {
        try {
          const result = await knowledgeService.listDocuments({
            limit: query.limit,
            offset: query.offset || null,
            symbols: query.symbols?.split(",") || null,
            subsectors: query.subsectors?.split(",") || null,
            types: (query.types?.split(",") as DocumentType[]) || null,
            date_from: query.date_from || null,
            date_to: query.date_to || null,
            pure_sector: query.pure_sector,
          });
          return { success: true, data: result };
        } catch (err) {
          logger.error({ err }, "List documents failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        query: t.Object({
          limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
          offset: t.Optional(t.Number({ minimum: 0 })),
          symbols: t.Optional(t.String()),
          subsectors: t.Optional(t.String()),
          types: t.Optional(t.String()),
          date_from: t.Optional(t.String()),
          date_to: t.Optional(t.String()),
          pure_sector: t.Optional(t.Boolean()),
        }),
        detail: {
          tags: ["Knowledge Base"],
          summary: "List documents from knowledge base",
          description:
            "Returns a paginated list of documents with optional filters for symbols, subsectors, document types, and date ranges. Returns 100-token previews of document content.",
        },
      },
    )
    .post(
      "/documents/search",
      async ({ body, set }) => {
        try {
          const result = await knowledgeService.searchDocuments({
            query: body.query,
            limit: body.limit,
            symbols: body.symbols || null,
            subsectors: body.subsectors || null,
            types: (body.types as DocumentType[]) || null,
            date_from: body.date_from || null,
            date_to: body.date_to || null,
            pure_sector: body.pure_sector || null,
          });
          return { success: true, data: result };
        } catch (err) {
          logger.error({ err }, "Search documents failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        body: t.Object({
          query: t.String(),
          limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
          symbols: t.Optional(t.Array(t.String())),
          subsectors: t.Optional(t.Array(t.String())),
          types: t.Optional(t.Array(t.String())),
          date_from: t.Optional(t.String()),
          date_to: t.Optional(t.String()),
          pure_sector: t.Optional(t.Boolean()),
        }),
        detail: {
          tags: ["Knowledge Base"],
          summary: "Semantic search in knowledge base",
          description:
            "Performs hybrid search (dense + sparse vectors) across documents using semantic similarity. Supports filters for symbols, subsectors, document types, and date ranges. Returns documents ranked by relevance with similarity scores.",
        },
      },
    );
