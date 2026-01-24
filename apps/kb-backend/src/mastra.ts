import "@dotenvx/dotenvx/config";

import type { ChatStreamHandlerParams } from "@mastra/ai-sdk";
import { handleChatStream } from "@mastra/ai-sdk";
import { stepCountIs } from "@mastra/core/_types/@internal_ai-sdk-v5/dist";
import type { Mastra } from "@mastra/core/mastra";
import type { RequestContext } from "@mastra/core/request-context";
import { MastraServer } from "@mastra/express";
import type { UIMessage } from "ai";
import { pipeUIMessageStreamToResponse } from "ai";
import type { Request, Response } from "express";
import express from "express";
import { z } from "zod";
import { env } from "./infrastructure/env.js";
import { mastra } from "./mastra/index.js";
import { mountStudio } from "./mastra/studio.js";
import { logger } from "./utils/logger.js";

async function main() {
  const app = express();

  app.use(express.json({}));

  const mastraServer = new MastraServer({
    app: app,
    mastra: mastra,
    prefix: "/api",
  });

  await mastraServer.init();

  // Zod schema for request validation (matching original chatRoute schema)
  const chatRequestSchema = z.object({
    messages: z.array(z.unknown()), // UIMessage type is complex, validate at runtime
    resumeData: z.record(z.string(), z.unknown()).optional(),
    runId: z.string().optional(),
    trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  });

  // Chat route handler for Express (matches chatRoute functionality)
  app.post("/api/chat/:agentId", async (req: Request, res: Response) => {
    try {
      const agentId = req.params.agentId;

      // Validate agent ID
      if (!agentId) {
        res.status(400).json({ error: "Agent ID is required" });
        return;
      }

      // Validate request body with Zod
      const validationResult = chatRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          error: "Invalid request body",
          details: validationResult.error.issues,
        });
        return;
      }

      // Runtime validation for messages array
      if (!Array.isArray(validationResult.data.messages)) {
        res.status(400).json({ error: "Messages must be an array" });
        return;
      }

      const params =
        validationResult.data as unknown as ChatStreamHandlerParams<
          UIMessage,
          unknown
        >;

      // Get Mastra instance from Express locals (set by MastraServer middleware)
      const mastraInstance = res.locals.mastra as Mastra | undefined;
      if (!mastraInstance) {
        res.status(500).json({ error: "Mastra instance not available" });
        return;
      }

      // Get request context from Express locals (set by MastraServer middleware)
      const requestContext = res.locals.requestContext as
        | RequestContext
        | undefined;

      // Create the UI message stream
      const uiMessageStream = await handleChatStream({
        mastra: mastraInstance,
        agentId,
        params: {
          ...params,
          requestContext,
        },
        defaultOptions: {
          stopWhen: stepCountIs(200),
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      });

      // Use pipeUIMessageStreamToResponse for proper Node.js streaming
      pipeUIMessageStreamToResponse({
        response: res,
        stream: uiMessageStream,
        status: 200,
        statusText: "OK",
      });
    } catch (error) {
      logger.error({ error, agentId: req.params.agentId }, "Chat route error");

      if (!res.headersSent) {
        if (error instanceof Error && error.message.includes("not found")) {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        // Headers already sent, just end the response
        res.end();
      }
    }
  });

  mountStudio(app, {
    mastraServerHost: "mastra.akbarmr.dev",
    mastraServerPort: "443",
    mastraServerProtocol: "https",
    hideCloudCta: true,
  });

  const server = app.listen(env.MASTRA_SERVER_PORT, () => {
    logger.info(`Mastra server running at ::${env.HTTP_SERVER_PORT}`);
  });

  const shutdown = async () => {
    server.close(() => {
      mastra.shutdown().then(() => {
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
}

main().catch(console.error);
