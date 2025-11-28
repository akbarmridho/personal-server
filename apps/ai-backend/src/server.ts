import Fastify from "fastify";
import { fastifyPlugin } from "inngest/fastify";
import { env } from "./env.js";
import { inngest, inngestFunctions } from "./inngest.js";

export async function createServer() {
  const fastify = Fastify({
    logger: true,
  });

  fastify.register(require("fastify-graceful-shutdown"));

  fastify.register(fastifyPlugin, {
    client: inngest,
    functions: inngestFunctions,
    options: {
      // default path
      servePath: "/api/inngest",
    },
  });

  fastify.listen({ port: env.HTTP_SERVER_PORT, host: "0.0.0.0" }, (err) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });
}
