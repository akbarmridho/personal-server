import dayjs from "dayjs";
import normalizeUrl from "normalize-url";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { summarizeCompanyReportPdf } from "../hp-sekuritas/ingest-stock.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";

const namespace = "f33a43b1-015d-448d-8f72-a8789dcc5187";

export const phintracoCompanyUpdateIngest = inngest.createFunction(
  { id: "phintraco-company-update-ingest", concurrency: 1 },
  { event: "data/phintraco-company-update-ingest" },
  async ({ event, step }) => {
    const summary = await step.run("extract", async () => {
      return await summarizeCompanyReportPdf(event.data.pdfUrl);
    });

    const payload: InvestmentDocument = await step.run(
      "prepare-payload",
      async () => {
        const symbols = (
          await extractSymbolFromTexts([`${event.data.title}\n${summary}`])
        )[0];

        const tagged = (
          await tagMetadata([
            {
              date: dayjs(event.data.date).format("YYYY-MM-DD"),
              content: summary,
              title: event.data.title,
              urls: [],
              subindustries: [],
              subsectors: [],
              symbols: symbols,
              indices: [],
            },
          ])
        )[0];

        const normalizedUrl = normalizeUrl(event.data.pdfUrl);

        return {
          id: uuidv5(`${event.data.pdfUrl}`, namespace),
          type: "analysis" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source: {
            name: "phintraco-company-update",
            url: normalizedUrl,
          },
          urls: [] as string[],
          symbols: tagged.symbols,
          subindustries: tagged.subindustries,
          subsectors: tagged.subsectors,
          indices: tagged.indices,
        };
      },
    );

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: [payload],
      });
    });

    await step.sendEvent("notify-discord", [
      {
        name: "notify/discord-kb-ingestion",
        data: { payload: [payload] },
      },
    ]);
  },
);
