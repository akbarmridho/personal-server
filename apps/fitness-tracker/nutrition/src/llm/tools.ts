import { tool } from "ai";
import type MiniSearch from "minisearch";
import { z } from "zod";
import type { FoodResult } from "../search/openfoodfacts.js";
import { searchUsda, type UsdaFood } from "../search/usda.js";

export function createNutritionTools(
  usdaIndex: MiniSearch<UsdaFood>,
  searchOpenFoodFacts: (query: string, limit?: number) => Promise<FoodResult[]>,
) {
  return {
    search_usda: tool({
      description:
        "Search USDA Foundation Foods for basic ingredient nutrition (per 100g). Use for raw ingredients like chicken, rice, eggs, vegetables.",
      inputSchema: z.object({
        query: z.string().describe("Food ingredient to search for"),
      }),
      execute: async ({ query }) => searchUsda(usdaIndex, query),
    }),
    search_openfoodfacts: tool({
      description:
        "Search OpenFoodFacts for packaged/branded food products (per 100g). Use for branded items like specific snacks, drinks, or processed foods.",
      inputSchema: z.object({
        query: z.string().describe("Product name or brand to search for"),
      }),
      execute: async ({ query }) => searchOpenFoodFacts(query),
    }),
  };
}
