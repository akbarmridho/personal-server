import { sql } from "kysely";
import { logger } from "../../utils/logger.js";
import { db } from "./db.js";
import type { Json } from "./types.js";

// biome-ignore lint/complexity/noStaticOnlyClass: wtf just let me code you opinionated freak
export class KV {
  static async get(key: string): Promise<Json | null> {
    const result = await db
      .selectFrom("kv_store")
      .selectAll()
      .where("key", "=", key)
      .where((eb) =>
        eb.or([
          eb("expires_at", "is", null),
          eb("expires_at", ">", new Date()),
        ]),
      )
      .executeTakeFirst();

    if (!result) return null;

    if (result.expires_at && new Date(result.expires_at) <= new Date()) {
      await db.deleteFrom("kv_store").where("key", "=", key).execute();
      return null;
    }

    return result.value;
  }

  static async set(key: string, value: Json, expiresAt?: Date): Promise<void> {
    await db
      .insertInto("kv_store")
      .values({
        key,
        value: sql`${JSON.stringify(value)}::jsonb`,
        expires_at: expiresAt || null,
      })
      .onConflict((oc) =>
        oc.column("key").doUpdateSet({
          value: sql`${JSON.stringify(value)}::jsonb`,
          expires_at: expiresAt || null,
          updated_at: new Date(),
        }),
      )
      .execute();
  }

  static async getOrSet(
    key: string,
    factory: () => Promise<Json>,
    expiresAt?: Date,
    allowStale = false,
  ): Promise<Json> {
    const existing = await KV.get(key);
    if (existing !== null) return existing;

    try {
      const value = await factory();
      await KV.set(key, value, expiresAt);
      return value;
    } catch (error) {
      if (allowStale) {
        logger.error({ error }, `Factory error. Reading stale data.`);
        const stale = await db
          .selectFrom("kv_store")
          .select("value")
          .where("key", "=", key)
          .executeTakeFirst();
        if (stale) return stale.value;
      }
      throw error;
    }
  }

  /**
   * Atomically add a value to a JSONB array field if it doesn't already exist.
   * Creates the key and array if they don't exist.
   */
  static async arrayAdd(
    key: string,
    arrayPath: string,
    value: string,
  ): Promise<string[]> {
    // First ensure the key exists with an empty array
    await db
      .insertInto("kv_store")
      .values({
        key,
        value: sql`jsonb_build_object(${sql.lit(arrayPath)}, '[]'::jsonb)`,
        expires_at: null,
      })
      .onConflict((oc) => oc.column("key").doNothing())
      .execute();

    // Atomically append to array if value doesn't exist
    // Using PostgreSQL's || operator for array concatenation
    // and ? operator to check existence
    const result = await db
      .updateTable("kv_store")
      .set({
        value: sql`
          CASE
            WHEN value->${sql.lit(arrayPath)} ? ${value} THEN value
            ELSE jsonb_set(
              value,
              ${sql.lit(`{${arrayPath}}`)},
              (COALESCE(value->${sql.lit(arrayPath)}, '[]'::jsonb) || ${sql`to_jsonb(${value}::text)`}),
              true
            )
          END
        `,
        updated_at: new Date(),
      })
      .where("key", "=", key)
      .returning(sql`value->>${sql.lit(arrayPath)}`.as("array"))
      .executeTakeFirstOrThrow();

    return JSON.parse(result.array as string);
  }

  /**
   * Atomically remove a value from a JSONB array field.
   */
  static async arrayRemove(
    key: string,
    arrayPath: string,
    value: string,
  ): Promise<string[]> {
    const result = await db
      .updateTable("kv_store")
      .set({
        value: sql`
          jsonb_set(
            value,
            ${sql.lit(`{${arrayPath}}`)},
            (
              SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
              FROM jsonb_array_elements_text(COALESCE(value->${sql.lit(arrayPath)}, '[]'::jsonb)) elem
              WHERE elem != ${value}
            ),
            true
          )
        `,
        updated_at: new Date(),
      })
      .where("key", "=", key)
      .returning(sql`value->>${sql.lit(arrayPath)}`.as("array"))
      .executeTakeFirst();

    if (!result) {
      return [];
    }

    return JSON.parse(result.array as string);
  }
}
