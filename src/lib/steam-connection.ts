import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { ensureMigrated } from "@/db/migrate";
import { steamConnection } from "@/db/schema";

/**
 * The stored Steam connection (ADR-0012, ADR-0013), as opposed to
 * `STEAM_API_KEY`/`STEAM_ID` env vars. Single row — see the schema doc
 * comment on `steamConnection`.
 */
const ROW_ID = "singleton";

export type StoredSteamConnection =
  | { mode: "public-profile"; steamId: string }
  | { mode: "api-key"; steamId: string; apiKey: string };

export async function getStoredSteamConnection(): Promise<StoredSteamConnection | null> {
  await ensureMigrated();
  const handle = await db();

  const [row] = await handle
    .select({
      steamId: steamConnection.steamId,
      mode: steamConnection.mode,
      apiKey: steamConnection.apiKey,
    })
    .from(steamConnection)
    .where(eq(steamConnection.id, ROW_ID))
    .limit(1);

  if (!row) return null;

  if (row.mode === "api-key" && row.apiKey) {
    return { mode: "api-key", steamId: row.steamId, apiKey: row.apiKey };
  }
  return { mode: "public-profile", steamId: row.steamId };
}

export async function savePublicProfileConnection(steamId: string) {
  await ensureMigrated();
  const handle = await db();

  await handle
    .insert(steamConnection)
    .values({ id: ROW_ID, steamId, mode: "public-profile", apiKey: null, connectedAt: new Date() })
    .onConflictDoUpdate({
      target: steamConnection.id,
      set: { steamId, mode: "public-profile", apiKey: null, connectedAt: new Date() },
    });
}

export async function saveApiKeyConnection(steamId: string, apiKey: string) {
  await ensureMigrated();
  const handle = await db();

  await handle
    .insert(steamConnection)
    .values({ id: ROW_ID, steamId, mode: "api-key", apiKey, connectedAt: new Date() })
    .onConflictDoUpdate({
      target: steamConnection.id,
      set: { steamId, mode: "api-key", apiKey, connectedAt: new Date() },
    });
}

export async function clearSteamConnection() {
  await ensureMigrated();
  const handle = await db();
  await handle.delete(steamConnection).where(eq(steamConnection.id, ROW_ID));
}
