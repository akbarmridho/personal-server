import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import { knowledgeService } from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { GROUNDED_NEWS_RUMOUR_SCRAPE_CRON } from "../schedule.js";
import { tagMetadata } from "../utils/tagging.js";
import { fetchPreviousReports } from "./previous-reports.js";
import { defaultGroundedNewsQueries } from "./web-prompt.js";
import { searchGroundedNews } from "./web-search.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const namespace = "d2a62ff2-33fe-4f21-8dcf-0f32c31dabfe";

function buildReportTitle(content: string, fallbackDate: string): string {
  const headingMatch = content.match(/^\s*#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  const dateRangeMatch = content.match(
    /\*\*Date Range\*\*:\s*(\d{4}-\d{2}-\d{2}(?:\s+to\s+\d{4}-\d{2}-\d{2})?)/i,
  );
  if (dateRangeMatch?.[1]) {
    return `Grounded Market Report (${dateRangeMatch[1].trim()})`;
  }

  return `Grounded Market Report (${fallbackDate})`;
}

export const groundedNewsRumourScrape = inngest.createFunction(
  {
    id: "grounded-news-rumour-scrape",
    concurrency: 1,
  },
  { cron: GROUNDED_NEWS_RUMOUR_SCRAPE_CRON },
  async ({ step }) => {
    const previousReports = await step.run("fetch-previous-reports", async () =>
      fetchPreviousReports(),
    );

    const scraped = await step.run("scrape", async () => {
      return await searchGroundedNews({
        daysOld: 4,
        queries: defaultGroundedNewsQueries,
        previousReports,
      });
    });

    const payload = await step.run("process", async () => {
      const documentDate = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");
      const reportTitle = buildReportTitle(scraped.result, documentDate);
      const [symbols] = await extractSymbolFromTexts([
        `${reportTitle}\n${scraped.result}`,
      ]);

      const [taggedReport] = await tagMetadata([
        {
          date: documentDate,
          content: scraped.result,
          title: reportTitle,
          urls: scraped.urls,
          subindustries: [],
          subsectors: [],
          symbols: symbols ?? [],
          indices: [],
        },
      ]);

      return [
        {
          id: uuidv5(`web-grounding-${documentDate}`, namespace),
          type: "rumour" as const,
          title: taggedReport.title,
          content: taggedReport.content,
          document_date: taggedReport.date,
          source: {
            name: "web-grounding",
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
