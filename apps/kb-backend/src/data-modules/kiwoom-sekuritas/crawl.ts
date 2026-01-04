import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";
import { getDailyNews, getInternationalNews, getMarketReports } from "./api.js";

dayjs.extend(customParseFormat);

const newsKeystone = "data-modules.kiwoom.news-id";
const internationalNewsKeystone = "data-modules.kiwoom.international-news-id";
const equityReportKeystone = "data-modules.kiwoom.equity-report-id";

interface Keystone {
  id: number;
}

export const kiwoomDailyNewsCrawl = inngest.createFunction(
  {
    id: "kiwoom-daily-news-crawl",
    concurrency: 1,
  },
  // daily at 09:10 from monday to friday
  { cron: "TZ=Asia/Jakarta 10 09 * * 1-5" },
  async ({ step }) => {
    const toScrape = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(newsKeystone)) as Keystone | null;

      const pageSize = latestCrawl?.id ? 4 : 500;

      const response = await getDailyNews(0, pageSize);

      const toScrape: {
        id: number;
        date: string;
      }[] = response.data
        .filter((e) => e.TITL.includes("Daily News"))
        .map((e) => {
          return {
            id: e.SEQNO,
            date: dayjs(e.MAKEDATE2, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD"),
          };
        });

      if (latestCrawl) {
        return toScrape.filter((e) => e.id > latestCrawl.id);
      }

      return toScrape;
    });

    if (toScrape.length > 0) {
      // emit events
      await step.sendEvent(
        "queue-ingest",
        toScrape.map((e) => {
          return {
            name: "data/kiwoom-daily-news-ingest",
            data: e,
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        let newValue = (await KV.get(newsKeystone)) as Keystone | null;

        if (toScrape.length > 0) {
          newValue = { id: Math.max(...toScrape.map((e) => e.id)) };
        }

        await KV.set(newsKeystone, newValue as any);
      });
    }
  },
);

export const kiwoomInternationalNewsCrawl = inngest.createFunction(
  {
    id: "kiwoom-international-news-crawl",
    concurrency: 1,
  },
  // daily at 09:10 from monday to friday
  { cron: "TZ=Asia/Jakarta 15 9 * * 1-5" },
  async ({ step }) => {
    const toScrape = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(
        internationalNewsKeystone,
      )) as Keystone | null;

      const pageSize = latestCrawl?.id ? 4 : 400;

      const response = await getInternationalNews(0, pageSize);

      const toScrape: {
        id: number;
        date: string;
      }[] = response.data
        .filter((e) => e.TITL.includes("International News"))
        .map((e) => {
          return {
            id: e.SEQNO,
            date: dayjs(e.MAKEDATE2, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD"),
          };
        });

      if (latestCrawl) {
        return toScrape.filter((e) => e.id > latestCrawl.id);
      }

      return toScrape;
    });

    if (toScrape.length > 0) {
      // emit events
      await step.sendEvent(
        "queue-ingest",
        toScrape.map((e) => {
          return {
            name: "data/kiwoom-international-news-ingest",
            data: e,
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        let newValue = (await KV.get(
          internationalNewsKeystone,
        )) as Keystone | null;

        if (toScrape.length > 0) {
          newValue = { id: Math.max(...toScrape.map((e) => e.id)) };
        }

        await KV.set(internationalNewsKeystone, newValue as any);
      });
    }
  },
);

export const kiwoomEquityReportCrawl = inngest.createFunction(
  {
    id: "kiwoom-equity-report-crawl",
    concurrency: 1,
  },
  // daily at 19:45 from monday to friday
  { cron: "TZ=Asia/Jakarta 45 19 * * 1-5" },
  async ({ step }) => {
    const toScrape = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(
        equityReportKeystone,
      )) as Keystone | null;

      const pageSize = latestCrawl?.id ? 4 : 100;

      const response = await getMarketReports(0, pageSize);

      const toScrape: {
        id: number;
        title: string;
        date: string;
        pdfUrl: string;
      }[] = response.data.map((e) => {
        return {
          id: e.SEQNO,
          date: dayjs(e.MAKEDATE2, "DD/MM/YYYY HH:mm").format("YYYY-MM-DD"),
          title: e.TITL,
          pdfUrl: `https://www.kiwoom.co.id/kid/upload/mr/${e.SNMAKEDATE}/${e.APNDNM}`,
        };
      });

      if (latestCrawl) {
        return toScrape.filter((e) => e.id > latestCrawl.id);
      }

      return toScrape;
    });

    if (toScrape.length > 0) {
      // emit events
      await step.sendEvent(
        "queue-ingest",
        toScrape.map((e) => {
          return {
            name: "data/kiwoom-equity-report-ingest",
            data: e,
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        let newValue = (await KV.get(equityReportKeystone)) as Keystone | null;

        if (toScrape.length > 0) {
          newValue = { id: Math.max(...toScrape.map((e) => e.id)) };
        }

        await KV.set(equityReportKeystone, newValue as any);
      });
    }
  },
);
