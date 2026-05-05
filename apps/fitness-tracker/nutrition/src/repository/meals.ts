import { and, between, eq } from "drizzle-orm";
import type { DrizzleDB } from "../db/index.js";
import { meals } from "../db/schema.js";

export async function createMeals(
  db: DrizzleDB,
  data: (typeof meals.$inferInsert)[],
) {
  return db.insert(meals).values(data).returning();
}

export async function deleteMealsByBatch(db: DrizzleDB, batchId: string) {
  await db.delete(meals).where(eq(meals.batchId, batchId));
}

export async function getMealsByDateRange(
  db: DrizzleDB,
  userId: string,
  from: Date,
  to: Date,
) {
  return db
    .select()
    .from(meals)
    .where(and(eq(meals.userId, userId), between(meals.mealTime, from, to)))
    .orderBy(meals.mealTime);
}
