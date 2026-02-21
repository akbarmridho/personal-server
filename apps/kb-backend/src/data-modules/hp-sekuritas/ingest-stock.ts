import dayjs from "dayjs";
import normalizeUrl from "normalize-url";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { reconstructPdfWithLLM } from "../utils/pdf-reconstruction.js";
import { tagMetadata } from "../utils/tagging.js";

export const extractCompanyReportPdf = async (url: string): Promise<string> => {
  const extracted = await reconstructPdfWithLLM({
    fileData: new URL(url),
  });
  return extracted.content;
};

const namespace = "1c58f364-c7e8-416f-8dff-e121beb5b589";

export const hpStockUpdateIngest = inngest.createFunction(
  { id: "hp-stock-update-ingest", concurrency: 1 },
  { event: "data/hp-stock-update-ingest" },
  async ({ event, step }) => {
    const summary = await step.run("extract", async () => {
      return await extractCompanyReportPdf(event.data.url);
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

        const normalizedUrl = normalizeUrl(event.data.url);

        return {
          id: uuidv5(`${event.data.id}`, namespace),
          type: "analysis" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source: {
            name: "henan-putihray-stock-report",
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
