import axios from "axios";
import normalizeUrl from "normalize-url";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";
import { logger } from "../../utils/logger.js";

const stockLastCrawlID = "data-modules.hp.stock-last-crawl-id";
const marketLastCrawlID = "data-modules.hp.market-last-crawl-id";

export interface StrapiResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface Insight {
  id: number;
  attributes: {
    title: string;
    updatedAt: string;
    createdAt: string;
    publishedAt: string;
    is_active: boolean;
    is_member_only: boolean;
    is_popular: boolean;
    locale: string;
    pdf_url?: {
      data: StrapiFile | null;
    };
    thumbnail_url?: any;
    categories?: any;
    subcategories?: any;
  };
}

export interface StrapiFile {
  id: number;
  attributes: {
    name: string;
    alternativeText: string | null;
    caption: string | null;
    width: number | null;
    height: number | null;
    formats: any;
    hash: string;
    ext: string;
    mime: string;
    size: number;
    url: string;
    previewUrl: string | null;
    provider: string;
    provider_metadata: any | null;
    createdAt: string;
    updatedAt: string;
  };
}

const BASE_URL = "https://reactor.hpsekuritas.id/hps-strapi/api/insights";

export const fetchInsights = async (
  pageSize: number,
  type: "Market" | "Stocks",
  page?: number,
): Promise<StrapiResponse<Insight>> => {
  try {
    const response = await axios.get<StrapiResponse<Insight>>(BASE_URL, {
      params: {
        populate: ["pdf_url", "thumbnail_url", "categories", "subcategories"],
        sort: "updatedAt:desc",
        pagination: {
          page: page ? page : 1,
          pageSize: pageSize,
        },
        filters: {
          categories: {
            title: {
              $eq: type,
            },
          },
        },
      },
      // Strapi often requires specific array formatting.
      // Axios default serialization usually works, but if Strapi complains,
      // we add this specifically for the array parameters (populate).
      paramsSerializer: {
        indexes: null, // Result: populate[0]=...&populate[1]=...
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error({ error }, "Axios error message:");
      // You might want to throw error or return null depending on your architecture
      throw error;
    } else {
      logger.error({ error }, "Unexpected error:");
      throw new Error("An unexpected error occurred");
    }
  }
};

export const hpStockUpdateCrawl = inngest.createFunction(
  {
    id: "hp-stock-update-crawl",
    concurrency: 1,
  },
  // daily at 20.00 from monday to friday
  { cron: "TZ=Asia/Jakarta 0 20 * * 1-5" },
  async ({ step }) => {
    const toScrape = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(stockLastCrawlID)) as {
        id: number;
      } | null;

      const pageSize = latestCrawl?.id ? 4 : 100;

      const response = await fetchInsights(pageSize, "Stocks");

      const toScrape: {
        id: number;
        title: string;
        date: string;
        url: string;
      }[] = [];

      for (const doc of response.data) {
        const pdfUrl = doc.attributes.pdf_url?.data?.attributes?.url ?? "";

        if (!pdfUrl) {
          continue;
        }

        if (latestCrawl?.id && doc.id <= latestCrawl.id) {
          continue;
        }

        toScrape.push({
          id: doc.id,
          title: doc.attributes.title,
          date: doc.attributes.publishedAt,
          url: normalizeUrl(pdfUrl),
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
            name: "data/hp-stock-update-ingest",
            data: e,
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        let newValue = (await KV.get(stockLastCrawlID)) as {
          id: number;
        } | null;

        if (toScrape.length > 0) {
          newValue = { id: Math.max(...toScrape.map((e) => e.id)) };
        }

        await KV.set(stockLastCrawlID, newValue);
      });
    }
  },
);

export const hpMarketUpdateCrawl = inngest.createFunction(
  {
    id: "hp-market-update-crawl",
    concurrency: 1,
  },
  // daily at 20.35 from monday to friday
  { cron: "TZ=Asia/Jakarta 35 20 * * 1-5" },
  async ({ step }) => {
    const toScrape = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(marketLastCrawlID)) as {
        id: number;
      } | null;

      const pageSize = latestCrawl?.id ? 4 : 400;

      const response = await fetchInsights(pageSize, "Market");

      const toScrape: {
        id: number;
        title: string;
        date: string;
        url: string;
      }[] = [];

      for (const doc of response.data) {
        const pdfUrl = doc.attributes.pdf_url?.data?.attributes?.url ?? "";

        if (!pdfUrl) {
          continue;
        }

        if (latestCrawl?.id && doc.id <= latestCrawl.id) {
          continue;
        }

        toScrape.push({
          id: doc.id,
          title: doc.attributes.title,
          date: doc.attributes.publishedAt,
          url: normalizeUrl(pdfUrl),
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
            name: "data/hp-market-update-ingest",
            data: e,
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        let newValue = (await KV.get(marketLastCrawlID)) as {
          id: number;
        } | null;

        if (toScrape.length > 0) {
          newValue = { id: Math.max(...toScrape.map((e) => e.id)) };
        }

        await KV.set(marketLastCrawlID, newValue);
      });
    }
  },
);
