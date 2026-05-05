import type { ImagePart, TextPart, UserContent } from "ai";
import { generateText, Output, stepCountIs } from "ai";
import type Database from "better-sqlite3";
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
  try {
    const systemPrompt = buildMealSystemPrompt(
      input.favorites,
      input.messageTimestamp.toISOString(),
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

    const { output: object } = await generateText({
      model: nutritionModel,
      output: Output.object({ schema: MealEstimationSchema }),
      system: systemPrompt,
      messages: [{ role: "user", content: userContent satisfies UserContent }],
      tools,
      stopWhen: stepCountIs(50),
      temperature: 1,
    });

    return object;
  } catch (error) {
    logger.error(error, "LLM analyzeMeal error");
    return {
      error: true,
      reason: error instanceof Error ? error.message : "Unknown LLM error",
      items: [],
      meal_time: null,
      save_as: null,
    };
  }
}
