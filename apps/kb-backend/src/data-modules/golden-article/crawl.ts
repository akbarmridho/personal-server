import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";
import type { GoldenArticleEvent } from "./ingest.js";

const keystoneKey = "data-modules.golden-article.last-crawl-id";

// Only type fields used in the transformation
export interface RawGoldenArticlePayload {
  id: number;
  title: string;
  styled_content: string;
  ts: number;
  emiten_code: string | null;
  images: Array<{
    image_url: string;
  }>;
}

export const goldenArticleCrawl = inngest.createFunction(
  {
    id: "golden-article-crawl",
    concurrency: 1,
  },
  { event: "data/golden-article-crawl" },
  async ({ event, step }) => {
    const toIngest = await step.run("filter-and-transform", async () => {
      const latestCrawl = (await KV.get(keystoneKey)) as {
        id: number;
      } | null;

      const keystoneId = latestCrawl?.id ?? 11786;

      // Filter articles with id > keystone
      const filtered = event.data.payload.filter(
        (article) => article.id > keystoneId,
      );

      // Transform to GoldenArticleEvent format
      const transformed: GoldenArticleEvent[] = filtered.map((article) => ({
        id: article.id,
        ts: article.ts,
        title: article.title,
        htmlContent: article.styled_content,
        images: article.images
          .map((img) => img.image_url)
          .filter((url) => url && url.trim() !== ""),
        symbols: article.emiten_code ? [article.emiten_code] : [],
      }));

      return transformed;
    });

    if (toIngest.length > 0) {
      // Send events for each article
      await step.sendEvent(
        "queue-ingest",
        toIngest.map((article) => ({
          name: "data/golden-article",
          data: article,
        })),
      );

      // Update keystone with largest id
      await step.run("update-keystone", async () => {
        const newValue = {
          id: Math.max(...toIngest.map((article) => article.id)),
        };

        await KV.set(keystoneKey, newValue);
      });
    }
  },
);
