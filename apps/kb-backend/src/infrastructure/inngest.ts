import { EventSchemas, Inngest } from "inngest";
import type { InputData as SnipInputData } from "../data-modules/snips-newsletter/cleanup.js";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";
import type { InvestmentDocument } from "./knowledge-service.js";

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
  "data/samuel-company-report-ingest": {
    data: {
      url: string;
    };
  };
  "data/document-manual-ingest": {
    data: {
      payload: Array<
        Pick<
          InvestmentDocument,
          | "id"
          | "type"
          | "title"
          | "content"
          | "document_date"
          | "source"
          | "urls"
        >
      >;
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
