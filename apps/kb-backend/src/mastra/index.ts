import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";
import { DefaultExporter, Observability } from "@mastra/observability";
import { PostgresStore } from "@mastra/pg";
import { env } from "../infrastructure/env.js";
import { vibeInvestorAgent } from "./agents/vibe-investor.js";

const storage = new PostgresStore({
  id: "mastra-storage",
  connectionString: env.DATABASE_URL,
  schemaName: "mastra",
});

export const mastra = new Mastra({
  agents: { vibeInvestorAgent },
  storage,
  logger: new PinoLogger(),
  observability: new Observability({
    configs: {
      "ai-agents": {
        serviceName: "ai-agents-mastra-observability",
        exporters: [
          new DefaultExporter({
            strategy: "auto",
          }),
        ],
      },
    },
  }),
});
