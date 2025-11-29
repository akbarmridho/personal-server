import cors from "@fastify/cors";
import { convertToModelMessages } from "ai";
import Fastify from "fastify";
import { fastifyPlugin } from "inngest/fastify";
import { weatherAgent } from "./agents/weather.js";
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
      // default path
      servePath: "/api/inngest",
    },
  });

  // setup ai agents
  fastify.post("/agents/weather", async (request, reply) => {
    const data = request.body as { messages: any };
    const result = await weatherAgent.stream({
      messages: convertToModelMessages(data.messages),
    });

    reply.header("Content-Type", "text/plain; charset=utf-8");

    logger.info(data, "DATA");

    reply.send(result.toUIMessageStreamResponse());
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
