import { Inngest } from "inngest";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";

export const inngest = new Inngest({
  id: "ai-backend",
  isDev: false,
  eventKey: env.INNGEST_EVENT_KEY,
  baseUrl: env.INNGEST_BASE_URL,
  logger: logger,
});
