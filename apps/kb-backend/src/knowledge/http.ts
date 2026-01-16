import { Elysia, t } from "elysia";
import { KV } from "../infrastructure/db/kv.js";
import {
  type DocumentType,
  knowledgeService,
} from "../infrastructure/knowledge-service.js";
import { logger } from "../utils/logger.js";

// Simple in-memory cache for source names
let sourceNamesCache: {
  data: string[] | null;
  timestamp: number | null;
} = {
  data: null,
  timestamp: null,
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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
            source_names: query.source_names?.split(",") || null,
            include_ids: query.include_ids?.split(",") || null,
            exclude_ids: query.exclude_ids?.split(",") || null,
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
          source_names: t.Optional(t.String()),
          include_ids: t.Optional(t.String()),
          exclude_ids: t.Optional(t.String()),
        }),
        detail: {
          tags: ["Knowledge Base"],
          summary: "List documents from knowledge base",
          description:
            "Returns a paginated list of documents with optional filters for symbols, subsectors, document types, source names, and date ranges. Returns 100-token previews of document content.",
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
            source_names: body.source_names || null,
            include_ids: body.include_ids || null,
            exclude_ids: body.exclude_ids || null,
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
          source_names: t.Optional(t.Array(t.String())),
          include_ids: t.Optional(t.Array(t.String())),
          exclude_ids: t.Optional(t.Array(t.String())),
        }),
        detail: {
          tags: ["Knowledge Base"],
          summary: "Semantic search in knowledge base",
          description:
            "Performs hybrid search (dense + sparse vectors) across documents using semantic similarity. Set use_dense=false to disable expensive dense vector search (OpenRouter API) and use only sparse + late interaction reranking. Supports filters for symbols, subsectors, document types, source names, and date ranges. Returns documents ranked by relevance with similarity scores.",
        },
      },
    )
    .get(
      "/sources",
      async ({ set }) => {
        try {
          const now = Date.now();

          // Check if cache is valid
          if (
            sourceNamesCache.data &&
            sourceNamesCache.timestamp &&
            now - sourceNamesCache.timestamp < CACHE_TTL_MS
          ) {
            logger.info("Returning cached source names");
            return { success: true, data: sourceNamesCache.data };
          }

          // Fetch fresh data
          logger.info("Fetching fresh source names from knowledge service");
          const sourceNames = await knowledgeService.listSourceNames();

          // Update cache
          sourceNamesCache = {
            data: sourceNames,
            timestamp: now,
          };

          return { success: true, data: sourceNames };
        } catch (err) {
          logger.error({ err }, "List source names failed");
          set.status = 500;
          return { success: false, error: (err as Error).message };
        }
      },
      {
        detail: {
          tags: ["Knowledge Base"],
          summary: "List unique source names",
          description:
            "Returns a list of unique source.name values from all documents in the knowledge base. Results are cached for 1 hour for performance.",
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
    )
    // Golden Article Read Status Endpoints
    .get(
      "/golden-article/reads/:profileId",
      async ({ params, set }) => {
        const { profileId } = params;
        const key = `golden-article-reads:${profileId}`;

        try {
          const data = (await KV.get(key)) as { articleIds: string[] } | null;
          const articleIds = data?.articleIds || [];

          return {
            success: true,
            data: {
              profileId,
              articleIds,
            },
          };
        } catch (error) {
          set.status = 500;
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to get read articles",
          };
        }
      },
      {
        params: t.Object({
          profileId: t.String({ minLength: 1, maxLength: 50 }),
        }),
        detail: {
          tags: ["Golden Article"],
          summary: "Get read articles for a profile",
          description:
            "Fetch all article IDs that have been marked as read for a specific profile",
        },
      },
    )
    .post(
      "/golden-article/reads/:profileId/read",
      async ({ params, body, set }) => {
        const { profileId } = params;
        const { documentId } = body;
        const key = `golden-article-reads:${profileId}`;

        try {
          // Atomically add document ID to array (no race condition)
          const articleIds = await KV.arrayAdd(key, "articleIds", documentId);

          return {
            success: true,
            data: {
              articleIds,
            },
          };
        } catch (error) {
          set.status = 500;
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to mark article as read",
          };
        }
      },
      {
        params: t.Object({
          profileId: t.String({ minLength: 1, maxLength: 50 }),
        }),
        body: t.Object({
          documentId: t.String(),
        }),
        detail: {
          tags: ["Golden Article"],
          summary: "Mark article as read",
          description:
            "Add an article ID to the read list for a specific profile",
        },
      },
    )
    .delete(
      "/golden-article/reads/:profileId/read/:documentId",
      async ({ params, set }) => {
        const { profileId, documentId } = params;
        const key = `golden-article-reads:${profileId}`;

        try {
          // Atomically remove document ID from array (no race condition)
          const articleIds = await KV.arrayRemove(
            key,
            "articleIds",
            documentId,
          );

          return {
            success: true,
            data: {
              articleIds,
            },
          };
        } catch (error) {
          set.status = 500;
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to mark article as unread",
          };
        }
      },
      {
        params: t.Object({
          profileId: t.String({ minLength: 1, maxLength: 50 }),
          documentId: t.String(),
        }),
        detail: {
          tags: ["Golden Article"],
          summary: "Mark article as unread",
          description:
            "Remove an article ID from the read list for a specific profile",
        },
      },
    );
