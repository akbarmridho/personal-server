import { inngest } from "../../infrastructure/inngest.js";
import { logger } from "../../utils/logger.js";
import { INSTAGRAM_CRAWL_CRON } from "../schedule.js";
import { fetchPosts, filterNewPosts, INSTAGRAM_ACCOUNTS } from "./utils.js";

export const instagramCrawl = inngest.createFunction(
  {
    id: "instagram-crawl",
    concurrency: 1,
  },
  { cron: INSTAGRAM_CRAWL_CRON },
  async ({ step }) => {
    const posts = await step.run("fetch-posts", async () => {
      const urls = INSTAGRAM_ACCOUNTS.map((a) => a.url);
      return await fetchPosts(urls, 20);
    });

    const newPosts = await step.run("filter-new", async () => {
      return await filterNewPosts(posts);
    });

    if (newPosts.length === 0) {
      logger.info("Instagram crawl: no new posts");
      return { ingested: 0 };
    }

    const events = newPosts.map((post) => ({
      name: "data/instagram-ingest" as const,
      data: { post, notify: true },
    }));

    await step.sendEvent("dispatch-ingest", events);

    return { dispatched: newPosts.length };
  },
);

export const instagramManualCrawl = inngest.createFunction(
  {
    id: "instagram-manual-crawl",
    concurrency: 1,
  },
  { event: "data/instagram-crawl" },
  async ({ event, step }) => {
    const { url, backfill } = event.data;
    const limit = backfill ? 100 : 20;

    const posts = await step.run("fetch-posts", async () => {
      return await fetchPosts([url], limit);
    });

    const newPosts = await step.run("filter-new", async () => {
      return await filterNewPosts(posts);
    });

    if (newPosts.length === 0) {
      logger.info("Instagram manual crawl: no new posts");
      return { ingested: 0 };
    }

    const notify = !backfill;
    const events = newPosts.map((post) => ({
      name: "data/instagram-ingest" as const,
      data: { post, notify },
    }));

    await step.sendEvent("dispatch-ingest", events);

    return { dispatched: newPosts.length };
  },
);
