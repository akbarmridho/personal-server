import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

export const documentManualIngest = inngest.createFunction(
  { id: "document-manual-ingest", concurrency: 1 },
  { event: "data/document-manual-ingest" },
  async ({ event, step }) => {
    const documents: InvestmentDocument[] = await step.run(
      "prepare-payload",
      async () => {
        // Extract symbols from all documents
        const symbols = await extractSymbolFromTexts(
          event.data.payload.map((p) => {
            if (p.title) {
              return `${p.title}\n${p.content}`;
            }
            return p.content;
          }),
        );

        // Tag metadata for all documents
        const payloads = await tagMetadata(
          event.data.payload.map((p, i) => {
            return {
              date: p.document_date,
              content: p.content,
              title: p.title || null,
              urls: p.urls || [],
              subindustries: [],
              subsectors: [],
              symbols: symbols[i],
              indices: [],
            };
          }),
        );

        // Generate final documents with deterministic IDs
        return payloads.map((payload, i) => {
          // Use the ID from the event (already deterministic)
          return {
            id: event.data.payload[i].id,
            type: event.data.payload[i].type,
            title: payload.title,
            content: payload.content,
            document_date: payload.date,
            source: event.data.payload[i].source,
            urls: payload.urls,
            symbols: payload.symbols,
            subindustries: payload.subindustries,
            subsectors: payload.subsectors,
            indices: payload.indices,
          };
        });
      },
    );

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: documents,
      });
    });

    // Send Discord notification for analysis and rumour documents only
    const notifiableDocuments = documents.filter(
      (doc) => doc.type === "analysis" || doc.type === "rumour",
    );

    if (notifiableDocuments.length > 0) {
      await step.sendEvent("notify-discord", [
        {
          name: "notify/discord-kb-ingestion",
          data: { payload: notifiableDocuments },
        },
      ]);
    }
  },
);
