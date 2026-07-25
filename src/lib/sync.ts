import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { ensureMigrated } from "@/db/migrate";
import { games, sessions } from "@/db/schema";
import { fetchOwnedGamesRaw } from "./steam";

export type SyncReport = {
  total: number;
  added: number;
  updated: number;
  sessionsRecorded: number;
  hoursGained: number;
  ranAt: string;
};

/**
 * Pulls the Steam library into the database.
 *
 * The important part is not the upsert — it is the diff. Any game whose
 * playtime rose since the last sync gets a `sessions` row for the increase,
 * and those rows are what the library card stamps are read from. Playtime
 * crossing zero is also what removes a game's wrap (ADR-0005), so this job is
 * the only thing in the system that can unseal a case.
 */
export async function runSync(): Promise<SyncReport> {
  await ensureMigrated();
  const handle = await db();

  const owned = await fetchOwnedGamesRaw();
  const now = new Date();

  const existing = await handle
    .select({ id: games.id, playtime: games.playtime })
    .from(games);
  const previous = new Map(existing.map((r) => [r.id, r.playtime]));

  let added = 0;
  let updated = 0;
  let sessionsRecorded = 0;
  let hoursGained = 0;

  for (const g of owned) {
    const id = String(g.appid);
    const hours = Math.round(((g.playtime_forever ?? 0) / 60) * 10) / 10;
    const recent = Math.round(((g.playtime_2weeks ?? 0) / 60) * 10) / 10;
    const lastPlayed = g.rtime_last_played
      ? new Date(g.rtime_last_played * 1000)
      : null;

    const before = previous.get(id);
    const isNew = before === undefined;

    await handle
      .insert(games)
      .values({
        id,
        source: "steam",
        sourceId: id,
        platform: "Steam",
        title: g.name?.trim() || `App ${g.appid}`,
        playtime: hours,
        playtimeRecent: recent,
        lastPlayedAt: lastPlayed,
        coverPath: `/api/cover/${g.appid}`,
        firstSeenAt: now,
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: games.id,
        set: {
          title: sql`excluded.title`,
          playtime: sql`excluded.playtime`,
          playtimeRecent: sql`excluded.playtime_recent`,
          lastPlayedAt: sql`excluded.last_played_at`,
          lastSyncedAt: sql`excluded.last_synced_at`,
          // firstSeenAt deliberately not updated — it records first sighting.
        },
      });

    if (isNew) {
      added++;
      continue;
    }

    updated++;

    const delta = Math.round((hours - (before ?? 0)) * 10) / 10;
    if (delta > 0) {
      await handle
        .insert(sessions)
        .values({
          id: `${id}-${now.getTime()}`,
          gameId: id,
          seenAt: now,
          playtimeDelta: delta,
        })
        .onConflictDoNothing();
      sessionsRecorded++;
      hoursGained += delta;
    }
  }

  return {
    total: owned.length,
    added,
    updated,
    sessionsRecorded,
    hoursGained: Math.round(hoursGained * 10) / 10,
    ranAt: now.toISOString(),
  };
}

/** Deletes a game and everything hanging off it. Used when unowned. */
export async function forget(gameId: string) {
  const handle = await db();
  await handle.delete(games).where(eq(games.id, gameId));
}
