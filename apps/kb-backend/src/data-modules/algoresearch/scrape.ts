import axios from "axios";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import type { ArticleContent } from "./types.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const algoresearchScrape = inngest.createFunction(
  { id: "algoresearch-scrape", concurrency: 1 },
  { event: "data/algoresearch-scrape" },
  async ({ event, step }) => {
    const data = await step.run("scrape", async () => {
      const date = dayjs(event.data.published_at).tz("Asia/Jakarta");
      const type =
        event.data.content_type === "free" ? "algo-news" : "algo-research";

      const [firstContent, secondContent] = await Promise.all([
        axios.get(
          `https://backend.algoresearch.id/v1/client/${type}/first-content/${date.format("YYYY-MM-DD")}/${event.data.article_slug}`,
          {
            headers: {
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "en-US,en;q=0.6",
              Authorization: env.ALGORESEARCH_AUTH,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Origin: "https://algoresearch.id",
              Referer: "https://algoresearch.id/",
              Cookie: env.ALGORESEARCH_COOKIE,
            },
          },
        ),
        axios.get(
          `https://backend.algoresearch.id/v1/client/${type}/second-content/${date.format("YYYY-MM-DD")}/${event.data.article_slug}`,
          {
            headers: {
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "en-US,en;q=0.6",
              Authorization: env.ALGORESEARCH_AUTH,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Origin: "https://algoresearch.id",
              Referer: "https://algoresearch.id/",
              Cookie: env.ALGORESEARCH_COOKIE,
            },
          },
        ),
      ]);

      const articleUrl = `https://algoresearch.id/${event.data.content_type === "free" ? "insight/content" : "content"}/${date.format("YYYY/MM/DD")}/${event.data.article_slug}`;

      return {
        ...event.data,
        first_content: firstContent.data as ArticleContent["first_content"],
        second_content: secondContent.data as ArticleContent["second_content"],
        url: articleUrl,
      };
    });

    await step.sendEvent("queue-ingest", [
      {
        name: "data/algoresearch-ingest",
        data: data,
      },
    ]);
  },
);
