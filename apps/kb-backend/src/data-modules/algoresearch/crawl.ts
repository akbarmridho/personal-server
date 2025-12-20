import axios from "axios";
import dayjs from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import type { ArticleInfo } from "./types.js";

const TARGET_URL =
  "https://backend.algoresearch.id/v1/client/algo-content/latest?page=1&limit=12&sortdesc=published_at,id&query=&startdate=&enddate=";
const lastCrawlDate = "data-modules.algoresearch.last-crawl-date";

export const algoResearchCrawl = inngest.createFunction(
  {
    id: "algoresearch-crawl",
    concurrency: 1,
  },
  // daily at 20.00 from monday to friday
  { cron: "TZ=Asia/Jakarta 0 20 * * 1-5" },
  async ({ step }) => {
    const { keystone, toScrape } = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(lastCrawlDate)) as {
        date: string;
      } | null;

      const keystoneDate = dayjs(
        latestCrawl?.date || "2025-12-10T00:00:00.000Z",
      );

      const response = await axios.get(TARGET_URL, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.6",
          Authorization: env.ALGORESEARCH_AUTH,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Origin: "https://algoresearch.id",
          Referer: "https://algoresearch.id/",
        },
      });

      const raw = response.data.data.data as ArticleInfo[];

      const filtered = raw.filter((e) => {
        return dayjs(e.published_at).isAfter(keystoneDate);
      });

      const highestPublishedAt = filtered.reduce((latest, item) => {
        const current = dayjs(item.published_at);
        return current.isAfter(latest) ? current : latest;
      }, keystoneDate);

      return {
        toScrape: filtered,
        keystone: highestPublishedAt.toISOString(),
      };
    });

    if (toScrape.length > 0) {
      // emit events
      await step.sendEvent(
        "queue-scrape",
        toScrape.map((e) => {
          return {
            name: "data/algoresearch-scrape",
            data: e,
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        await KV.set(lastCrawlDate, { date: keystone });
      });
    }
  },
);
