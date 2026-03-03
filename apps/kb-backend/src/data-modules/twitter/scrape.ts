import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import { knowledgeService } from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";
import { defaultTwitterDigestQueries } from "./prompt.js";
import { searchTwitter } from "./search.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const namespace = "26e942fd-dc82-435f-bf9a-71038322fec4";

function buildReportTitle(content: string, fallbackDate: string): string {
  const headingMatch = content.match(/^\s*#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  const dateRangeMatch = content.match(
    /\*\*Date Range\*\*:\s*(\d{4}-\d{2}-\d{2}(?:\s+to\s+\d{4}-\d{2}-\d{2})?)/i,
  );
  if (dateRangeMatch?.[1]) {
    return `Twitter Market Discussion (${dateRangeMatch[1].trim()})`;
  }

  return `Twitter Market Discussion (${fallbackDate})`;
}

export const twitterRumourScrape = inngest.createFunction(
  {
    id: "twitter-rumour-scrape",
    concurrency: 1,
  },
  // Tuesday – Thursday – Saturday @ 21:30 WIB
  { cron: "TZ=Asia/Jakarta 30 21 * * 2,4,6" },
  async ({ step }) => {
    const data = await step.run("scrape", async () => {
      const { result } = await searchTwitter({
        daysOld: 4,
        queries: defaultTwitterDigestQueries,
      });

      return result;
    });

    const payload = await step.run("process", async () => {
      const documentDate = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");
      const reportTitle = buildReportTitle(data, documentDate);
      const [symbols] = await extractSymbolFromTexts([
        `${reportTitle}\n${data}`,
      ]);

      const [taggedReport] = await tagMetadata([
        {
          date: documentDate,
          content: data,
          title: reportTitle,
          urls: [],
          subindustries: [],
          subsectors: [],
          symbols: symbols ?? [],
          indices: [],
        },
      ]);

      return [
        {
          id: uuidv5(`twitter-scoped-search-${documentDate}`, namespace),
          type: "rumour" as const,
          title: taggedReport.title,
          content: taggedReport.content,
          document_date: taggedReport.date,
          source: {
            name: "twitter-scoped-search",
          },
          urls: taggedReport.urls,
          symbols: taggedReport.symbols,
          subindustries: taggedReport.subindustries,
          subsectors: taggedReport.subsectors,
          indices: taggedReport.indices,
        },
      ];
    });

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: payload,
      });
    });

    await step.sendEvent("notify-discord", [
      {
        name: "notify/discord-kb-ingestion",
        data: { payload: payload },
      },
    ]);
  },
);
