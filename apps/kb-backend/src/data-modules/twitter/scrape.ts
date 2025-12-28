import normalizeUrl from "normalize-url";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import { knowledgeService } from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";
import { searchRumourTargetted } from "./search.js";

const namespace = "26e942fd-dc82-435f-bf9a-71038322fec4";

type ResultItem = {
  title: string;
  date: string;
  content: string;
  url: string | null;
  symbols: string[];
};

async function parseSections(text: string): Promise<ResultItem[]> {
  const sections = text.split(/(?:^|\n)## /).filter(Boolean);

  const parsed: ResultItem[] = sections.map((section) => {
    const lines = section.split("\n");
    const heading = lines[0];

    // extract date
    const dateMatch = heading.match(/\[(\d{4}-\d{2}-\d{2})\]/);
    const date = dateMatch ? dateMatch[1] : "";

    // extract tweet URL (from title line only)
    const tweetMatch = heading.match(/https:\/\/x\.com\/\S+\/status\/\d+/);
    const tweetUrl = tweetMatch ? tweetMatch[0] : null;

    // clean title (remove date + link)
    const title = heading
      .replace(/\[.*?\]/, "")
      .replace(/\(https:\/\/x\.com\/.*?\)/, "")
      .trim();

    // content = everything after heading
    const content = lines.slice(1).join("\n").trim();

    return {
      title,
      date,
      content,
      url: tweetUrl ? normalizeUrl(tweetUrl) : null,
      symbols: [],
    };
  });

  const batchSymbols = await extractSymbolFromTexts(
    parsed.map((item) => `${item.title}\n${item.content}`),
  );

  batchSymbols.forEach((symbols, index) => {
    parsed[index].symbols = symbols;
  });

  return parsed;
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
      const { result } = await searchRumourTargetted({
        daysOld: 4,
      });

      return result;
    });

    const payload = await step.run("process", async () => {
      const rumours = await parseSections(data);

      const taggedRumours = await tagMetadata(
        rumours.map((rumour) => {
          return {
            date: rumour.date,
            content: rumour.content,
            title: rumour.title,
            urls: [],
            subindustries: [],
            subsectors: [],
            symbols: rumour.symbols,
            indices: [],
          };
        }),
      );

      return taggedRumours.map((rumour, i) => {
        const source: Record<string, string> = {
          name: "twitter-scoped-search",
        };

        const tweetUrl = rumours[i].url;

        if (tweetUrl) {
          source.url = tweetUrl;
        }

        return {
          id: uuidv5(
            `${tweetUrl ?? `${rumour.title}-${rumour.date}`}`,
            namespace,
          ),
          type: "rumour" as const,
          title: rumour.title,
          content: rumour.content,
          document_date: rumour.date,
          source: source,
          urls: rumour.urls,
          symbols: rumour.symbols,
          subindustries: rumour.subindustries,
          subsectors: rumour.subsectors,
          indices: rumour.indices,
        };
      });
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
