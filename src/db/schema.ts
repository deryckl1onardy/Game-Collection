import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Facts about a game that come from outside — Steam sync or manual entry.
 *
 * Sync clobbers this table freely. Anything the owner authored lives in
 * `userGames` instead, so a re-sync can never destroy their annotations.
 */
export const games = pgTable(
  "games",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(), // 'steam' | 'manual'
    /** Steam appid, or null for hand-entered games. */
    sourceId: text("source_id"),
    platform: text("platform").notNull(),
    title: text("title").notNull(),

    /** Hours. Zero means unopened — the wrap stays on (ADR-0005). */
    playtime: real("playtime").notNull().default(0),
    /** Steam's rolling two-week figure, for the "warm / momentum" signal. */
    playtimeRecent: real("playtime_recent").notNull().default(0),
    lastPlayedAt: timestamp("last_played_at"),

    achievementPct: integer("achievement_pct"),
    genres: text("genres").array().notNull().default([]),

    coverPath: text("cover_path"),

    /**
     * When this game first appeared in a sync.
     *
     * Steam does not expose a purchase date, so this is the honest answer to
     * "how long has it been sitting there" — and it only becomes truthful
     * because we persist. Live-fetch had to misreport last-played instead.
     */
    firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
    lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
  },
  (t) => [
    index("games_playtime_idx").on(t.playtime),
    index("games_last_played_idx").on(t.lastPlayedAt),
  ],
);

/**
 * The owner's own annotations. Never written by sync.
 *
 * Separate from `games` even though this is a single-user app (ADR-0003) —
 * the seam is about who owns the data, not how many users there are.
 */
export const userGames = pgTable("user_games", {
  gameId: text("game_id")
    .primaryKey()
    .references(() => games.id, { onDelete: "cascade" }),
  /** Explicit flag. Achievement % may suggest it; only the owner sets it. */
  finished: boolean("finished").notNull().default(false),
  finishedAt: timestamp("finished_at"),
  note: text("note"),
  tags: text("tags").array().notNull().default([]),
  /** Hand-kept playtime for platforms Steam cannot see (ADR-0006). */
  manualPlaytime: real("manual_playtime"),
});

/**
 * One observed increase in playtime between two syncs.
 *
 * This table *is* the library card — the stamps on the manual are read
 * straight off it. Recording deltas from day one is why the nightly cadence
 * matters and why sync-on-visit is forbidden (ADR-0005).
 */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    seenAt: timestamp("seen_at").notNull().defaultNow(),
    /** Hours gained since the previous sync. Always positive. */
    playtimeDelta: real("playtime_delta").notNull(),
  },
  (t) => [
    index("sessions_game_idx").on(t.gameId),
    uniqueIndex("sessions_game_seen_idx").on(t.gameId, t.seenAt),
  ],
);

export type GameRow = typeof games.$inferSelect;
export type UserGameRow = typeof userGames.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
