import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { logger } from "../utils/logger.js";

export interface FoodSearchResult {
  id: number;
  source: "usda" | "openfoodfacts";
  name: string;
  brand: string;
  categories: string;
  country: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  score: number;
}

const DB_PATH = resolve(import.meta.dirname, "../../data/food-search.db");

export function openFoodDb(): Database.Database {
  if (!existsSync(DB_PATH)) {
    logger.error(
      { path: DB_PATH },
      "Food search database not found. Run: pnpm run setup-db",
    );
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  db.pragma("journal_mode = WAL");
  db.pragma("mmap_size = 268435456"); // 256MB mmap for fast reads
  return db;
}

/**
 * Search the food database using FTS5 BM25 ranking.
 * Boosts Indonesian products by default.
 */
export function searchFoods(
  db: Database.Database,
  query: string,
  options: {
    limit?: number;
    source?: "usda" | "openfoodfacts";
    country?: string;
  } = {},
): FoodSearchResult[] {
  const { limit = 10, source, country } = options;

  // Escape FTS5 special characters
  const escaped = query.replace(/['"*(){}[\]^~\\:]/g, " ").trim();
  if (!escaped) return [];

  // Build match expression:
  // - Single term: prefix search "term"*
  // - Multiple terms: OR between terms — BM25 ranks multi-match rows higher
  const terms = escaped.split(/\s+/).filter(Boolean);
  let matchExpr: string;
  if (terms.length === 1) {
    matchExpr = `"${terms[0]}"*`;
  } else {
    matchExpr = terms.map((t) => `"${t}"*`).join(" OR ");
  }

  // Map source param to DB value
  const dbSource = source === "openfoodfacts" ? "off" : source;

  // Build WHERE clauses and params
  const conditions = ["foods_fts MATCH ?"];
  const params: unknown[] = [matchExpr];

  if (dbSource) {
    conditions.push("f.source = ?");
    params.push(dbSource);
  }

  if (country) {
    conditions.push("f.country LIKE ?");
    params.push(`%${country}%`);
  }

  const whereClause = conditions.join(" AND ");

  const sql = `
    SELECT
      f.id, f.source, f.name, f.brand, f.categories, f.country,
      f.serving_size, f.calories, f.protein, f.carbs, f.fat, f.fiber,
      foods_fts.rank AS score
    FROM foods_fts
    JOIN foods f ON f.id = foods_fts.rowid
    WHERE ${whereClause}
    ORDER BY (foods_fts.rank - CASE WHEN f.country LIKE '%Indonesia%' THEN 5.0 ELSE 0 END)
    LIMIT ?
  `;
  params.push(limit);

  try {
    const rows = db.prepare(sql).all(...params) as Array<
      Omit<FoodSearchResult, "source"> & { source: string }
    >;
    return rows.map((r) => ({
      ...r,
      source: (r.source === "off" ? "openfoodfacts" : r.source) as
        | "usda"
        | "openfoodfacts",
    }));
  } catch (err) {
    logger.warn({ query, matchExpr, err }, "FTS5 search failed, trying simple");
    const likeSql = `
      SELECT
        id, source, name, brand, categories, country,
        serving_size, calories, protein, carbs, fat, fiber,
        0 as score
      FROM foods
      WHERE name LIKE ?
      ${dbSource ? "AND source = ?" : ""}
      ${country ? "AND country LIKE ?" : ""}
      ORDER BY CASE WHEN country LIKE '%Indonesia%' THEN 0 ELSE 1 END
      LIMIT ?
    `;
    const likeParams: unknown[] = [`%${escaped}%`];
    if (dbSource) likeParams.push(dbSource);
    if (country) likeParams.push(`%${country}%`);
    likeParams.push(limit);

    const rows = db.prepare(likeSql).all(...likeParams) as Array<
      Omit<FoodSearchResult, "source"> & { source: string }
    >;
    return rows.map((r) => ({
      ...r,
      source: (r.source === "off" ? "openfoodfacts" : r.source) as
        | "usda"
        | "openfoodfacts",
    }));
  }
}
