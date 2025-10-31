import { parseDate } from "@personal-server/common/utils/date";
import { detectContentType } from "@personal-server/common/utils/language-detect";
import { logger } from "@personal-server/common/utils/logger";
import { Elysia, t } from "elysia";
import pRetry from "p-retry";
import { db } from "../db/db.js";
import { htmlToMarkdown } from "./file-converters/html-to-md-converter.js";
import { htmlToPdf } from "./file-converters/html-to-pdf.js";
import { pdfToMarkdownConverter } from "./file-converters/pdf-to-md-converter.js";
import { retriever } from "./storage/retrieve.js";
import { vectorStore } from "./storage/store.js";

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
// RAG Routes
// --------------------
export const setupRagRoutes = () =>
  new Elysia({ prefix: "/rag", tags: ["RAG"] })

    // --------------------
    // POST /documents
    // --------------------
    .post(
      "/documents",
      async ({ body }) => {
        try {
          let finalContent: string;

          if ("content" in body && body.content) {
            // Text content provided directly

            const type = detectContentType(body.content);

            if (type === "html") {
              if (body.hiresPdfExtract) {
                // convert first to markdown via pdf
                logger.info(
                  "hires detected with html content. converting to pdf then markdown ...",
                );
                const pdf = await pRetry(async () => htmlToPdf(body.content!), {
                  retries: 3,
                });
                finalContent = await pdfToMarkdownConverter.convert(pdf.buffer);
              } else {
                finalContent = await htmlToMarkdown(body.content!);
              }
            } else {
              // just raw content type if not html
              finalContent = body.content;
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

          const result = await vectorStore.storeDocument(
            {
              collection_id: body.collection_id,
              title: body.title,
              content: finalContent,
              document_ts: documentTs,
              metadata,
            },
            {
              skipSummary: body.skipSummary,
            },
          );

          return { success: true, ...result };
        } catch (err) {
          logger.error({ err }, "Failed to store document");
          return { success: false, error: (err as Error).message };
        }
      },
      {
        body: t.Object({
          collection_id: t.Numeric(),
          title: t.String(),
          file: t.Optional(t.File()),
          content: t.Optional(t.String()),
          document_ts: t.Optional(t.String()),
          metadata: t.Union([t.Record(t.String(), t.Any()), t.String()]),
          hiresPdfExtract: t.BooleanString({ default: false }),
          skipSummary: t.BooleanString({ default: false }),
        }),
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
      async ({ params, query }) => {
        const metadataFilter = normalizeMetadata(query.metadata || {});

        const docs = await vectorStore.getDocuments(Number(params.id), {
          title: query.title,
          daysBack: query.daysBack,
          from: query.from,
          to: query.to,
          metadataFilter: metadataFilter || undefined,
        });
        return docs;
      },
      {
        params: t.Object({
          id: t.String(),
        }),
        query: t.Object({
          title: t.Optional(t.String()),
          daysBack: t.Optional(t.Numeric()),
          from: t.Optional(t.String()),
          to: t.Optional(t.String()),
          metadata: t.Optional(
            t.Union([t.Record(t.String(), t.Any()), t.String()]),
          ),
        }),
      },
    )

    // --------------------
    // DELETE /documents/:id
    // --------------------
    .delete(
      "/documents/:id",
      async ({ params }) => {
        const result = await vectorStore.deleteDocumentById(Number(params.id));
        return result;
      },
      {
        params: t.Object({
          id: t.String(),
        }),
      },
    )

    // --------------------
    // POST /search
    // --------------------
    .post(
      "/search",
      async ({ body }) => {
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
        body: t.Object({
          query: t.String({
            description:
              "The search query to use. Be specific and include keywords related to what you are looking for.",
          }),
          hyde_answer: t.String({
            description:
              "A hypothetical answer (HYDE) to guide the retrieval process. This improves search quality significantly. Should be 25–50 words that directly answer the query.",
          }),
          embedding_weight: t.Numeric({
            default: 0.7,
            minimum: 0,
            maximum: 1,
            description:
              "Weight for semantic (embedding) search between 0 and 1. Higher values prioritize conceptual matches.",
          }),
          fulltext_weight: t.Numeric({
            default: 0.3,
            minimum: 0,
            maximum: 1,
            description:
              "Weight for keyword (full-text) search between 0 and 1. Higher values prioritize exact keyword matches.",
          }),
          start_date: t.Optional(
            t.String({
              description:
                'Optional start date for time-constrained queries in ISO format (e.g., "2023-01-01").',
            }),
          ),
          end_date: t.Optional(
            t.String({
              description:
                'Optional end date for time-constrained queries in ISO format (e.g., "2023-12-31").',
            }),
          ),
          collection_id: t.Numeric(),
          metadata: t.Optional(
            t.Union([t.Record(t.String(), t.Any()), t.String()]),
          ),
        }),
      },
    );
