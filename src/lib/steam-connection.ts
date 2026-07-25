import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { ensureMigrated } from "@/db/migrate";
import { steamConnection } from "@/db/schema";

/**
 * Steam credentials stored via the "sign in with Steam" flow (ADR-0012), as
 * opposed to `STEAM_API_KEY`/`STEAM_ID` env vars. Single row — see the
 * schema doc comment on `steamConnection`.
 */
const ROW_ID = "singleton";

export async function getStoredSteamConnection(): Promise<{
  steamId: string;
  apiKey: string;
} | null> {
  await ensureMigrated();
  const handle = await db();

  const [row] = await handle
    .select({ steamId: steamConnection.steamId, apiKey: steamConnection.apiKey })
    .from(steamConnection)
    .where(eq(steamConnection.id, ROW_ID))
    .limit(1);

  return row ?? null;
}

export async function saveSteamConnection(steamId: string, apiKey: string) {
  await ensureMigrated();
  const handle = await db();

  await handle
    .insert(steamConnection)
    .values({ id: ROW_ID, steamId, apiKey, connectedAt: new Date() })
    .onConflictDoUpdate({
      target: steamConnection.id,
      set: { steamId, apiKey, connectedAt: new Date() },
    });
}

export async function clearSteamConnection() {
  await ensureMigrated();
  const handle = await db();
  await handle.delete(steamConnection).where(eq(steamConnection.id, ROW_ID));
}
