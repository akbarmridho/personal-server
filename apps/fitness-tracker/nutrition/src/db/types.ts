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

export type FoodItem = z.infer<typeof FoodItemSchema>;
export type MealEstimation = z.infer<typeof MealEstimationSchema>;

export type Favorite = typeof favoriteFoods.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
