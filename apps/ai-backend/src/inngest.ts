import { Inngest, type InngestFunction } from "inngest";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

export const inngest = new Inngest({
  id: "ai-backend",
  isDev: false,
  baseUrl: env.INNGEST_BASE_URL,
  logger: logger,
});

const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  },
);

export const inngestFunctions: InngestFunction.Like[] = [helloWorld];
