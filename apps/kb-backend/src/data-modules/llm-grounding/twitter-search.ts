import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

import OpenAI from "openai";
import { env } from "../../infrastructure/env.js";
import { logger } from "../../utils/logger.js";
import {
  buildTwitterSearchSystemPrompt,
  buildTwitterSearchUserPrompt,
} from "./twitter-prompt.js";
import type { PreviousReport } from "./web-prompt.js";

export interface TwitterSearchParams {
  queries: string[];
  daysOld?: number;
  previousReports?: PreviousReport[];
}

export const searchTwitter = async (params: TwitterSearchParams) => {
  const client = new OpenAI({
    apiKey: env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 600_000,
  });

  const todayDate = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");
  const daysOld = params.daysOld ?? 14;

  const searchTool: Record<string, any> = {
    type: "x_search",
    enable_image_understanding: true,
    from_date: dayjs()
      .tz("Asia/Jakarta")
      .subtract(daysOld, "day")
      .format("YYYY-MM-DD"),
  };

  const response = await client.responses.create({
    model: "grok-4-1-fast-reasoning",
    input: [
      {
        role: "system",
        content: buildTwitterSearchSystemPrompt({
          todayDate,
          daysOld,
          queries: params.queries,
          previousReports: params.previousReports,
        }),
      },
      {
        role: "user",
        content: buildTwitterSearchUserPrompt({
          queries: params.queries,
        }),
      },
    ],
    tools: [searchTool as any],
  });

  if (response.status !== "completed") {
    logger.error(response, "response error");
    throw new Error("Twitter search didn't succeed");
  }

  logger.info(
    { queries: params.queries, resultLength: response.output_text.length },
    "Twitter search completed",
  );

  return { result: response.output_text, raw: response };
};
