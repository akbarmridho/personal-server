import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { NonRetriableError } from "inngest";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";
import {
  getStockbitStatusCode,
  stockbitGetJson,
} from "../../stock/stockbit/client.js";
import { logger } from "../../utils/logger.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const keystoneKey = "data-modules.general-news.stockbit-stream";
const STOCKBIT_NEWS_STREAM_URL =
  "https://exodus.stockbit.com/stream/v3?category=STREAM_CATEGORY_NEWS&last_stream_id=0&limit=40";

interface Keystone {
  latestStreamId: number;
  updatedAt: string;
}

export interface StockbitNewsStreamCrawlEvent {
  message: string;
}

interface StockbitNewsStreamItem {
  stream_id: number;
  title_url: string;
  created_at: string;
}

interface StockbitNewsStreamResponse {
  message: string;
  data: {
    stream?: StockbitNewsStreamItem[];
  };
}

function toReferenceDate(createdAt: string): string | null {
  const parsed = dayjs.tz(createdAt, "YYYY-MM-DD HH:mm:ss", "Asia/Jakarta");

  if (!parsed.isValid()) {
    return null;
  }

  return parsed.format("YYYY-MM-DD");
}

function isValidHttpUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const stockbitNewsStreamCrawl = inngest.createFunction(
  {
    id: "stockbit-news-stream-crawl",
    concurrency: 1,
  },
  { event: "stockbit-news-stream-crawl" },
  async ({ step }) => {
    const latestState = await step.run("get-keystone", async () => {
      return (await KV.get(keystoneKey)) as Keystone | null;
    });

    const response = await step.run("fetch-stream", async () => {
      try {
        return await stockbitGetJson<StockbitNewsStreamResponse>(
          STOCKBIT_NEWS_STREAM_URL,
        );
      } catch (error) {
        const status = getStockbitStatusCode(error);
        if (status === 401 || status === 403) {
          throw new NonRetriableError(
            `Stockbit news stream authentication failed: ${status}`,
          );
        }

        throw error;
      }
    });

    const stream = response.data.stream ?? [];

    if (stream.length === 0) {
      logger.info("Stockbit news stream returned no items");
      return {
        success: true,
        emitted: 0,
        latestStreamId: latestState?.latestStreamId ?? 0,
      };
    }

    const freshItems = await step.run("filter-new-items", async () => {
      const lastStreamId = latestState?.latestStreamId ?? 0;

      return stream
        .filter((item) => item.stream_id > lastStreamId)
        .map((item) => {
          const referenceDate = toReferenceDate(item.created_at);

          return {
            streamId: item.stream_id,
            url: item.title_url.trim(),
            referenceDate,
          };
        })
        .filter((item) => item.referenceDate && isValidHttpUrl(item.url))
        .sort((a, b) => a.streamId - b.streamId);
    });

    if (freshItems.length > 0) {
      await step.sendEvent(
        "queue-general-news-ingest",
        freshItems.map((item) => ({
          name: "data/general-news" as const,
          data: {
            url: item.url,
            referenceDate: item.referenceDate ?? undefined,
          },
        })),
      );
    }

    await step.run("update-keystone", async () => {
      const latestStreamId = Math.max(...stream.map((item) => item.stream_id));
      await KV.set(keystoneKey, {
        latestStreamId,
        updatedAt: new Date().toISOString(),
      } satisfies Keystone);
    });

    logger.info(
      {
        total: stream.length,
        emitted: freshItems.length,
        latestStreamId: Math.max(...stream.map((item) => item.stream_id)),
      },
      "Stockbit news stream crawl completed",
    );

    return {
      success: true,
      emitted: freshItems.length,
      latestStreamId: Math.max(...stream.map((item) => item.stream_id)),
    };
  },
);
