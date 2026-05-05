import { and, eq, sql } from "drizzle-orm";
import type { DrizzleDB } from "../db/index.js";
import { meals } from "../db/schema.js";

const WIB = "Asia/Jakarta";

export interface DaySummary {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  mealCount: number;
}

export async function getDailyMeals(
  db: DrizzleDB,
  userId: string,
  date: string,
) {
  return db
    .select()
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        sql`(${meals.mealTime} at time zone ${WIB})::date = ${date}`,
      ),
    )
    .orderBy(meals.mealTime);
}

export async function getWeeklySummary(
  db: DrizzleDB,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<DaySummary[]> {
  const rows = await db
    .select({
      date: sql<string>`(${meals.mealTime} at time zone ${WIB})::date::text`,
      calories: sql<number>`coalesce(sum(${meals.calories}), 0)`,
      proteinG: sql<number>`coalesce(sum(${meals.proteinG}), 0)`,
      carbsG: sql<number>`coalesce(sum(${meals.carbsG}), 0)`,
      fatG: sql<number>`coalesce(sum(${meals.fatG}), 0)`,
      fiberG: sql<number>`coalesce(sum(${meals.fiberG}), 0)`,
      mealCount: sql<number>`count(*)`,
    })
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        sql`(${meals.mealTime} at time zone ${WIB})::date >= ${startDate}`,
        sql`(${meals.mealTime} at time zone ${WIB})::date <= ${endDate}`,
      ),
    )
    .groupBy(sql`(${meals.mealTime} at time zone ${WIB})::date`)
    .orderBy(sql`(${meals.mealTime} at time zone ${WIB})::date`);

  return rows;
}

export interface WeekSummary {
  weekStart: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  days: number;
}

export async function getMonthlySummary(
  db: DrizzleDB,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<WeekSummary[]> {
  const rows = await db
    .select({
      weekStart: sql<string>`date_trunc('week', (${meals.mealTime} at time zone ${WIB})::date)::text`,
      calories: sql<number>`coalesce(sum(${meals.calories}), 0)`,
      proteinG: sql<number>`coalesce(sum(${meals.proteinG}), 0)`,
      carbsG: sql<number>`coalesce(sum(${meals.carbsG}), 0)`,
      fatG: sql<number>`coalesce(sum(${meals.fatG}), 0)`,
      fiberG: sql<number>`coalesce(sum(${meals.fiberG}), 0)`,
      days: sql<number>`count(distinct (${meals.mealTime} at time zone ${WIB})::date)`,
    })
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        sql`(${meals.mealTime} at time zone ${WIB})::date >= ${startDate}`,
        sql`(${meals.mealTime} at time zone ${WIB})::date <= ${endDate}`,
      ),
    )
    .groupBy(
      sql`date_trunc('week', (${meals.mealTime} at time zone ${WIB})::date)`,
    )
    .orderBy(
      sql`date_trunc('week', (${meals.mealTime} at time zone ${WIB})::date)`,
    );

  return rows;
}
