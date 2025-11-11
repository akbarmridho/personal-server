import { logger as elysiaLogger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { node } from "@elysiajs/node";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { pluginGracefulServer } from "graceful-server-elysia";
import { env } from "./env.js";
import { setupInternetRoutes } from "./internet/http.js";
import { setupRagRoutes } from "./rag/http.js";
import { setupStockRoutes } from "./stock/http.js";
import { logger } from "./utils/logger.js";

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
    .onError(({ code, error, set }) => {
      logger.error(
        { error, stack: error.stack, code },
        `Error: ${error.message}`,
      );
      set.status = 500;
      return { error: error.message, code };
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

    // attach Internet routes under /internet prefix
    .use(setupInternetRoutes())

    // attach stock routes under /stock prefix
    .use(setupStockRoutes())

    .listen(env.API_SERVER_PORT, ({ hostname, port }) => {
      logger.info(`🦊 Elysia is running at ${hostname}:${port}`);
    });

  return app;
};
