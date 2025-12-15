import axios from "axios";
import dayjs from "dayjs";
import { env } from "../../infrastructure/env.js";
import { inngest } from "../../infrastructure/inngest.js";
import type { ArticleContent } from "./types.js";

export const algoresearchScrape = inngest.createFunction(
  { id: "algoresearch-scrape", concurrency: 1 },
  { event: "data/algoresearch-scrape" },
  async ({ event, step }) => {
    const data: ArticleContent = await step.run("scrape", async () => {
      const date = dayjs(event.data.published_at).format("YYYY?MM-DD");

      const [firstContent, secondContent] = await Promise.all([
        axios.get(
          `https://backend.algoresearch.id/v1/client/algo-news/first-content/${date}/${event.data.article_slug}`,
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
          `https://backend.algoresearch.id/v1/client/algo-news/second-content/${date}/${event.data.article_slug}`,
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

      const articleUrl = `https://algoresearch.id/content/${dayjs(event.data.published_at).format("YYYY/MM/DD")}/${event.data.article_slug}`;

      return {
        ...event.data,
        first_content: firstContent.data as ArticleContent["first_content"],
        second_content: secondContent.data as ArticleContent["second_content"],
        url: articleUrl,
      };
    });

    await step.run("process-document", async () => {
      await step.sendEvent("queue-ingest", [
        {
          name: "data/algoresearch-ingest",
          data: data,
        },
      ]);
    });
  },
);
