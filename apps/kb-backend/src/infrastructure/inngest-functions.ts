import type { InngestFunction } from "inngest";
import { algoResearchCrawl } from "../data-modules/algoresearch/crawl.js";
import { algoresearchIngest } from "../data-modules/algoresearch/ingest.js";
import { algoresearchScrape } from "../data-modules/algoresearch/scrape.js";
import {
  hpMarketUpdateCrawl,
  hpStockUpdateCrawl,
} from "../data-modules/hp-sekuritas/crawl.js";
import { hpMarketUpdateIngest } from "../data-modules/hp-sekuritas/ingest-market.js";
import { hpStockUpdateIngest } from "../data-modules/hp-sekuritas/ingest-stock.js";
import {
  kiwoomDailyNewsCrawl,
  kiwoomEquityReportCrawl,
  kiwoomInternationalNewsCrawl,
} from "../data-modules/kiwoom-sekuritas/crawl.js";
import { documentManualIngest } from "../data-modules/manual/ingest.js";
import { updateCompanies } from "../data-modules/profiles/companies.js";
import { samuelMorningBriefCrawl } from "../data-modules/samuel-sekuritas/crawl-brief.js";
import { samuelCompanyReportsCrawl } from "../data-modules/samuel-sekuritas/crawl-company.js";
import { samuelMorningBriefIngest } from "../data-modules/samuel-sekuritas/ingest-brief.js";
import { samuelCompanyReportIngest } from "../data-modules/samuel-sekuritas/ingest-company.js";
import { snipsCrawl } from "../data-modules/snips-newsletter/crawl.js";
import { snipsIngestPart } from "../data-modules/snips-newsletter/ingest.js";
import { snipsScrape } from "../data-modules/snips-newsletter/scrape.js";
import { twitterRumourScrape } from "../data-modules/twitter/scrape.js";
import { youtubeChannelCrawl } from "../data-modules/youtube/crawl.js";
import { youtubeChannelCrawlFix } from "../data-modules/youtube/crawl-fix.js";
import { youtubeChannelCrawlInit } from "../data-modules/youtube/cron.js";
import { youtubeChannelIngest } from "../data-modules/youtube/ingest.js";
import { youtubeChannelIngestTips } from "../data-modules/youtube/ingest-tips.js";
import { discordService } from "./discord.js";
import { env } from "./env.js";
import { inngest } from "./inngest.js";

const failureNotification = inngest.createFunction(
  {
    id: "handle-any-fn-failure",
    rateLimit: {
      limit: 2,
      period: "6h",
    },
  },
  { event: "inngest/function.failed" },
  async ({ event }) => {
    const payload = JSON.stringify(event.data.error, null, 2);

    await discordService.createThread(
      env.DISCORD_CHANNEL_INNGEST_ERROR,
      `Inngest run failure`,
      payload,
    );
  },
);

const notifyDiscordKBIngestion = inngest.createFunction(
  {
    id: "notify-discord-kb-ingestion",
  },
  { event: "notify/discord-kb-ingestion" },
  async ({ event, step }) => {
    await step.run("notify", async () => {
      for (const document of event.data.payload) {
        await discordService.createThread(
          env.DISCORD_CHANNEL_ANALYSIS_RUMOUR,
          document.title || "Analysis/Rumour Ingestion",
          document.content,
          {
            ...document.source,
            document_date: document.document_date,
            type: document.type,
          },
        );
      }
    });
  },
);

export const inngestFunctions: InngestFunction.Like[] = [
  failureNotification,
  notifyDiscordKBIngestion,
  updateCompanies,
  snipsIngestPart,
  snipsCrawl,
  snipsScrape,
  samuelCompanyReportsCrawl,
  samuelMorningBriefCrawl,
  samuelCompanyReportIngest,
  samuelMorningBriefIngest,
  hpStockUpdateCrawl,
  hpMarketUpdateCrawl,
  hpStockUpdateIngest,
  hpMarketUpdateIngest,
  algoResearchCrawl,
  algoresearchScrape,
  algoresearchIngest,
  kiwoomDailyNewsCrawl,
  kiwoomInternationalNewsCrawl,
  kiwoomEquityReportCrawl,
  twitterRumourScrape,
  documentManualIngest,
  youtubeChannelCrawlInit,
  youtubeChannelCrawl,
  youtubeChannelIngest,
  youtubeChannelIngestTips,
  youtubeChannelCrawlFix,
];
