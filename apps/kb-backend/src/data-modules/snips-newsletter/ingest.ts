import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { cleanupSnips } from "./cleanup.js";
import { tagSnips } from "./tagging.js";

const namespace = "05675adf-779d-4b78-b6f8-ab30e06707ee";

export const snipsIngestPart = inngest.createFunction(
  { id: "snips-ingest-part", concurrency: 1 },
  { event: "data/snips-part" },
  async ({ event, step }) => {
    const parts = await step.run("cleanup", async () => {
      // no network calls, 99.9% succeed
      const cleanedUp = await cleanupSnips(event.data.payload);

      const hasSymbol = cleanedUp.filter((e) => e.symbols.length > 0);
      const noSymbol = cleanedUp.filter((e) => e.symbols.length === 0);

      return {
        hasSymbol,
        noSymbol,
      };
    });

    const noSymbol = await Promise.all(
      parts.noSymbol.map((part, i) =>
        step.run(`tag-${i}`, async () => {
          // cna have network calls
          return (await tagSnips([part]))[0];
        }),
      ),
    );

    const payload = await step.run("prepare-payload", async () => {
      const hasSymbolMapped = await tagSnips(parts.hasSymbol);
      const data: InvestmentDocument[] = [...hasSymbolMapped, ...noSymbol].map(
        (e) => {
          return {
            id: uuidv5(`${e.date}${e.content}`, namespace),
            type: "news",
            title: e.title,
            content: e.content,
            document_date: e.date,
            source: {
              name: "stockbit-snips",
            },
            urls: e.urls,
            symbols: e.symbols,
            subindustries: e.subindustries,
            subsectors: e.subsectors,
            indices: e.indices,
          };
        },
      );

      return data;
    });

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: payload,
      });
    });
  },
);
