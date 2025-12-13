import axios from "axios";
import * as cheerio from "cheerio";
import normalizeUrl from "normalize-url";
import { KV } from "../../db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";

const TARGET_URL =
  "https://samuel.co.id/category-research-reports/company-reports-ssi/";
const BASE_URL = "https://samuel.co.id/";
const lastCrawlURLs = "data-modules.samuel.last-crawl-urls";

export const samuelCompanyReportsCrawl = inngest.createFunction(
  {
    id: "samuel-company-report-crawl",
    concurrency: 1,
  },
  // daily at 20.15 from monday to friday
  { cron: "TZ=Asia/Jakarta 15 20 * * 1-5" },
  async ({ step }) => {
    const toScrape = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(lastCrawlURLs)) as string[] | null;

      const { data: html } = await axios.get(TARGET_URL);
      const $ = cheerio.load(html);

      const urls: Set<string> = new Set();

      $(".jet-listing-grid.jet-listing a.jet-listing-dynamic-link__link").each(
        (_i, element) => {
          const el = $(element);
          const rawHref = el.attr("href");

          if (rawHref) {
            urls.add(normalizeUrl(new URL(rawHref, BASE_URL).toString()));
          }
        },
      );

      const toScrape: string[] = [];

      for (const url of urls) {
        if (latestCrawl?.includes(url)) {
          continue;
        }

        toScrape.push(url);
      }

      return toScrape;
    });

    if (toScrape.length > 0) {
      // emit events
      await step.sendEvent(
        "queue-ingest",
        toScrape.map((e) => {
          return {
            name: "data/samuel-company-report-ingest",
            data: {
              url: e,
            },
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        await KV.set(lastCrawlURLs, toScrape);
      });
    }
  },
);
