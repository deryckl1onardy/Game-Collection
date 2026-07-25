import "server-only";

import type { Game } from "./games";

/**
 * Steam Web API client.
 *
 * Server-only: the API key must never reach the browser. Importing this from a
 * client component is a build error by design.
 */

const API = "https://api.steampowered.com";

export type OwnedGame = {
  appid: number;
  name?: string;
  playtime_forever?: number; // minutes
  playtime_2weeks?: number; // minutes
  rtime_last_played?: number; // unix seconds
  img_icon_url?: string;
};

export class SteamConfigError extends Error {}
export class SteamApiError extends Error {}

function config() {
  const key = process.env.STEAM_API_KEY;
  const steamId = process.env.STEAM_ID;

  if (!key) throw new SteamConfigError("STEAM_API_KEY is not set in .env.local");
  if (!steamId) throw new SteamConfigError("STEAM_ID is not set in .env.local");

  return { key, steamId };
}

export function steamIsConfigured() {
  return Boolean(process.env.STEAM_API_KEY && process.env.STEAM_ID);
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function shortDate(unixSeconds: number) {
  if (!unixSeconds) return "unknown";
  const d = new Date(unixSeconds * 1000);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Covers are proxied through our own origin rather than hotlinked.
 *
 * WebGL refuses to upload a texture it isn't permitted to read, so a
 * cross-origin Steam CDN URL cannot become a case texture (gotcha 2). The
 * proxy is the stand-in until covers are downloaded to blob storage properly.
 */
function coverPath(appid: number) {
  return `/api/cover/${appid}`;
}

/**
 * A player's owned games.
 *
 * Returns an empty list when the profile's game details are not public —
 * Steam reports this as success with no games rather than an error, which is
 * why the caller is told to check privacy settings.
 */
export async function fetchOwnedGamesRaw(): Promise<OwnedGame[]> {
  const { key, steamId } = config();

  const url = new URL(`${API}/IPlayerService/GetOwnedGames/v1/`);
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { cache: "no-store" });

  if (res.status === 401 || res.status === 403) {
    throw new SteamApiError(
      "Steam rejected the API key (401/403). Check STEAM_API_KEY is correct and not revoked.",
    );
  }
  if (!res.ok) {
    throw new SteamApiError(`Steam returned ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as {
    response?: { game_count?: number; games?: OwnedGame[] };
  };

  return body.response?.games ?? [];
}

/** Live-fetch mapping, used only when no database is configured. */
export async function fetchOwnedGames(): Promise<Game[]> {
  const games = await fetchOwnedGamesRaw();

  return games.map((g): Game => {
    const hours = Math.round(((g.playtime_forever ?? 0) / 60) * 10) / 10;
    const lastPlayed = g.rtime_last_played ?? 0;

    return {
      id: String(g.appid),
      source: "steam",
      platform: "Steam",
      title: g.name?.trim() || `App ${g.appid}`,
      playtime: hours,
      // Steam cannot tell us this; only the owner can (see CONTEXT.md).
      finished: false,
      achievementPct: null,
      // Genres need a separate appdetails call per game (ADR-0008); skipped in
      // live-fetch mode so a large library does not fan out into hundreds of
      // requests on every page load.
      genres: [],
      tags: [],
      acquired: lastPlayed ? shortDate(lastPlayed) : "unknown",
      note: hours > 0 ? `last played ${shortDate(lastPlayed)}` : "never launched",
      stamps: undefined,
      coverPath: coverPath(g.appid),
    };
  });
}
