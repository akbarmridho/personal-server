import type { ImagePart, TextPart, UserContent } from "ai";
import { generateObject, generateText, Output, stepCountIs } from "ai";
import type MiniSearch from "minisearch";
import {
  type Favorite,
  type MealEstimation,
  MealEstimationSchema,
  type MeasurementData,
  MeasurementSchema,
} from "../db/types.js";
import { nutritionModel } from "../infrastructure/llm.js";
import type { FoodResult } from "../search/openfoodfacts.js";
import type { UsdaFood } from "../search/usda.js";
import { buildMealSystemPrompt, MEASUREMENT_SYSTEM_PROMPT } from "./prompts.js";
import { createNutritionTools } from "./tools.js";

interface AnalyzeMealInput {
  text?: string;
  photos?: { data: Uint8Array; mediaType: string }[];
  favorites: Favorite[];
  messageTimestamp: Date;
  usdaIndex: MiniSearch<UsdaFood>;
  searchOpenFoodFacts: (query: string, limit?: number) => Promise<FoodResult[]>;
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

    const tools = createNutritionTools(
      input.usdaIndex,
      input.searchOpenFoodFacts,
    );

    const { output: object } = await generateText({
      model: nutritionModel,
      output: Output.object({ schema: MealEstimationSchema }),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent satisfies UserContent },
      ],
      tools,
      stopWhen: stepCountIs(5),
    });

    return object;
  } catch (error) {
    console.error("LLM analyzeMeal error:", error);
    return {
      error: true,
      reason: error instanceof Error ? error.message : "Unknown LLM error",
      items: [],
      meal_time: null,
      save_as: null,
    };
  }
}

export async function parseMeasurement(
  text?: string,
  photos?: { data: Uint8Array; mediaType: string }[],
): Promise<MeasurementData | null> {
  try {
    const userContent: Array<TextPart | ImagePart> = [];

    if (text) {
      userContent.push({ type: "text", text });
    }

    if (photos) {
      for (const photo of photos) {
        userContent.push({
          type: "image",
          image: photo.data,
          mediaType: photo.mediaType,
        });
      }
    }

    if (userContent.length === 0) return null;

    const { object } = await generateObject({
      model: nutritionModel,
      schema: MeasurementSchema,
      messages: [
        { role: "system", content: MEASUREMENT_SYSTEM_PROMPT },
        { role: "user", content: userContent satisfies UserContent },
      ],
    });

    return object;
  } catch (error) {
    console.error("LLM parseMeasurement error:", error);
    return null;
  }
}
