import "server-only";

import path from "node:path";

import { db, usingNeon } from "./index";

/**
 * Applies pending migrations.
 *
 * Called lazily on first database use so local development needs no separate
 * migrate step. On Neon this is a no-op after the first run; migrations are
 * tracked in Drizzle's own bookkeeping table.
 */

const globalForMigrate = globalThis as unknown as { __migrated?: Promise<void> };

async function run() {
  const handle = await db();

  // Absolute — a relative path is resolved against the server runtime's cwd,
  // which is not reliably the project root. When it misses, the migrator finds
  // no files and silently succeeds, and the first query then fails with
  // "relation ... does not exist".
  const migrationsFolder = path.join(process.cwd(), "drizzle");

  if (usingNeon()) {
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(handle as any, { migrationsFolder });
    return;
  }

  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(handle as any, { migrationsFolder });
}

export function ensureMigrated(): Promise<void> {
  globalForMigrate.__migrated ??= run();
  return globalForMigrate.__migrated;
}
