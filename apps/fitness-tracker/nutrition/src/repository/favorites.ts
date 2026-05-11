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

/**
 * Check if any existing favorite already has a matching alias (case-insensitive).
 * Returns the conflicting favorite or undefined.
 */
export function findDuplicateByAlias(
  favorites: { id: number; aliases: string[] | null; name: string }[],
  newAliases: string[],
): { id: number; aliases: string[] | null; name: string } | undefined {
  const normalizedNew = newAliases.map((a) => a.toLowerCase().trim());
  return favorites.find((f) =>
    (f.aliases ?? []).some((existing) =>
      normalizedNew.includes(existing.toLowerCase().trim()),
    ),
  );
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
