import cors from "@fastify/cors";
import { convertToModelMessages, type UIMessage } from "ai";
import Fastify from "fastify";
import { fastifyPlugin } from "inngest/fastify";
import { getAgent } from "./agents/weather.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { inngest, inngestFunctions } from "./inngest.js";

export async function createServer() {
  const fastify = Fastify({
    loggerInstance: logger,
  });

  fastify.register(import("fastify-graceful-shutdown"));

  // Enable CORS for all origins
  fastify.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  fastify.register(fastifyPlugin, {
    client: inngest,
    functions: inngestFunctions,
    options: {
      servePath: "/api/inngest",
    },
  });

  // setup ai agents
  // todo
  // resumable streams: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams
  // https://github.com/vercel/ai/issues/6422#issuecomment-3350874035 (workaround)
  fastify.post("/api/chat", async (request, reply) => {
    const data = request.body as {
      id: string;
      metadata: Record<string, any>;
      trigger: "submit-message" | "regenerate-message";
      messages: UIMessage[];
      tools: Record<string, any>;
    };

    const agent = getAgent("agent", data.tools);

    const result = await agent.stream({
      messages: convertToModelMessages(data.messages),
    });

    reply.header("Content-Type", "text/plain; charset=utf-8");

    return reply.send(result.toUIMessageStreamResponse());
  });

  fastify.listen({ port: env.HTTP_SERVER_PORT, host: "0.0.0.0" }, (err) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });

  return fastify;
}

async function main() {
  await createServer();
}

main().catch(console.error);
