import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { DrizzleDB } from "../db/index.js";
import { measurements } from "../db/schema.js";

export async function upsertMeasurement(
  db: DrizzleDB,
  data: typeof measurements.$inferInsert,
) {
  const [result] = await db
    .insert(measurements)
    .values(data)
    .onConflictDoUpdate({
      target: [measurements.userId, measurements.date],
      set: {
        weight: data.weight,
        bodyFatPct: data.bodyFatPct,
        bodyFatMass: data.bodyFatMass,
        skeletalMuscleMass: data.skeletalMuscleMass,
        visceralFatLevel: data.visceralFatLevel,
        bmr: data.bmr,
        totalBodyWater: data.totalBodyWater,
        bmi: data.bmi,
        fatFreeMass: data.fatFreeMass,
        boneMass: data.boneMass,
        smi: data.smi,
        notes: data.notes,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

export async function getRecentMeasurements(
  db: DrizzleDB,
  userId: string,
  limit = 2,
) {
  return db
    .select()
    .from(measurements)
    .where(eq(measurements.userId, userId))
    .orderBy(desc(measurements.date))
    .limit(limit);
}

/** Get recent entries that have body composition data (bodyFatPct filled) */
export async function getRecentBodyCompMeasurements(
  db: DrizzleDB,
  userId: string,
  limit = 2,
) {
  return db
    .select()
    .from(measurements)
    .where(
      and(eq(measurements.userId, userId), isNotNull(measurements.bodyFatPct)),
    )
    .orderBy(desc(measurements.date))
    .limit(limit);
}
