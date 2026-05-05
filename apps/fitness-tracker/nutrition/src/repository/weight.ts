import { and, desc, eq, lt } from "drizzle-orm";
import type { DrizzleDB } from "../db/index.js";
import { measurements } from "../db/schema.js";

export async function upsertWeight(
  db: DrizzleDB,
  data: { userId: string; date: string; weight: number },
) {
  const [result] = await db
    .insert(measurements)
    .values(data)
    .onConflictDoUpdate({
      target: [measurements.userId, measurements.date],
      set: { weight: data.weight, updatedAt: new Date() },
    })
    .returning();
  return result;
}

export async function getRecentWeights(
  db: DrizzleDB,
  userId: string,
  limit = 10,
) {
  return db
    .select({ date: measurements.date, weight: measurements.weight })
    .from(measurements)
    .where(eq(measurements.userId, userId))
    .orderBy(desc(measurements.date))
    .limit(limit);
}

export async function getPreviousWeight(
  db: DrizzleDB,
  userId: string,
  beforeDate: string,
) {
  const [prev] = await db
    .select({ date: measurements.date, weight: measurements.weight })
    .from(measurements)
    .where(
      and(eq(measurements.userId, userId), lt(measurements.date, beforeDate)),
    )
    .orderBy(desc(measurements.date))
    .limit(1);
  return prev ?? null;
}
