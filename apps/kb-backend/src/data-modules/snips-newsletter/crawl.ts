import axios from "axios";
import * as cheerio from "cheerio";
import dayjs, { type Dayjs } from "dayjs";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";
import { logger } from "../../utils/logger.js";

const TARGET_URL = "https://snips.stockbit.com/snips-terbaru/";
const BASE_URL = "https://snips.stockbit.com/";
const BACKFILL_LATEST_URL = "2025-12-03";
const lastCrawlDateKey = "data-modules.snips.last-scrape-date";

export const snipsCrawl = inngest.createFunction(
  {
    id: "snips-crawl",
    concurrency: 1,
  },
  // daily at 20.30 from monday to friday
  { cron: "TZ=Asia/Jakarta 30 20 * * 1-5" },
  async ({ step }) => {
    const { toScrape, latestCrawlDate } = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(lastCrawlDateKey)) as {
        date: string;
      } | null;

      const { data: html } = await axios.get(TARGET_URL);
      const $ = cheerio.load(html);
      const lastCrawlDate = dayjs(
        latestCrawl ? latestCrawl.date : BACKFILL_LATEST_URL,
      );

      if (!lastCrawlDate.isValid()) {
        throw new Error("Invalid Keystone Date format");
      }

      const articles: Array<{
        url: string;
        date: Dayjs;
        originalDateString: string;
      }> = [];

      $("article.tag-snips").each((_i, element) => {
        const el = $(element);

        // Selectors based on your requirements
        const titleAnchor = el.find("h1.entry-title > a");
        const timeElement = el.find("h1.entry-title time");

        const rawHref = titleAnchor.attr("href");
        const dateTimeStr = timeElement.attr("datetime");

        if (rawHref && dateTimeStr) {
          // Resolve anchor links relative to BASE_URL
          // If rawHref is already absolute, URL() handles it correctly.
          // If relative, it appends to BASE_URL.
          const absoluteUrl = new URL(rawHref, BASE_URL).toString();

          // Parse date
          const articleDate = dayjs(dateTimeStr);

          if (articleDate.isValid()) {
            articles.push({
              url: absoluteUrl,
              date: articleDate,
              originalDateString: dateTimeStr,
            });
          }
        }
      });

      const newArticles = articles.filter((article) =>
        article.date.isAfter(lastCrawlDate),
      );

      let latestDateFound: Dayjs | null = null;

      if (newArticles.length > 0) {
        // Sort descending to easily pick the latest
        newArticles.sort((a, b) => b.date.valueOf() - a.date.valueOf());

        latestDateFound = newArticles[0].date;
      } else {
        logger.info("No new articles found since last crawl.");
      }

      return {
        latestCrawlDate: latestDateFound
          ? latestDateFound.format("YYYY-MM-DD")
          : null,
        toScrape: newArticles.map((a) => ({
          url: a.url,
          date: a.date.format("YYYY-MM-DD"),
        })),
      };
    });

    if (latestCrawlDate && toScrape.length > 0) {
      // emit events
      await step.sendEvent(
        "queue-scrape",
        toScrape.map((e) => {
          return { name: "data/snips-scrape", data: e };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        await KV.set(lastCrawlDateKey, { date: latestCrawlDate });
      });
    }
  },
);
