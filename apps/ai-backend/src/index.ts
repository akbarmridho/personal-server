import { convertToModelMessages } from "ai";
import Fastify from "fastify";
import { fastifyPlugin } from "inngest/fastify";
import { weatherAgent } from "./agents/weather.js";
import { env } from "./config/env.js";
import { inngest, inngestFunctions } from "./inngest.js";

export async function createServer() {
  const fastify = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            },
          }
        : true,
  });

  fastify.register(import("fastify-graceful-shutdown"));

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
