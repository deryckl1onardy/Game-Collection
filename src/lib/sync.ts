import "server-only";

import { eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { ensureMigrated } from "@/db/migrate";
import { games, sessions } from "@/db/schema";
import { enrichGame } from "./enrich";
import { fetchOwnedGamesRaw } from "./steam";

export type SyncReport = {
  total: number;
  added: number;
  updated: number;
  sessionsRecorded: number;
  hoursGained: number;
  enriched: number;
  ranAt: string;
};

/**
 * Detail-page enrichment (RAWG/Steam appdetails/guide/HLTB) costs several
 * external calls per game. Capped per sync run so a large not-yet-enriched
 * backlog — the very first sync after this feature shipped, or a big Steam
 * library — backfills gradually across nightly runs instead of risking the
 * route's 60s budget (see maxDuration in the sync route).
 */
const MAX_ENRICH_PER_SYNC = 8;

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

  const enriched = await enrichPending(handle);

  return {
    total: owned.length,
    added,
    updated,
    sessionsRecorded,
    hoursGained: Math.round(hoursGained * 10) / 10,
    enriched,
    ranAt: now.toISOString(),
  };
}

/**
 * Enriches up to `MAX_ENRICH_PER_SYNC` games that have never been enriched —
 * newly-added games from this sync plus any older backlog, oldest first.
 * Each game is independent: one failing must not stop the rest.
 */
async function enrichPending(handle: Awaited<ReturnType<typeof db>>): Promise<number> {
  const pending = await handle
    .select({
      id: games.id,
      title: games.title,
      source: games.source,
      sourceId: games.sourceId,
    })
    .from(games)
    .where(isNull(games.enrichedAt))
    .orderBy(games.firstSeenAt)
    .limit(MAX_ENRICH_PER_SYNC);

  let enriched = 0;

  for (const g of pending) {
    try {
      const result = await enrichGame({
        title: g.title,
        source: g.source as "steam" | "manual",
        sourceId: g.sourceId,
      });

      await handle
        .update(games)
        .set({ ...result, enrichedAt: new Date() })
        .where(eq(games.id, g.id));

      enriched++;
    } catch {
      // Leaves enrichedAt null so this game is retried next sync, unlike a
      // clean miss (which enrichGame reports as nulls, not a throw).
    }
  }

  return enriched;
}

/** Deletes a game and everything hanging off it. Used when unowned. */
export async function forget(gameId: string) {
  const handle = await db();
  await handle.delete(games).where(eq(games.id, gameId));
}
