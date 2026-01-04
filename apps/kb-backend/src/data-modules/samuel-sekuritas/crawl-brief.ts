import Holidays from "date-holidays";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { KV } from "../../infrastructure/db/kv.js";
import { inngest } from "../../infrastructure/inngest.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const keystoneKey = "data-modules.samuel-morning-brief";

interface Keystone {
  largestDate: string; // YYYY-MM-DD
}

export const samuelMorningBriefCrawl = inngest.createFunction(
  {
    id: "samuel-morning-brief-crawl",
    concurrency: 1,
  },
  // daily at 09:05 from monday to friday
  { cron: "TZ=Asia/Jakarta 5 9 * * 1-5" },
  async ({ step }) => {
    const toScrapeDates = await step.run("crawl", async () => {
      const latestCrawl = (await KV.get(keystoneKey)) as Keystone | null;

      const fromDate = latestCrawl
        ? dayjs(latestCrawl.largestDate).tz("Asia/Jakarta")
        : dayjs("2023-10-02").tz("Asia/Jakarta");

      const toDate = dayjs().tz("Asia/Jakarta");

      const hd = new Holidays("ID");
      const dates: string[] = [];

      let current = fromDate;
      while (current.isBefore(toDate)) {
        const dayOfWeek = current.day();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const isHoliday = hd.isHoliday(current.toDate());
          if (!isHoliday) {
            dates.push(current.format("YYYY-MM-DD"));
          }
        }
        current = current.add(1, "day");
      }

      return dates;
    });

    if (toScrapeDates.length > 0) {
      // emit events
      await step.sendEvent(
        "queue-ingest",
        toScrapeDates.map((date) => {
          const djs = dayjs(date).tz("Asia/Jakarta");
          const yyyy = djs.format("YYYY");
          const mm = djs.format("MM");
          const yymmdd = djs.format("YYMMDD");
          return {
            name: "data/samuel-morning-brief-ingest",
            data: {
              pdfUrl: `https://samuel.co.id/wp-content/uploads/${yyyy}/${mm}/RSH-${yymmdd}.pdf`,
              date: date,
            },
          };
        }),
      );

      // update keystone
      await step.run("update-keystone", async () => {
        const largestDate = toScrapeDates[toScrapeDates.length - 1];
        await KV.set(keystoneKey, { largestDate } satisfies Keystone);
      });
    }
  },
);
