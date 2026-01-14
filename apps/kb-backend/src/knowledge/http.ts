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
            use_dense: body.use_dense ?? true, // Default to true for backward compatibility
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
          use_dense: t.Optional(t.Boolean()),
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
            "Performs hybrid search (dense + sparse vectors) across documents using semantic similarity. Set use_dense=false to disable expensive dense vector search (OpenRouter API) and use only sparse + late interaction reranking. Supports filters for symbols, subsectors, document types, and date ranges. Returns documents ranked by relevance with similarity scores.",
        },
      },
    )
    .get(
      "/documents/:documentId",
      async ({ params, set }) => {
        try {
          const data = await knowledgeService.getDocument(params.documentId);
          return { success: true, data };
        } catch (err: any) {
          logger.error(
            { err, documentId: params.documentId },
            "Get document failed",
          );
          set.status = err.response?.status === 404 ? 404 : 500;
          return { success: false, error: err.message };
        }
      },
      {
        params: t.Object({ documentId: t.String() }),
        detail: {
          tags: ["Knowledge Base"],
          summary: "Get document by ID",
          description:
            "Retrieve a single document with full payload including all metadata and content.",
        },
      },
    )
    .delete(
      "/documents/:documentId",
      async ({ params, set }) => {
        try {
          await knowledgeService.deleteDocument(params.documentId);
          return { success: true, message: "Document deleted" };
        } catch (err: any) {
          logger.error(
            { err, documentId: params.documentId },
            "Delete document failed",
          );
          set.status = err.response?.status === 404 ? 404 : 500;
          return { success: false, error: err.message };
        }
      },
      {
        params: t.Object({ documentId: t.String() }),
        detail: {
          tags: ["Knowledge Base"],
          summary: "Delete document by ID",
          description:
            "Permanently delete a document from the knowledge base. This action cannot be undone.",
        },
      },
    )
    .put(
      "/documents/:documentId",
      async ({ params, body, set }) => {
        try {
          const result = await knowledgeService.updateDocument(
            params.documentId,
            body,
          );
          return { success: true, data: result };
        } catch (err: any) {
          logger.error(
            { err, documentId: params.documentId },
            "Update document failed",
          );
          set.status = 500;
          return { success: false, error: err.message };
        }
      },
      {
        params: t.Object({ documentId: t.String() }),
        body: t.Object({
          type: t.Union([
            t.Literal("news"),
            t.Literal("filing"),
            t.Literal("analysis"),
            t.Literal("rumour"),
          ]),
          title: t.Optional(t.String()),
          content: t.String(),
          document_date: t.String(),
          source: t.Record(t.String(), t.String()),
          urls: t.Optional(t.Array(t.String())),
          symbols: t.Optional(t.Array(t.String())),
          subsectors: t.Optional(t.Array(t.String())),
          subindustries: t.Optional(t.Array(t.String())),
          indices: t.Optional(t.Array(t.String())),
        }),
        detail: {
          tags: ["Knowledge Base"],
          summary: "Update document by ID",
          description:
            "Update a document by re-ingesting with the same ID. Performs full replacement of the document content and metadata.",
        },
      },
    );
