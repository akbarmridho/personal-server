import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../db/index.js";
import { favoriteFoods } from "../db/schema.js";

export async function listFavorites(db: DrizzleDB, userId: string) {
  return db
    .select()
    .from(favoriteFoods)
    .where(eq(favoriteFoods.userId, userId))
    .orderBy(favoriteFoods.id);
}

export async function createFavorite(
  db: DrizzleDB,
  data: typeof favoriteFoods.$inferInsert,
) {
  const [fav] = await db.insert(favoriteFoods).values(data).returning();
  return fav;
}

export async function deleteFavoriteById(db: DrizzleDB, id: number) {
  const result = await db
    .delete(favoriteFoods)
    .where(eq(favoriteFoods.id, id))
    .returning();
  return result.length > 0;
}
