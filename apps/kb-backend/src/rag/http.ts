import { parseDate } from "@personal-server/common/utils/date";
import { detectContentType } from "@personal-server/common/utils/language-detect";
import { logger } from "@personal-server/common/utils/logger";
import { Elysia } from "elysia";
import pRetry from "p-retry";
import z from "zod";
import { db } from "../db/db.js";
import { htmlToPdf } from "./file-converters/html-to-pdf.js";
import { pdfToMarkdownConverter } from "./file-converters/pdf-to-md-converter.js";
import { retriever } from "./storage/retrieve.js";
import { vectorStore } from "./storage/store.js";

const EMBEDDING_WEIGHT = 0.7;
const FULLTEXT_WEIGHT = 0.3;

// --------------------
// Utility
// --------------------
// Normalize metadata: allow object or JSON string
function normalizeMetadata(metadata: unknown): Record<string, any> | null {
  let obj: Record<string, any> = {};

  if (typeof metadata === "string") {
    try {
      obj = JSON.parse(metadata);
    } catch {
      throw new Error("Invalid metadata JSON string");
    }
  }
  if (typeof metadata === "object" && metadata !== null) {
    obj = metadata;
  }

  return Object.keys(obj).length > 1 ? obj : null;
}

// --------------------
// Zod Schemas & Types
// --------------------

// /documents — JSON body
const DocumentJsonBody = z.object({
  collection_id: z.coerce.number(),
  title: z.string(),
  content: z.string(),
  document_ts: z.string().optional(),
  metadata: z.union([z.record(z.string(), z.any()), z.string()]),
});
type DocumentJsonBody = z.infer<typeof DocumentJsonBody>;

// /documents — Multipart body
const DocumentMultipartBody = z.object({
  collection_id: z.coerce.number(),
  title: z.string(),
  file: z
    .instanceof(File)
    .refine((file) => ["application/pdf"].includes(file.type), {
      message: "Not a pdf.",
    }),
  document_ts: z.string().optional(),
  metadata: z.union([z.record(z.string(), z.any()), z.string()]),
});
type DocumentMultipartBody = z.infer<typeof DocumentMultipartBody>;

// /collections/:id/documents
const CollectionParams = z.object({
  id: z.coerce.number(),
});
type CollectionParams = z.infer<typeof CollectionParams>;

const CollectionQuery = z.object({
  title: z.string().optional(),
});
type CollectionQuery = z.infer<typeof CollectionQuery>;

// /documents/:id
const DocumentParams = z.object({
  id: z.coerce.number(),
});
type DocumentParams = z.infer<typeof DocumentParams>;

// /search
const SearchBody = z.object({
  query: z
    .string()
    .describe(
      "The search query to use. Be specific and include keywords related to what you are looking for.",
    ),
  hyde_answer: z
    .string()
    .describe(
      "A hypothetical answer (HYDE) to guide the retrieval process. This improves search quality significantly. Should be 25–50 words that directly answer the query.",
    ),
  embedding_weight: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(EMBEDDING_WEIGHT)
    .describe(
      "Weight for semantic (embedding) search between 0 and 1. Higher values prioritize conceptual matches.",
    ),
  fulltext_weight: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(FULLTEXT_WEIGHT)
    .describe(
      "Weight for keyword (full-text) search between 0 and 1. Higher values prioritize exact keyword matches.",
    ),
  start_date: z
    .string()
    .optional()
    .describe(
      'Optional start date for time-constrained queries in ISO format (e.g., "2023-01-01").',
    ),
  end_date: z
    .string()
    .optional()
    .describe(
      'Optional end date for time-constrained queries in ISO format (e.g., "2023-12-31").',
    ),
  collection_id: z.coerce.number(),
  metadata: z.union([z.record(z.string(), z.any()), z.string()]).optional(),
});
type SearchBody = z.infer<typeof SearchBody>;

// --------------------
// RAG Routes
// --------------------
export const setupRagRoutes = () =>
  new Elysia({ prefix: "/rag" })

    // --------------------
    // POST /documents
    // --------------------
    .post(
      "/documents",
      async ({ body }: { body: DocumentJsonBody | DocumentMultipartBody }) => {
        try {
          let finalContent: string;

          if ("content" in body && body.content) {
            // Text content provided directly

            const type = detectContentType(body.content);

            if (type === "markdown") {
              finalContent = body.content;
            } else if (type === "html") {
              // convert first to markdown via pdf
              logger.info(
                "detected html content. converting to pdf then markdown ...",
              );
              const pdf = await pRetry(async () => htmlToPdf(body.content), {
                retries: 3,
              });
              finalContent = await pdfToMarkdownConverter.convert(pdf.buffer);
            } else {
              throw new Error("Unknown content type detected");
            }
          } else if ("file" in body && body.file) {
            if (!body.file.type.includes("pdf")) {
              throw new Error("Only pdf files are supported");
            }

            // File uploaded (PDF)
            finalContent = await pdfToMarkdownConverter.convert(body.file);
          } else {
            throw new Error("Either `content` or `file` must be provided");
          }

          let documentTs: Date | null = null;

          if (body.document_ts) {
            const parsed = parseDate(body.document_ts);
            if (parsed === null) throw new Error("Invalid document_ts");
            documentTs = parsed;
          }

          const metadata = normalizeMetadata(body.metadata);

          const result = await vectorStore.storeDocument({
            collection_id: body.collection_id,
            title: body.title,
            content: finalContent,
            document_ts: documentTs,
            metadata,
          });

          return { success: true, ...result };
        } catch (err) {
          logger.error({ err }, "Failed to store document");
          return { success: false, error: (err as Error).message };
        }
      },
      {
        body: z.union([DocumentJsonBody, DocumentMultipartBody]),
      },
    )

    // --------------------
    // GET /collections
    // --------------------
    .get("/collections", async () => {
      const rows = await db.selectFrom("collections").selectAll().execute();
      return rows;
    })

    // --------------------
    // GET /collections/:id/documents
    // --------------------
    .get(
      "/collections/:id/documents",
      async ({
        params,
        query,
      }: {
        params: CollectionParams;
        query: CollectionQuery;
      }) => {
        const docs = await vectorStore.getDocuments(
          Number(params.id),
          query.title,
        );
        return docs;
      },
      {
        params: CollectionParams,
        query: CollectionQuery,
      },
    )

    // --------------------
    // DELETE /documents/:id
    // --------------------
    .delete(
      "/documents/:id",
      async ({ params }: { params: DocumentParams }) => {
        const result = await vectorStore.deleteDocumentById(Number(params.id));
        return result;
      },
      {
        params: DocumentParams,
      },
    )

    // --------------------
    // POST /search
    // --------------------
    .post(
      "/search",
      async ({ body }: { body: SearchBody }) => {
        try {
          const {
            query,
            hyde_answer,
            embedding_weight,
            fulltext_weight,
            start_date,
            end_date,
            collection_id,
            metadata,
          } = body;

          const metadataFilter = normalizeMetadata(metadata || {});

          const results = await retriever.hierarchicalSearch(
            query,
            hyde_answer,
            collection_id,
            {
              embedding_weight,
              fulltext_weight,
              start_date,
              end_date,
              metadataFilter: metadataFilter || undefined,
            },
          );

          return { success: true, results };
        } catch (err) {
          logger.error({ err }, "Search failed");
          return { success: false, error: (err as Error).message };
        }
      },
      {
        body: SearchBody,
      },
    );
