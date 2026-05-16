import type { ImagePart, TextPart, UserContent } from "ai";
import { generateText, Output, stepCountIs } from "ai";
import type Database from "better-sqlite3";
import pRetry from "p-retry";
import {
  type Favorite,
  type MealEstimation,
  MealEstimationSchema,
} from "../db/types.js";
import { nutritionModel } from "../infrastructure/llm.js";
import { logger } from "../utils/logger.js";
import { buildMealSystemPrompt } from "./prompts.js";
import { createNutritionTools } from "./tools.js";

interface AnalyzeMealInput {
  text?: string;
  photos?: { data: Uint8Array; mediaType: string }[];
  favorites: Favorite[];
  messageTimestamp: Date;
  foodDb: Database.Database;
}

export async function analyzeMeal(
  input: AnalyzeMealInput,
): Promise<MealEstimation> {
  const startTime = Date.now();
  logger.info(
    {
      hasText: !!input.text,
      photoCount: input.photos?.length ?? 0,
      favCount: input.favorites.length,
    },
    "analyzeMeal: starting LLM call",
  );

  try {
    const systemPrompt = buildMealSystemPrompt(
      input.favorites,
      input.messageTimestamp,
    );

    const userContent: Array<TextPart | ImagePart> = [];

    if (input.text) {
      userContent.push({ type: "text", text: input.text });
    }

    if (input.photos) {
      for (const photo of input.photos) {
        userContent.push({
          type: "image",
          image: photo.data,
          mediaType: photo.mediaType,
        });
      }
    }

    const tools = createNutritionTools(input.foodDb);

    const { output: object, steps } = await pRetry(
      async () => {
        return generateText({
          model: nutritionModel,
          output: Output.object({ schema: MealEstimationSchema }),
          system: systemPrompt,
          messages: [
            { role: "user", content: userContent satisfies UserContent },
          ],
          tools,
          stopWhen: stepCountIs(50),
          temperature: 1,
        });
      },
      {
        retries: 2,
        minTimeout: 1000,
        onFailedAttempt: (err) => {
          logger.warn(
            {
              attempt: err.attemptNumber,
              retriesLeft: err.retriesLeft,
              message: err.message,
            },
            "analyzeMeal: retrying LLM call",
          );
        },
      },
    );

    const durationMs = Date.now() - startTime;
    logger.info(
      {
        durationMs,
        steps: steps.length,
        itemCount: object.items.length,
        error: object.error,
      },
      "analyzeMeal: LLM call complete",
    );

    return object;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error({ err: error, durationMs }, "analyzeMeal: LLM call failed");
    return {
      error: true,
      reason: error instanceof Error ? error.message : "Unknown LLM error",
      items: [],
      meal_time: null,
      save_as: null,
    };
  }
}
