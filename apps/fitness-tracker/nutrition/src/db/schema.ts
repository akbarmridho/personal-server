import {
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  batchId: text("batch_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  mealTime: timestamp("meal_time", { withTimezone: true }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  portion: text("portion"),
  photoFileIds: text("photo_file_ids").array(),
  calories: doublePrecision("calories"),
  proteinG: doublePrecision("protein_g"),
  carbsG: doublePrecision("carbs_g"),
  fatG: doublePrecision("fat_g"),
  fiberG: doublePrecision("fiber_g"),
  references: text("references").array(),
});

export const favoriteFoods = pgTable("favorite_foods", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  aliases: text("aliases").array().notNull(),
  calories: doublePrecision("calories").notNull(),
  proteinG: doublePrecision("protein_g").notNull(),
  carbsG: doublePrecision("carbs_g").notNull(),
  fatG: doublePrecision("fat_g").notNull(),
  fiberG: doublePrecision("fiber_g"),
  portion: text("portion"),
  references: text("references").array(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const measurements = pgTable(
  "measurements",
  {
    id: text("id")
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    userId: text("user_id").notNull(),
    date: date("date").notNull(),
    weight: doublePrecision("weight").notNull(),
    bodyFatPct: doublePrecision("body_fat_pct"),
    bodyFatMass: doublePrecision("body_fat_mass"),
    skeletalMuscleMass: doublePrecision("skeletal_muscle_mass"),
    visceralFatLevel: integer("visceral_fat_level"),
    bmr: integer("bmr"),
    totalBodyWater: doublePrecision("total_body_water"),
    bmi: doublePrecision("bmi"),
    fatFreeMass: doublePrecision("fat_free_mass"),
    smi: doublePrecision("smi"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique().on(table.userId, table.date),
    index().on(table.userId, table.date),
  ],
);
