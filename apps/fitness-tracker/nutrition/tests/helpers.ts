import "@dotenvx/dotenvx/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema.js";
import { env } from "../src/infrastructure/env.js";
import { openFoodDb } from "../src/search/food-db.js";

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });

let foodDbCache: ReturnType<typeof openFoodDb> | null = null;
export function getFoodDb() {
  if (!foodDbCache) {
    foodDbCache = openFoodDb();
  }
  return foodDbCache;
}

export const TEST_USER_ID = "test_user_999";

export async function cleanupTestUser() {
  await db.delete(schema.meals).where(eq(schema.meals.userId, TEST_USER_ID));
  await db
    .delete(schema.favoriteFoods)
    .where(eq(schema.favoriteFoods.userId, TEST_USER_ID));
  await db
    .delete(schema.measurements)
    .where(eq(schema.measurements.userId, TEST_USER_ID));
}

export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 2000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  throw lastError;
}
