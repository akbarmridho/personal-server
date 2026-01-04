import { EventSchemas, Inngest } from "inngest";
import type {
  ArticleContent,
  ArticleInfo,
} from "../data-modules/algoresearch/types.js";
import type { InputData as SnipInputData } from "../data-modules/snips-newsletter/cleanup.js";
import type { YoutubeVideoEntry } from "../data-modules/youtube/crawl.js";
import type { YoutubeChannel } from "../data-modules/youtube/cron.js";
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
  "data/samuel-morning-brief-ingest": {
    data: {
      pdfUrl: string;
      date: string;
    };
  };
  "data/kiwoom-daily-news-ingest": {
    data: {
      id: number;
      date: string;
    };
  };
  "data/kiwoom-international-news-ingest": {
    data: {
      id: number;
      date: string;
    };
  };
  "data/kiwoom-equity-report-ingest": {
    data: {
      id: number;
      title: string;
      date: string;
      pdfUrl: string;
    };
  };
  "data/hp-stock-update-ingest": {
    data: {
      id: number;
      title: string;
      date: string;
      url: string;
    };
  };
  "data/hp-market-update-ingest": {
    data: {
      id: number;
      title: string;
      date: string;
      url: string;
    };
  };
  "data/kisi-monthly-research-ingest": {
    data: {
      id: number;
      title: string;
      date: string;
      url: string;
    };
  };
  "data/algoresearch-ingest": {
    data: ArticleContent;
  };
  "data/algoresearch-scrape": {
    data: ArticleInfo;
  };
  "data/youtube-crawl": {
    data: YoutubeChannel;
  };
  "data/youtube-ingest": {
    data: {
      channel: YoutubeChannel;
      video: YoutubeVideoEntry;
    };
  };
  "data/youtube-ingest-tips": {
    data: {
      channel: YoutubeChannel;
      video: YoutubeVideoEntry;
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
  "notify/discord-kb-ingestion": {
    data: {
      payload: InvestmentDocument[];
    };
  };
  "admin/youtube-channel-crawl-fix": {
    data: {
      message: string; // this will be ignored
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
  experimentalCheckpointing: true,
});
