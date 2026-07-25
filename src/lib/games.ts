/** Where a game's data came from. Steam syncs; everything else is hand-kept. */
export type Source = "steam" | "manual";

export type Platform =
  | "Steam"
  | "Epic"
  | "GOG"
  | "PSN"
  | "Xbox"
  | "Switch"
  | "Physical";

/**
 * Shelf state. Derived from playtime and the finished flag — never stored, so
 * it cannot drift out of sync with the numbers it describes.
 */
export type ShelfState = "unopened" | "unfinished" | "finished";

export type Game = {
  id: string;
  source: Source;
  platform: Platform;
  title: string;
  /** Hours. Zero means unopened — the wrap stays on. */
  playtime: number;
  /** Steam's rolling two-week figure — the "warm / momentum" signal. */
  playtimeRecent?: number;
  /** Powers "untouched for N months". */
  lastPlayedAt?: Date | null;
  /** Explicit user flag. Achievement % may suggest it, but never sets it. */
  finished: boolean;
  achievementPct: number | null;
  genres: string[];
  /** User's own tags, distinct from imported genres. */
  tags: string[];
  acquired: string;
  note: string;
  /** Session dates for the library card, oldest first. */
  stamps?: string[];
  /** Cover served from our own origin. Null falls back to generated art. */
  coverPath?: string | null;

  /** Enrichment (ADR-0010) — null/empty until the sync backfill reaches it. */
  description?: string | null;
  screenshots?: string[];
  /** Every platform the game is on. Cross-reference against `platform` to
   * see which one this copy is actually from. */
  platformsAvailable?: string[];
  storesAvailable?: string[];
  /** Best-effort (ADR-0011); null means nothing found, not an error. */
  topGuideUrl?: string | null;
  topGuideTitle?: string | null;
  hltbMainHours?: number | null;
  hltbMainExtraHours?: number | null;
  hltbCompletionistHours?: number | null;
};

/**
 * Guaranteed-correct link to a game's Steam Community guides, sorted so it's
 * curated by community vote rather than a raw unsorted list. Shown
 * regardless of whether the best-effort `topGuideUrl` auto-fetch found
 * anything (ADR-0011).
 */
export function steamGuidesUrl(appid: string) {
  return `https://steamcommunity.com/app/${appid}/guides/?browsefilter=toprated`;
}

/** Always-correct fallback — HowLongToBeat's own search page for the title. */
export function hltbSearchUrl(title: string) {
  return `https://howlongtobeat.com/?q=${encodeURIComponent(title)}`;
}

export function shelfState(g: Game): ShelfState {
  if (g.finished) return "finished";
  return g.playtime > 0 ? "unfinished" : "unopened";
}

/**
 * Seed data for build-order step 2 — the grid and filters need something to
 * work against before the Steam sync route exists. Deliberately mixes sources
 * and platforms so the "no visual tell" rule can actually be judged.
 */
export const SEED_GAMES: Game[] = [
  {
    id: "outer-wilds",
    source: "steam",
    platform: "Steam",
    title: "Outer Wilds",
    playtime: 6.5,
    finished: false,
    achievementPct: 22,
    genres: ["Adventure", "Puzzle"],
    tags: ["comfort game"],
    acquired: "mar 2023",
    note: "stopped at the quantum moon",
    stamps: ["jun 2023", "sep 2023", "jan 2024"],
  },
  {
    id: "hollow-knight",
    source: "steam",
    platform: "Steam",
    title: "Hollow Knight",
    playtime: 2.4,
    finished: false,
    achievementPct: 8,
    genres: ["Metroidvania", "Action"],
    tags: [],
    acquired: "nov 2021",
    note: "stopped in greenpath",
    stamps: ["nov 2021", "dec 2021"],
  },
  {
    id: "disco-elysium",
    source: "steam",
    platform: "Steam",
    title: "Disco Elysium",
    playtime: 0,
    finished: false,
    achievementPct: null,
    genres: ["RPG", "Narrative"],
    tags: ["someday"],
    acquired: "jun 2024",
    note: "still shrink wrapped",
  },
  {
    id: "hades",
    source: "steam",
    platform: "Steam",
    title: "Hades",
    playtime: 41.2,
    finished: true,
    achievementPct: 61,
    genres: ["Roguelike", "Action"],
    tags: ["replay someday"],
    acquired: "dec 2020",
    note: "cleared, 24 escapes",
    stamps: ["dec 2020", "jan 2021", "mar 2021"],
  },
  {
    id: "stardew-valley",
    source: "steam",
    platform: "Steam",
    title: "Stardew Valley",
    playtime: 12.8,
    finished: false,
    achievementPct: 17,
    genres: ["Simulation", "RPG"],
    tags: ["comfort game"],
    acquired: "feb 2022",
    note: "year 2, spring",
    stamps: ["feb 2022", "mar 2022"],
  },
  {
    id: "return-of-the-obra-dinn",
    source: "steam",
    platform: "Steam",
    title: "Return of the Obra Dinn",
    playtime: 9.1,
    finished: true,
    achievementPct: 100,
    genres: ["Puzzle", "Mystery"],
    tags: [],
    acquired: "aug 2021",
    note: "every fate identified",
    stamps: ["aug 2021", "sep 2021"],
  },
  {
    id: "tunic",
    source: "manual",
    platform: "Epic",
    title: "Tunic",
    playtime: 0,
    finished: false,
    achievementPct: null,
    genres: ["Adventure", "Puzzle"],
    tags: ["someday"],
    acquired: "may 2023",
    note: "claimed free, never opened",
  },
  {
    id: "cyberpunk-2077",
    source: "manual",
    platform: "GOG",
    title: "Cyberpunk 2077",
    playtime: 28.4,
    finished: false,
    achievementPct: 34,
    genres: ["RPG", "Action"],
    tags: [],
    acquired: "jan 2021",
    note: "night city, act 2",
    stamps: ["jan 2021", "feb 2021", "nov 2023"],
  },
  {
    id: "bloodborne",
    source: "manual",
    platform: "PSN",
    title: "Bloodborne",
    playtime: 33.0,
    finished: true,
    achievementPct: 48,
    genres: ["Action", "RPG"],
    tags: ["replay someday"],
    acquired: "apr 2019",
    note: "the moon presence fell",
    stamps: ["apr 2019", "may 2019", "jun 2019"],
  },
  {
    id: "metroid-dread",
    source: "manual",
    platform: "Switch",
    title: "Metroid Dread",
    playtime: 4.2,
    finished: false,
    achievementPct: null,
    genres: ["Metroidvania", "Action"],
    tags: [],
    acquired: "oct 2021",
    note: "artaria, hunting for missiles",
    stamps: ["oct 2021"],
  },
  {
    id: "halo-infinite",
    source: "manual",
    platform: "Xbox",
    title: "Halo Infinite",
    playtime: 0,
    finished: false,
    achievementPct: null,
    genres: ["Shooter", "Action"],
    tags: [],
    acquired: "dec 2021",
    note: "installed, never launched",
  },
  {
    id: "shadow-of-the-colossus",
    source: "manual",
    platform: "Physical",
    title: "Shadow of the Colossus",
    playtime: 15.5,
    finished: true,
    achievementPct: null,
    genres: ["Adventure", "Action"],
    tags: ["comfort game"],
    acquired: "mar 2006",
    note: "all sixteen",
    stamps: ["mar 2006", "apr 2006"],
  },
];
