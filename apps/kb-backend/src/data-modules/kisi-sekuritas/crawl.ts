import axios from "axios";
import normalizeUrl from "normalize-url";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";

const researchLastCrawlID = "data-modules.kisi.research-last-id";

interface DocumentFile {
  download_link: string;
  original_name: string;
}

export interface ResearchAnalysis {
  id: number;
  title: string;
  document_file: string;
  date: string;
  type: "Daily" | "Weekly" | "Monthly" | "Bonds";
  created_at: string;
  updated_at: string | null;
}

export interface KisiApiResponse {
  status: boolean;
  path: string;
  code: number;
  message: string;
  data: ResearchAnalysis[];
}

const BASE_URL = "https://kisi.co.id/api/v1/web/research_analysis";

const fetchMonthlyResearch = async (
  limit: number,
): Promise<KisiApiResponse> => {
  const response = await axios.get<KisiApiResponse>(BASE_URL, {
    params: { limit },
    headers: {
      origin: "https://www.kisi.co.id",
      referer: "https://www.kisi.co.id/",
    },
  });
  return response.data;
};

export const kisiMonthlyResearchCrawl = inngest.createFunction(
  {
    id: "kisi-montly-research-crawl",
    concurrency: 1,
  },
  // daily at 19.30 from monday to friday
  { cron: "TZ=Asia/Jakarta 30 19 * * 1-5" },
  async ({ step }) => {
    const toScrape = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(researchLastCrawlID)) as {
        id: number;
      } | null;

      const response = await fetchMonthlyResearch(1200);

      const toScrape: {
        id: number;
        title: string;
        date: string;
        url: string;
      }[] = [];

      for (const doc of response.data) {
        if (doc.type !== "Monthly") continue;

        const files: DocumentFile[] = JSON.parse(doc.document_file);
        const pdfUrl = files[0]?.download_link;

        if (!pdfUrl) continue;
        if (latestCrawl?.id && doc.id <= latestCrawl.id) continue;

        toScrape.push({
          id: doc.id,
          title: doc.title,
          date: doc.date,
          url: normalizeUrl(`https://kisi.co.id/storage/${pdfUrl}`),
        });
      }

      return toScrape;
    });

    if (toScrape.length > 0) {
      // emit events
      await step.sendEvent(
        "queue-ingest",
        toScrape.map((e) => {
          return {
            name: "data/kisi-monthly-research-ingest",
            data: e,
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        let newValue = (await KV.get(researchLastCrawlID)) as {
          id: number;
        } | null;

        if (toScrape.length > 0) {
          newValue = { id: Math.max(...toScrape.map((e) => e.id)) };
        }

        await KV.set(researchLastCrawlID, newValue);
      });
    }
  },
);
