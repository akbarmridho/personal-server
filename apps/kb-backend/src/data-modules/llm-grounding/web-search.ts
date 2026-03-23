import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import normalizeUrl from "normalize-url";
import { logger } from "../../utils/logger.js";
import {
  buildGroundedNewsSystemPrompt,
  buildGroundedNewsUserPrompt,
  type PreviousReport,
} from "./web-prompt.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const WEB_GROUNDED_MODEL = "openai/gpt-5.4:online";

export interface GroundedNewsSearchParams {
  queries: string[];
  daysOld?: number;
  previousReports?: PreviousReport[];
}

function extractUrlsFromText(text: string): string[] {
  const urls = new Set<string>();

  const markdownLinkRegex = /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g;
  for (const match of text.matchAll(markdownLinkRegex)) {
    const rawUrl = match[1];
    try {
      urls.add(normalizeUrl(rawUrl));
    } catch {
      // Skip invalid URLs
    }
  }

  const rawUrlRegex = /https?:\/\/[^\s)]+/g;
  for (const match of text.matchAll(rawUrlRegex)) {
    const rawUrl = match[0].replace(/[),.;]+$/, "");
    try {
      urls.add(normalizeUrl(rawUrl));
    } catch {
      // Skip invalid URLs
    }
  }

  return [...urls];
}

export const searchGroundedNews = async (params: GroundedNewsSearchParams) => {
  const todayDate = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");
  const daysOld = params.daysOld ?? 4;

  const { text } = await generateText({
    model: openrouter(WEB_GROUNDED_MODEL, {
      reasoning: {
        effort: "high",
      },
      extraBody: {
        web_search_options: {
          search_context_size: "high",
        },
      },
    }),
    messages: [
      {
        role: "system",
        content: buildGroundedNewsSystemPrompt({
          todayDate,
          daysOld,
          queries: params.queries,
          previousReports: params.previousReports,
        }),
      },
      {
        role: "user",
        content: buildGroundedNewsUserPrompt({
          queries: params.queries,
        }),
      },
    ],
    maxRetries: 2,
    abortSignal: AbortSignal.timeout(10 * 60 * 1000),
  });

  const report = text.trim();

  if (!report) {
    throw new Error("Grounded news search returned empty response");
  }

  const urls = extractUrlsFromText(report);

  logger.info(
    {
      queries: params.queries,
      resultLength: report.length,
      sourceCount: urls.length,
      model: WEB_GROUNDED_MODEL,
    },
    "Grounded news search completed",
  );

  return {
    result: report,
    urls,
  };
};
