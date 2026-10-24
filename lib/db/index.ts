import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Fallback prevents module evaluation crash during build time when process.env isn't loaded
const dbUrl = process.env.ADMIN_DATABASE_URL!

const sql = neon(dbUrl);

export const db = drizzle({ client: sql, schema });

export * from "./schema";