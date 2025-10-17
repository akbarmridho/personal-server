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
        value,
        expires_at: expiresAt || null,
      })
      .onConflict((oc) =>
        oc.column("key").doUpdateSet({
          value,
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
  ): Promise<Json> {
    const existing = await KV.get(key);
    if (existing !== null) return existing;

    const value = await factory();
    await KV.set(key, value, expiresAt);
    return value;
  }
}
