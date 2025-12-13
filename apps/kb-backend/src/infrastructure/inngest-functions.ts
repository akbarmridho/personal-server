import type { InngestFunction } from "inngest";
import { hpStockUpdateCrawl } from "../data-modules/hp-sekuritas/crawl.js";
import { hpStockUpdateIngest } from "../data-modules/hp-sekuritas/ingest.js";
import { documentManualIngest } from "../data-modules/manual/ingest.js";
import { updateCompanies } from "../data-modules/profiles/companies.js";
import { samuelCompanyReportsCrawl } from "../data-modules/samuel-sekuritas/crawl.js";
import { samuelCompanyReportIngest } from "../data-modules/samuel-sekuritas/ingest.js";
import { snipsCrawl } from "../data-modules/snips-newsletter/crawl.js";
import { snipsIngestPart } from "../data-modules/snips-newsletter/ingest.js";
import { snipsScrape } from "../data-modules/snips-newsletter/scrape.js";
import { env } from "./env.js";
import { inngest } from "./inngest.js";
import { telegraf } from "./telegram.js";

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

    await telegraf.telegram.sendMessage(
      env.TELEGRAM_CHANNEL_ID,
      `Inngest run failure:${payload}`,
    );
  },
);

export const inngestFunctions: InngestFunction.Like[] = [
  failureNotification,
  updateCompanies,
  snipsIngestPart,
  snipsCrawl,
  snipsScrape,
  samuelCompanyReportsCrawl,
  samuelCompanyReportIngest,
  hpStockUpdateCrawl,
  hpStockUpdateIngest,
  documentManualIngest,
];
