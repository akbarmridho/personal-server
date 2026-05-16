import { tool } from "ai";
import type Database from "better-sqlite3";
import { z } from "zod";
import { searchFoods } from "../search/food-db.js";

export function createNutritionTools(db: Database.Database) {
  return {
    search_usda: tool({
      description:
        "Search USDA Foundation Foods for basic ingredient nutrition (per 100g). Use for raw ingredients like chicken, rice, eggs, vegetables, oils, grains. Note: beverages (coffee, tea, juice) are NOT in this database — use search_packaged_food for those.",
      inputSchema: z.object({
        query: z.string().describe("Food ingredient to search for"),
      }),
      execute: async ({ query }) => {
        const results = searchFoods(db, query, {
          limit: 5,
          source: "usda",
        });
        return results.map(({ id, score, source, country, ...r }) => ({
          ...r,
          per: "100g",
        }));
      },
    }),
    search_packaged_food: tool({
      description:
        "Search OpenFoodFacts database for packaged/branded food products and beverages (per 100g). Use for branded items like Indomie, Pocari Sweat, Yakult, Ultra Milk, etc. Also use for beverages (coffee, espresso, tea, juice) which are not in USDA. Indonesian products are boosted by default.",
      inputSchema: z.object({
        query: z.string().describe("Product name or brand to search for"),
        country: z
          .string()
          .optional()
          .describe(
            "Filter by country name (e.g. 'Indonesia', 'Japan'). Omit to search all countries.",
          ),
      }),
      execute: async ({ query, country }) => {
        const results = searchFoods(db, query, {
          limit: 5,
          source: "openfoodfacts",
          country,
        });
        return results.map(({ id, score, source, ...r }) => ({
          ...r,
          per: "100g",
        }));
      },
    }),
  };
}
