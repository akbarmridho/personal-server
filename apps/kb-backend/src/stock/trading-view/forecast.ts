import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import dayjs from "dayjs";
import { z } from "zod";
import { KV } from "../../infrastructure/db/kv.js";
import { fetchRawUrlContent } from "../../utils/crawl.js";

export const QuarterlyDataSchema = z.object({
  currency: z
    .string()
    .describe(
      "The currency used for reported and estimated values (e.g., IDR).",
    ),
  quarters: z.array(
    z.object({
      quarter: z.string().describe("The quarter label (e.g., 'Q1 '24')."),
      eps: z.object({
        reported: z.number().nullable().describe("Reported EPS value."),
        estimate: z.number().nullable().describe("Estimated EPS value."),
        surprise_percent: z
          .number()
          .nullable()
          .describe(
            "Percentage difference between reported and estimated EPS.",
          ),
      }),
      revenue: z.object({
        reported: z
          .string()
          .nullable()
          .describe("Reported revenue value (e.g., '27.93T')."),
        estimate: z
          .string()
          .nullable()
          .describe("Estimated revenue value (e.g., '28.03T')."),
        surprise_percent: z
          .number()
          .nullable()
          .describe(
            "Percentage difference between reported and estimated revenue.",
          ),
      }),
      is_forecast: z
        .boolean()
        .describe(
          "Indicates if the data point is a future forecast (true) or historical (false).",
        ),
    }),
  ),
});

export const getForecastData = async (symbol: string) => {
  const data = await KV.getOrSet(
    `stock.tradingview.forecast.${symbol}`,
    async () => {
      const rawContent = (await fetchRawUrlContent({
        url: `https://www.tradingview.com/symbols/IDX-${symbol}/forecast/`,
        returnFormat: "markdown",
      })) as string;

      const { object } = await generateObject({
        model: openrouter("openai/gpt-oss-20b", { models: ["qwen/qwen3-8b"] }),
        system:
          "Extract quarterly financial data (EPS, revenue, estimates, and surprise percentages) from the provided content. Parse quarter labels, numeric values, and currency. Distinguish between historical reported data and future forecasts. Return null if the content lacks valid quarterly financial data or doesn't match the expected structure.",
        prompt: rawContent,
        schema: QuarterlyDataSchema.nullable(),
      });

      return object;
    },
    dayjs().add(1, "week").toDate(),
    true,
  );

  return data as Record<string, any> | null;
};
