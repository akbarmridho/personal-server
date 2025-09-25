import { cors } from "@elysiajs/cors";
import { node } from "@elysiajs/node";
import { openapi } from "@elysiajs/openapi";
import { logger } from "@personal-server/common/utils/logger";
import { Elysia, t } from "elysia";
import { pluginGracefulServer } from "graceful-server-elysia";
import { db } from "./db/db.js";
import { env } from "./env.js";
import { pdfToMarkdownConverter } from "./file-converters/pdf-to-md-converter.js";
import { retriever } from "./storage/retrieve.js";
import { vectorStore } from "./storage/store.js";
import { parseDate } from "./utils/date.js";

const EMBEDDING_WEIGHT = 0.7;
const FULLTEXT_WEIGHT = 0.3;

export const setupServer = () => {
  const app = new Elysia({ adapter: node() })
    .use(pluginGracefulServer({}))
    .use(
      cors({
        origin: true,
      }),
    )
    .use(openapi())
    .get("/", () => "Hello World!")
    .post(
      "/documents",
      async ({ body }) => {
        try {
          let finalContent: string;

          if ("content" in body && body.content) {
            // Text content provided directly
            finalContent = body.content;
          } else if ("file" in body && body.file) {
            if (!body.file.type.includes("pdf")) {
              throw new Error("Only pdf file are supported");
            }

            // File uploaded (PDF)

            finalContent = await pdfToMarkdownConverter.convert(body.file);
          } else {
            throw new Error("Either `content` or `file` must be provided");
          }

          let documentTs: Date | null = null;

          if (body.document_ts) {
            const parsed = parseDate(body.document_ts);

            if (parsed === null) {
              throw new Error("Invalid document_ts");
            }

            documentTs = parsed;
          }

          const result = await vectorStore.storeDocument({
            collection_id: body.collection_id,
            title: body.title,
            content: finalContent,
            document_ts: documentTs,
            metadata: body.metadata,
          });

          return { success: true, ...result };
        } catch (err) {
          logger.error(err, "Failed to store document");
          return { success: false, error: (err as Error).message };
        }
      },
      {
        body: t.Union([
          // JSON body
          t.Object({
            collection_id: t.Number(),
            title: t.String(),
            content: t.Optional(t.String()),
            document_ts: t.Optional(t.String()),
            metadata: t.Optional(t.Record(t.String(), t.Any())),
          }),
          // Multipart with file
          t.Object({
            collection_id: t.Number(),
            title: t.String(),
            file: t.File(),
            document_ts: t.Optional(t.String()),
            metadata: t.Optional(t.Record(t.String(), t.Any())),
          }),
        ]),
      },
    )
    .get("/collections", async () => {
      const rows = await db.selectFrom("collections").selectAll().execute();
      return rows;
    })
    .get(
      "/collections/:id/documents",
      async ({ params }) => {
        const docs = await vectorStore.getDocuments(Number(params.id));
        return docs;
      },
      {
        params: t.Object({
          id: t.Numeric(),
        }),
      },
    )
    .delete(
      "/documents/:id",
      async ({ params }) => {
        const result = await vectorStore.deleteDocumentById(Number(params.id));
        return result;
      },
      {
        params: t.Object({
          id: t.Numeric(),
        }),
      },
    )
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
          }: {
            query: string;
            hyde_answer: string;
            embedding_weight: number;
            fulltext_weight: number;
            start_date?: string;
            end_date?: string;
            collection_id: number;
          } = body;

          const results = await retriever.hierarchicalSearch(
            query,
            hyde_answer,
            collection_id,
            {
              embedding_weight: embedding_weight,
              fulltext_weight: fulltext_weight,
              start_date: start_date,
              end_date: end_date,
            },
          );

          return { success: true, results };
        } catch (err) {
          logger.error(err, "Search failed");
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
              "A hypothetical answer (HYDE) to guide the retrieval process. This improves search quality significantly. Should be 25-50 words that directly answer the query.",
          }),
          embedding_weight: t.Number({
            description:
              "Weight for semantic (embedding) search between 0 and 1. Higher values prioritize conceptual matches.",
            minimum: 0,
            maximum: 1,
            default: EMBEDDING_WEIGHT,
          }),
          fulltext_weight: t.Number({
            description:
              "Weight for keyword (full-text) search between 0 and 1. Higher values prioritize exact keyword matches.",
            minimum: 0,
            maximum: 1,
            default: FULLTEXT_WEIGHT,
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
          collection_id: t.Number(),
        }),
      },
    )
    .listen(env.SERVER_PORT, ({ hostname, port }) => {
      logger.info(`🦊 Elysia is running at ${hostname}:${port}`);
    });

  return app;
};
