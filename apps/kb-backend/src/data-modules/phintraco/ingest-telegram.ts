import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import {
  type InvestmentDocument,
  knowledgeService,
} from "../../infrastructure/knowledge-service.js";
import { extractSymbolFromTexts } from "../profiles/companies.js";
import { tagMetadata } from "../utils/tagging.js";
import type { PhintracoTelegramEvaluatedMessage } from "./crawl-telegram.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface PhintracoTelegramIngestEvent {
  message: PhintracoTelegramEvaluatedMessage;
}

const namespace = "4cff64ad-7867-4bfc-a1e3-cc19c5518ea1";

function cleanTelegramText(text: string): string {
  return text
    .replace(/\n{2,}By PHINTRACO SEKURITAS \| Research[\s\S]*$/i, "")
    .replace(/\n{2,}By Phintraco Sekuritas \| Research[\s\S]*$/i, "")
    .replace(/\n{2,}-\s*Disclaimer On\s*-[\s\S]*$/i, "")
    .replace(/\n{2,}–\s*Disclaimer On\s*–[\s\S]*$/i, "")
    .trim();
}

function resolveTitle(message: PhintracoTelegramEvaluatedMessage): string {
  const firstLine = message.firstLine.trim();
  if (firstLine) {
    return firstLine;
  }

  if (message.canonicalUrls[0]) {
    return message.canonicalUrls[0];
  }

  return `Phintraco Telegram ${message.id}`;
}

export const phintracoTelegramIngest = inngest.createFunction(
  {
    id: "phintraco-telegram-ingest",
    concurrency: 2,
  },
  { event: "data/phintraco-telegram-ingest" },
  async ({ event, step }) => {
    const payload: InvestmentDocument = await step.run(
      "prepare-payload",
      async () => {
        const message = event.data.message;
        const cleanedContent = cleanTelegramText(message.text);
        const title = resolveTitle(message);

        const extractedSymbols = (
          await extractSymbolFromTexts([`${title}\n${cleanedContent}`])
        )[0];

        const tagged = (
          await tagMetadata([
            {
              date: dayjs(message.date).tz("Asia/Jakarta").format("YYYY-MM-DD"),
              content: cleanedContent,
              title,
              urls: message.contentUrls,
              subindustries: [],
              subsectors: [],
              symbols: extractedSymbols,
              indices: [],
            },
          ])
        )[0];

        return {
          id: uuidv5(`phintraco-telegram:${message.id}`, namespace),
          type: "analysis" as const,
          title: tagged.title,
          content: tagged.content,
          document_date: tagged.date,
          source: {
            name: "phintraco-telegram",
            url: `https://t.me/phintasprofits/${message.id}`,
          },
          urls: tagged.urls,
          symbols: tagged.symbols,
          subindustries: tagged.subindustries,
          subsectors: tagged.subsectors,
          indices: tagged.indices,
        };
      },
    );

    await step.run("ingest-document", async () => {
      return await knowledgeService.ingestDocuments({
        documents: [payload],
      });
    });
  },
);
