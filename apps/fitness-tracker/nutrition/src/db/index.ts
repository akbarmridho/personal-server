import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../infrastructure/env.js";
import * as schema from "./schema.js";

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
export type DrizzleDB = typeof db;
