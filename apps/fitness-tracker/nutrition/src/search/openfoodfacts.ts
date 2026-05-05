import pThrottle from "p-throttle";

export interface FoodResult {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export function createOpenFoodFactsClient() {
  const throttle = pThrottle({ limit: 8, interval: 60_000 });

  const search = throttle(
    async (query: string, limit = 5): Promise<FoodResult[]> => {
      const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
      url.searchParams.set("search_terms", query);
      url.searchParams.set("cc", "id");
      url.searchParams.set("page_size", String(limit));
      url.searchParams.set("json", "1");
      url.searchParams.set("fields", "product_name,brands,nutriments");

      const res = await fetch(url, {
        headers: { "User-Agent": "NutritionTrackerBot/1.0" },
      });

      if (!res.ok) return [];

      const data = (await res.json()) as {
        products?: Array<{
          product_name?: string;
          brands?: string;
          nutriments?: {
            "energy-kcal_100g"?: number;
            proteins_100g?: number;
            carbohydrates_100g?: number;
            fat_100g?: number;
            fiber_100g?: number;
          };
        }>;
      };

      return (data.products ?? [])
        .filter((p) => p.product_name)
        .map((p) => ({
          name: p.product_name ?? "",
          brand: p.brands ?? "",
          calories: p.nutriments?.["energy-kcal_100g"] ?? 0,
          protein: p.nutriments?.proteins_100g ?? 0,
          carbs: p.nutriments?.carbohydrates_100g ?? 0,
          fat: p.nutriments?.fat_100g ?? 0,
          fiber: p.nutriments?.fiber_100g ?? 0,
        }));
    },
  );

  return search;
}
