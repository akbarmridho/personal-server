import type { ImagePart, TextPart, UserContent } from "ai";
import { generateText, Output, stepCountIs } from "ai";
import type Database from "better-sqlite3";
import { z } from "zod";
import { type Favorite, FoodItemSchema } from "../db/types.js";
import { nutritionModel } from "../infrastructure/llm.js";
import { logger } from "../utils/logger.js";
import { buildFavoriteSystemPrompt } from "./prompts.js";
import { createNutritionTools } from "./tools.js";

const FavoriteResultSchema = z.object({
  error: z.boolean(),
  reason: z.string().optional(),
  alias: z.string(),
  item: FoodItemSchema.nullable(),
});

type FavoriteResult = z.infer<typeof FavoriteResultSchema>;

interface AnalyzeFavoriteInput {
  text?: string;
  photos?: { data: Uint8Array; mediaType: string }[];
  favorites: Favorite[];
  messageTimestamp: Date;
  foodDb: Database.Database;
}

export async function analyzeFavorite(
  input: AnalyzeFavoriteInput,
): Promise<FavoriteResult> {
  const startTime = Date.now();
  logger.info(
    {
      hasText: !!input.text,
      photoCount: input.photos?.length ?? 0,
    },
    "analyzeFavorite: starting LLM call",
  );

  try {
    const systemPrompt = buildFavoriteSystemPrompt(
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

    const { output: object, steps } = await generateText({
      model: nutritionModel,
      output: Output.object({ schema: FavoriteResultSchema }),
      system: systemPrompt,
      messages: [{ role: "user", content: userContent satisfies UserContent }],
      tools,
      stopWhen: stepCountIs(50),
      temperature: 1,
    });

    const durationMs = Date.now() - startTime;
    logger.info(
      { durationMs, steps: steps.length, error: object.error },
      "analyzeFavorite: LLM call complete",
    );

    return object;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error(
      { err: error, durationMs },
      "analyzeFavorite: LLM call failed",
    );
    return {
      error: true,
      reason: error instanceof Error ? error.message : "Unknown LLM error",
      alias: "",
      item: null,
    };
  }
}
