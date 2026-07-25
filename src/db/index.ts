import "server-only";

import * as schema from "./schema";

/**
 * Database handle.
 *
 * Production is Neon (ADR-0004). Local development falls back to PGlite — real
 * Postgres compiled to WASM, stored in `.pglite/` — so the project can be run
 * and verified without provisioning a cloud database first. Same dialect, same
 * schema, same Drizzle queries; switching is a matter of setting DATABASE_URL.
 */

export type Db = Awaited<ReturnType<typeof createDb>>;

async function createDb() {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { neon } = await import("@neondatabase/serverless");
    return drizzle(neon(url), { schema });
  }

  const { drizzle } = await import("drizzle-orm/pglite");
  const { PGlite } = await import("@electric-sql/pglite");

  const client = new PGlite(".pglite");
  // PGlite boots asynchronously; querying before this resolves fails with an
  // opaque "Failed query" on the very first statement.
  await client.waitReady;

  return drizzle(client, { schema });
}

// Cached across hot reloads; a fresh PGlite instance per request would
// re-open the data directory and lose connections.
const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

export function db(): Promise<Db> {
  globalForDb.__db ??= createDb();
  return globalForDb.__db;
}

export function usingNeon() {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
