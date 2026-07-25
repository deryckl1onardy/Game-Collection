import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { ensureMigrated } from "@/db/migrate";
import { games, sessions, userGames } from "@/db/schema";
import type { Game, Platform, Source } from "./games";

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function shortDate(d: Date | null) {
  if (!d) return "unknown";
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

type Row = {
  game: typeof games.$inferSelect;
  user: typeof userGames.$inferSelect | null;
};

function toGame(row: Row, stamps?: string[], importedAt?: number): Game {
  const { game, user } = row;

  // Hand-kept playtime wins for platforms Steam cannot see (ADR-0006).
  const playtime = user?.manualPlaytime ?? game.playtime;

  /**
   * `firstSeenAt` only means "acquired" for games that showed up *after* the
   * initial import. Everything swept in by the first sync was first seen the
   * day this app was pointed at the account, which says nothing about when it
   * was bought — so we decline to claim a date rather than assert a false one.
   */
  const fromInitialImport =
    importedAt !== undefined &&
    Math.abs(game.firstSeenAt.getTime() - importedAt) < 60_000;

  return {
    id: game.id,
    source: game.source as Source,
    platform: game.platform as Platform,
    title: game.title,
    playtime,
    playtimeRecent: game.playtimeRecent,
    lastPlayedAt: game.lastPlayedAt,
    finished: user?.finished ?? false,
    achievementPct: game.achievementPct,
    genres: game.genres ?? [],
    tags: user?.tags ?? [],
    acquired: fromInitialImport ? "unknown" : shortDate(game.firstSeenAt),
    note:
      user?.note ??
      (playtime > 0
        ? `last played ${shortDate(game.lastPlayedAt)}`
        : "never launched"),
    stamps,
    coverPath: game.coverPath,
    description: game.description,
    screenshots: game.screenshots ?? [],
    platformsAvailable: game.platformsAvailable ?? [],
    storesAvailable: game.storesAvailable ?? [],
    topGuideUrl: game.topGuideUrl,
    topGuideTitle: game.topGuideTitle,
    hltbMainHours: game.hltbMainHours,
    hltbMainExtraHours: game.hltbMainExtraHours,
    hltbCompletionistHours: game.hltbCompletionistHours,
  };
}

export async function libraryIsPopulated() {
  await ensureMigrated();
  const handle = await db();
  const [row] = await handle.select({ id: games.id }).from(games).limit(1);
  return Boolean(row);
}

/** Timestamp of the very first sync — the bulk import everything arrived in. */
async function initialImportAt(handle: Awaited<ReturnType<typeof db>>) {
  const [row] = await handle
    .select({ at: games.firstSeenAt })
    .from(games)
    .orderBy(games.firstSeenAt)
    .limit(1);
  return row?.at.getTime();
}

export async function getLibrary(): Promise<Game[]> {
  await ensureMigrated();
  const handle = await db();

  const [rows, importedAt] = await Promise.all([
    handle
      .select({ game: games, user: userGames })
      .from(games)
      .leftJoin(userGames, eq(userGames.gameId, games.id)),
    initialImportAt(handle),
  ]);

  return rows.map((r) => toGame(r, undefined, importedAt));
}

/**
 * Applies the owner's own annotations to a game (ADR-0006).
 *
 * `finishedAt` is set the first time `finished` flips true and held after
 * that, rather than being passed in directly — the caller only ever knows
 * the checkbox state, not when it last changed.
 */
export async function updateUserGame(
  gameId: string,
  patch: {
    finished: boolean;
    note: string;
    tags: string[];
    manualPlaytime: number | null;
  },
) {
  await ensureMigrated();
  const handle = await db();

  const [existing] = await handle
    .select({ finishedAt: userGames.finishedAt })
    .from(userGames)
    .where(eq(userGames.gameId, gameId))
    .limit(1);

  const finishedAt = patch.finished ? (existing?.finishedAt ?? new Date()) : null;
  const note = patch.note.trim() || null;

  await handle
    .insert(userGames)
    .values({
      gameId,
      finished: patch.finished,
      finishedAt,
      note,
      tags: patch.tags,
      manualPlaytime: patch.manualPlaytime,
    })
    .onConflictDoUpdate({
      target: userGames.gameId,
      set: {
        finished: patch.finished,
        finishedAt,
        note,
        tags: patch.tags,
        manualPlaytime: patch.manualPlaytime,
      },
    });
}

/** One game, with its stamps — the library card is read straight off sessions. */
export async function getGame(id: string): Promise<Game | null> {
  await ensureMigrated();
  const handle = await db();

  const [row] = await handle
    .select({ game: games, user: userGames })
    .from(games)
    .leftJoin(userGames, eq(userGames.gameId, games.id))
    .where(eq(games.id, id))
    .limit(1);

  if (!row) return null;

  const rows = await handle
    .select({ seenAt: sessions.seenAt })
    .from(sessions)
    .where(eq(sessions.gameId, id))
    .orderBy(desc(sessions.seenAt))
    .limit(8);

  const stamps = rows.map((s) => shortDate(s.seenAt)).reverse();
  const importedAt = await initialImportAt(handle);

  return toGame(row, stamps.length ? stamps : undefined, importedAt);
}
