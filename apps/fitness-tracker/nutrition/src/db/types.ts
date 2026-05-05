import { z } from "zod";
import type { favoriteFoods, meals, measurements } from "./schema.js";

export const FoodItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  portion: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  references: z.array(z.string()),
});

export const MealEstimationSchema = z.object({
  error: z.boolean(),
  reason: z.string().optional(),
  items: z.array(FoodItemSchema),
  meal_time: z.string().nullable(),
  save_as: z.string().nullable(),
});

export const MeasurementSchema = z.object({
  weight: z.number(),
  body_fat_pct: z.number().optional(),
  body_fat_mass: z.number().optional(),
  skeletal_muscle_mass: z.number().optional(),
  visceral_fat_level: z.number().optional(),
  bmr: z.number().optional(),
  total_body_water: z.number().optional(),
  bmi: z.number().optional(),
  fat_free_mass: z.number().optional(),
  smi: z.number().optional(),
});

export type FoodItem = z.infer<typeof FoodItemSchema>;
export type MealEstimation = z.infer<typeof MealEstimationSchema>;
export type MeasurementData = z.infer<typeof MeasurementSchema>;

export type Favorite = typeof favoriteFoods.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
