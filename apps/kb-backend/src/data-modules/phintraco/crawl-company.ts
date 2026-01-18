import axios from "axios";
import * as cheerio from "cheerio";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const keystoneKey = "data-modules.phintraco-company-update";
const targetUrl = "https://phintracosekuritas.com/category/company-update/";

interface Keystone {
  urls: string[]; // scraped URLs
}

/**
 * Parses a WordPress URL and returns the date in YYYY-MM-DD format.
 * Priority: 8-digit string in filename > /uploads/YYYY/MM/ path.
 */
function extractDateFromUrl(url: string): string | null {
  // 1. Try to find the 8-digit pattern (e.g., 20260113)
  const filenameDateMatch = url.match(/(\d{8})/);
  if (filenameDateMatch) {
    const dateStr = filenameDateMatch[1];
    const parsed = dayjs(dateStr, "YYYYMMDD");
    if (parsed.isValid()) {
      return parsed.format("YYYY-MM-DD");
    }
  }

  // 2. Fallback: Try to find the wp-content/uploads/YYYY/MM pattern
  const folderDateMatch = url.match(/\/uploads\/(\d{4})\/(\d{2})\//);
  if (folderDateMatch) {
    const [_, year, month] = folderDateMatch;
    // We assume the 1st of the month for folder-only matches
    const parsed = dayjs(`${year}-${month}-01`);
    if (parsed.isValid()) {
      return parsed.format("YYYY-MM-DD");
    }
  }

  return null;
}

export const phintracoCompanyUpdateCrawl = inngest.createFunction(
  {
    id: "phintraco-company-update-crawl",
    concurrency: 1,
  },
  // daily at 21.00 from monday to friday
  { cron: "TZ=Asia/Jakarta 0 21 * * 1-5" },
  async ({ step }) => {
    const toScrape = await step.run("crawl", async () => {
      const keystoneData = (await KV.get(keystoneKey)) as Keystone | null;

      const scrapedUrls = new Set<string>(keystoneData?.urls || []);

      const { data: html } = await axios.get(targetUrl);

      const data: Array<{ url: string; title: string }> = [];

      const $ = cheerio.load(html);

      $("#berita .card a").each((_i, element) => {
        const el = $(element);
        const rawHref = el.attr("href");

        if (
          rawHref?.includes("wp-content/uploads") &&
          !scrapedUrls.has(rawHref)
        ) {
          // Extract the title from the h4 tag inside this anchor
          const title = el.find("h4").text().trim();

          data.push({
            url: rawHref,
            title: title || "Uknown Title",
          });
        }
      });

      return data;
    });

    if (toScrape.length > 0) {
      // emit events
      await step.sendEvent(
        "queue-ingest",
        toScrape.map((data) => {
          return {
            name: "data/phintraco-company-update-ingest",
            data: {
              pdfUrl: data.url,
              title: data.title,
              date:
                extractDateFromUrl(data.url) || dayjs().format("YYYY-MM-DD"),
            },
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        const keystoneData = (await KV.get(keystoneKey)) as Keystone | null;

        const newUrls = new Set<string>();

        if (keystoneData) {
          keystoneData.urls.forEach((url) => {
            newUrls.add(url);
          });
        }

        toScrape.forEach((data) => {
          newUrls.add(data.url);
        });

        await KV.set(keystoneKey, { urls: [...newUrls] } satisfies Keystone);
      });
    }
  },
);
