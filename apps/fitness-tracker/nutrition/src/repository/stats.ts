import { and, eq, sql } from "drizzle-orm";
import type { DrizzleDB } from "../db/index.js";
import { meals } from "../db/schema.js";

const WIB = "Asia/Jakarta";
const mealTimeWibDate = sql.raw(`(meal_time at time zone '${WIB}')::date`);
const mealTimeWibDateTrunc = sql.raw(
  `date_trunc('week', (meal_time at time zone '${WIB}')::date)::date`,
);

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
    .where(and(eq(meals.userId, userId), sql`${mealTimeWibDate} = ${date}`))
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
      date: sql<string>`${mealTimeWibDate}::text`,
      calories: sql<number>`coalesce(sum(${meals.calories}), 0)`,
      proteinG: sql<number>`coalesce(sum(${meals.proteinG}), 0)`,
      carbsG: sql<number>`coalesce(sum(${meals.carbsG}), 0)`,
      fatG: sql<number>`coalesce(sum(${meals.fatG}), 0)`,
      fiberG: sql<number>`coalesce(sum(${meals.fiberG}), 0)`,
      mealCount: sql<number>`count(*)::int`,
    })
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        sql`${mealTimeWibDate} >= ${startDate}`,
        sql`${mealTimeWibDate} <= ${endDate}`,
      ),
    )
    .groupBy(mealTimeWibDate)
    .orderBy(mealTimeWibDate);

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
      weekStart: sql<string>`${mealTimeWibDateTrunc}::text`,
      calories: sql<number>`coalesce(sum(${meals.calories}), 0)`,
      proteinG: sql<number>`coalesce(sum(${meals.proteinG}), 0)`,
      carbsG: sql<number>`coalesce(sum(${meals.carbsG}), 0)`,
      fatG: sql<number>`coalesce(sum(${meals.fatG}), 0)`,
      fiberG: sql<number>`coalesce(sum(${meals.fiberG}), 0)`,
      days: sql<number>`count(distinct ${mealTimeWibDate})::int`,
    })
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        sql`${mealTimeWibDate} >= ${startDate}`,
        sql`${mealTimeWibDate} <= ${endDate}`,
      ),
    )
    .groupBy(mealTimeWibDateTrunc)
    .orderBy(mealTimeWibDateTrunc);

  return rows;
}
