import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

const namespace = "42f153e2-fad9-4b2c-8b22-5cba842272c1";

export const documentManualIngest = inngest.createFunction(
  { id: "document-manual-ingest", concurrency: 1 },
  { event: "data/document-manual-ingest" },
  async ({ event, step }) => {
    const documents: InvestmentDocument[] = await step.run(
      "prepare-payload",
      async () => {
        const symbols = await extractSymbolFromTexts(
          event.data.payload.map((p) => {
            if (p.title) {
              return `${p.title}\n${p.content}`;
            }

            return p.content;
          }),
        );

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

        return payloads.map((payload, i) => {
          return {
            id: uuidv5(`${event.data.payload[i].id}`, namespace),
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
  },
);
