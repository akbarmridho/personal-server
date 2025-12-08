import { EventSchemas, Inngest } from "inngest";
import type { InputData as SnipInputData } from "../data-modules/snips-newsletter/cleanup.js";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";

type Events = {
  "data/snips-part": {
    data: { payload: SnipInputData[] };
  };
  "data/snips-scrape": {
    data: {
      url: string;
      date: string;
    };
  };
};

export const inngest = new Inngest({
  id: "ai-backend",
  isDev: false,
  eventKey: env.INNGEST_EVENT_KEY,
  baseUrl: env.INNGEST_BASE_URL,
  logger: logger,
  schemas: new EventSchemas().fromRecord<Events>(),
});
