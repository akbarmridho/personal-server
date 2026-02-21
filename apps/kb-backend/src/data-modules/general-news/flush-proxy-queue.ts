import { inngest } from "../../infrastructure/inngest.js";
import {
  clearGeneralNewsProxyQueue,
  getGeneralNewsProxyQueue,
} from "./proxy-queue.js";

export const generalNewsProxyQueueFlush = inngest.createFunction(
  {
    id: "general-news-proxy-queue-flush",
    concurrency: 1,
  },
  { event: "data/general-news-proxy-queue-flush" },
  async ({ step }) => {
    const queuedItems = await step.run("load-queued-items", async () => {
      return await getGeneralNewsProxyQueue();
    });

    if (queuedItems.length === 0) {
      return {
        success: true,
        queued: 0,
        emitted: 0,
      };
    }

    await step.run("clear-queue", async () => {
      await clearGeneralNewsProxyQueue();
    });

    await step.sendEvent(
      "queue-ingest",
      queuedItems.map((item) => {
        return {
          name: "data/general-news",
          data: item,
        };
      }),
    );

    return {
      success: true,
      queued: queuedItems.length,
      emitted: queuedItems.length,
    };
  },
);
