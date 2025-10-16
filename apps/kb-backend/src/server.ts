import { logger as elysiaLogger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { node } from "@elysiajs/node";
import { swagger } from "@elysiajs/swagger";
import { logger } from "@personal-server/common/utils/logger";
import { Elysia } from "elysia";
import { pluginGracefulServer } from "graceful-server-elysia";
import { env } from "./env.js";
import { setupRagRoutes } from "./rag/http.js";

export const setupHTTPServer = () => {
  const app = new Elysia({ adapter: node() })
    .use(pluginGracefulServer({}))
    .use(
      elysiaLogger({
        autoLogging: true,
      }),
    )
    .use(
      cors({
        origin: true,
      }),
    )
    .onError(({ code, error }) => {
      logger.error(error, `Error received: ${code}`);
      return new Response(error.toString());
    })
    .use(
      swagger({
        exclude: ["/live", "/ready"],
        path: "/docs",
        provider: "scalar",
      }),
    )
    .get("/", () => "Hello World!")

    // Attach RAG routes under /rag prefix
    .use(setupRagRoutes())

    .listen(
      {
        port: env.API_SERVER_PORT,
        hostname: "127.0.0.1", // bind to localhost (127.0.0.1) instead of 0.0.0.0. the request came from proxy so it's fine
      },
      ({ hostname, port }) => {
        logger.info(`🦊 Elysia is running at ${hostname}:${port}`);
      },
    );

  return app;
};
