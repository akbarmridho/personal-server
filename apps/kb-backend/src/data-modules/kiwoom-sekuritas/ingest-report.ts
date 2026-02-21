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

const extractPdfContent = async (url: string): Promise<string> => {
  const extracted = await reconstructPdfWithLLM({
    fileData: new URL(url),
  });
  return extracted.content;
};

const namespace = "48649116-a628-435a-ba35-523582c862ae";

export const kiwoomEquityReportIngest = inngest.createFunction(
  { id: "kiwoom-equity-report-ingest", concurrency: 1 },
  { event: "data/kiwoom-equity-report-ingest" },
  async ({ event, step }) => {
    const summary = await step.run("extract", async () => {
      return await extractPdfContent(event.data.pdfUrl);
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
              date: event.data.date,
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
          id: uuidv5(`${event.data.id}`, namespace),
          type: "analysis" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source: {
            name: "kiwoom-equity-report",
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
