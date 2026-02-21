import dayjs from "dayjs";
import axios from "axios";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { NonRetriableError } from "inngest";
import normalizeUrl from "normalize-url";
import pRetry from "p-retry";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { stockProxyUrl } from "../../stock/proxy-url.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { reconstructPdfWithLLM } from "../utils/pdf-reconstruction.js";
import { tagMetadata } from "../utils/tagging.js";

const namespace = "f33a43b1-015d-448d-8f72-a8789dcc5187";

/**
 * Download PDF via proxy with retry logic
 */
const fetchPdfViaProxy = async (url: string): Promise<Buffer> => {
  return await pRetry(
    async () => {
      const { proxy_url: proxyUrl } = await stockProxyUrl.getOrThrow();
      const response = await axios.get(url, {
        httpAgent: new HttpProxyAgent(proxyUrl),
        httpsAgent: new HttpsProxyAgent(proxyUrl),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        responseType: "arraybuffer",
      });

      if (response.status === 404) {
        throw new NonRetriableError("PDF URL not found (404)");
      }

      if (!response.data) {
        throw new Error("Empty PDF response");
      }

      return Buffer.from(response.data);
    },
    { retries: 5 },
  );
};

/**
 * Download PDF via proxy and extract full content via shared prompt
 */
const downloadAndExtractPdf = async (url: string): Promise<string> => {
  const pdfBuffer = await fetchPdfViaProxy(url);
  const extracted = await reconstructPdfWithLLM({
    fileData: Uint8Array.from(pdfBuffer),
  });
  return extracted.content;
};

export const phintracoCompanyUpdateIngest = inngest.createFunction(
  { id: "phintraco-company-update-ingest", concurrency: 1 },
  { event: "data/phintraco-company-update-ingest" },
  async ({ event, step }) => {
    const summary = await step.run("download-and-extract", async () => {
      return await downloadAndExtractPdf(event.data.pdfUrl);
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
