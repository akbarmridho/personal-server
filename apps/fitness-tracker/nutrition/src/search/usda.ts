import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import MiniSearch from "minisearch";

export interface UsdaFood {
  id: number;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export function loadUsdaIndex(): MiniSearch<UsdaFood> {
  const dataPath = resolve(
    import.meta.dirname,
    "../../data/usda-foundation.json",
  );

  let raw: string;
  try {
    raw = readFileSync(dataPath, "utf-8");
  } catch {
    console.error("USDA Foundation Foods JSON not found at", dataPath);
    process.exit(1);
  }

  const rawFoods = JSON.parse(raw) as Array<{
    fdcId: number;
    description: string;
    foodNutrients: Array<{ nutrient: { id: number }; amount?: number }>;
  }>;

  const foods: UsdaFood[] = rawFoods.map((f) => {
    const getNutrient = (id: number) =>
      f.foodNutrients.find((n) => n.nutrient.id === id)?.amount ?? 0;
    return {
      id: f.fdcId,
      description: f.description,
      calories: getNutrient(1008),
      protein: getNutrient(1003),
      carbs: getNutrient(1005),
      fat: getNutrient(1004),
      fiber: getNutrient(1079),
    };
  });

  const index = new MiniSearch<UsdaFood>({
    fields: ["description"],
    storeFields: [
      "description",
      "calories",
      "protein",
      "carbs",
      "fat",
      "fiber",
    ],
    searchOptions: {
      fuzzy: 0.2,
      prefix: true,
    },
  });

  index.addAll(foods);
  console.log(`USDA index loaded: ${foods.length} foods`);
  return index;
}

export function searchUsda(
  index: MiniSearch<UsdaFood>,
  query: string,
  limit = 5,
) {
  return index
    .search(query)
    .slice(0, limit)
    .map((result) => ({
      description: result.description as string,
      calories: result.calories as number,
      protein: result.protein as number,
      carbs: result.carbs as number,
      fat: result.fat as number,
      fiber: result.fiber as number,
      score: result.score,
    }));
}
