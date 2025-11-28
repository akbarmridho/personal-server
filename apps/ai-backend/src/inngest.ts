import { Inngest, type InngestFunction } from "inngest";
import { env } from "./env.js";

export const inngest = new Inngest({
  id: "ai-backend",
  isDev: false,
  baseUrl: env.INNGEST_BASE_URL,
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
