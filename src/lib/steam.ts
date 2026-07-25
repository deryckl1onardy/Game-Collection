import "server-only";

import type { Game } from "./games";
import { fetchPublicOwnedGames } from "./steam-public-profile";
import { getStoredSteamConnection } from "./steam-connection";

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

export type SteamConnection =
  | { mode: "public-profile"; steamId: string }
  | { mode: "api-key"; key: string; steamId: string };

/**
 * The connection comes from `STEAM_API_KEY`/`STEAM_ID` env vars if both are
 * set, else the database row saved by the "connect Steam" flow (ADR-0012,
 * ADR-0013). Env vars win — they're the natural choice for a deployed
 * Vercel Cron run, which has no browser to click through a sign-in flow
 * with, so a deploy-time override always beats whatever was clicked
 * through the UI. An env-var connection is always api-key mode; the
 * public-profile mode only exists as something the UI can save.
 */
export async function resolveSteamConnection(): Promise<SteamConnection | null> {
  const envKey = process.env.STEAM_API_KEY;
  const envSteamId = process.env.STEAM_ID;
  if (envKey && envSteamId) return { mode: "api-key", key: envKey, steamId: envSteamId };

  const stored = await getStoredSteamConnection();
  if (!stored) return null;

  return stored.mode === "api-key"
    ? { mode: "api-key", key: stored.apiKey, steamId: stored.steamId }
    : { mode: "public-profile", steamId: stored.steamId };
}

export async function steamIsConfigured() {
  return (await resolveSteamConnection()) !== null;
}

/**
 * Tests a Steam Web API key/SteamID pair against a real endpoint, so a typo
 * pasted into the connect flow surfaces immediately with a clear message
 * instead of silently failing on the next sync.
 */
export async function validateSteamCredentials(
  key: string,
  steamId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const url = new URL(`${API}/ISteamUser/GetPlayerSummaries/v2/`);
    url.searchParams.set("key", key);
    url.searchParams.set("steamids", steamId);

    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Steam rejected this API key (401/403)." };
    }
    if (!res.ok) {
      return { ok: false, error: `Steam returned ${res.status} ${res.statusText}.` };
    }

    const body = (await res.json()) as {
      response?: { players?: unknown[] };
    };
    if (!body.response?.players?.length) {
      return { ok: false, error: "Steam accepted the key but found no such SteamID." };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not reach Steam.",
    };
  }
}

/**
 * Tests the free public-profile feed for a SteamID (ADR-0013), so the
 * connect flow can show "found N games" before saving anything — or a clear
 * "your profile is private" message instead of silently connecting to a
 * source that will return nothing on the next sync.
 */
export async function probePublicProfile(
  steamId: string,
): Promise<{ ok: true; gameCount: number } | { ok: false; error: string }> {
  const games = await fetchPublicOwnedGames(steamId);
  if (games === null) {
    return {
      ok: false,
      error:
        "Couldn't read a public games list for this account — your profile's " +
        "\"Game details\" privacy is probably not set to Public.",
    };
  }
  return { ok: true, gameCount: games.length };
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
 * A player's owned games — from the official Web API in api-key mode, or
 * the free public feed in public-profile mode (ADR-0013).
 *
 * In api-key mode, returns an empty list when the profile's game details
 * are not public and the key isn't the account's own — Steam reports that
 * as success with no games rather than an error, which is why the caller is
 * told to check privacy settings. In public-profile mode a private profile
 * throws instead, since there's no ambiguity to preserve: the feed simply
 * has no anonymous door for a private profile at all.
 */
export async function fetchOwnedGamesRaw(): Promise<OwnedGame[]> {
  const connection = await resolveSteamConnection();
  if (!connection) {
    throw new SteamConfigError(
      "Steam isn't connected — sign in at /connect-steam or set STEAM_API_KEY/STEAM_ID.",
    );
  }

  if (connection.mode === "public-profile") {
    const games = await fetchPublicOwnedGames(connection.steamId);
    if (games === null) {
      throw new SteamApiError(
        "Couldn't read the public games list — check that \"Game details\" is " +
          "still set to Public, or connect with an API key instead.",
      );
    }
    return games;
  }

  const { key, steamId } = connection;
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

type AppDetailsResponse = Record<
  string,
  {
    success: boolean;
    data?: {
      short_description?: string;
      genres?: { description: string }[];
      screenshots?: { path_full: string }[];
    };
  }
>;

export type SteamAppDetails = {
  description: string | null;
  genres: string[];
  screenshots: string[];
};

/**
 * Store metadata for a Steam game — description, genres, screenshots.
 *
 * Keyed by appid, so unlike the RAWG title search this can never match the
 * wrong game (ADR-0008, extended by ADR-0010 to cover description and
 * screenshots too). `store.steampowered.com/api/appdetails` is undocumented
 * and unofficial and can change without notice; a failure here just leaves
 * the enrichment fields null, same as any RAWG/HLTB miss.
 */
export async function fetchSteamAppDetails(appid: number): Promise<SteamAppDetails | null> {
  try {
    const url = new URL("https://store.steampowered.com/api/appdetails");
    url.searchParams.set("appids", String(appid));
    url.searchParams.set("filters", "short_description,genres,screenshots");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const body = (await res.json()) as AppDetailsResponse;
    const entry = body[String(appid)];
    if (!entry?.success || !entry.data) return null;

    return {
      description: entry.data.short_description?.trim() || null,
      genres: (entry.data.genres ?? []).map((g) => g.description),
      screenshots: (entry.data.screenshots ?? []).map((s) => s.path_full),
    };
  } catch {
    return null;
  }
}

type QueryFilesResponse = {
  response?: {
    publishedfiledetails?: { publishedfileid: string; title: string }[];
  };
};

/**
 * Best-effort lookup of the single highest-voted Community guide for a game,
 * via the IPublishedFileService/QueryFiles Steamworks endpoint (reuses the
 * same STEAM_API_KEY already required for library sync).
 *
 * Unverified (ADR-0011): `filetype=9` (web guide) and `query_type=0` (ranked
 * by vote) are recalled from the EWorkshopFileType/EPublishedFileQueryType
 * enums, not confirmed against a live response in this environment — Valve
 * does not document the numeric values. Wrong values here just come back as
 * an empty result, not an error, so this degrades to null exactly like a
 * genuine no-guide-exists case. `steamGuidesUrl` above is the fallback that
 * works regardless.
 */
export async function fetchTopSteamGuide(
  appid: number,
): Promise<{ url: string; title: string } | null> {
  const connection = await resolveSteamConnection();
  // QueryFiles requires a real key — unavailable in public-profile mode,
  // same as "not connected at all" from this function's point of view.
  if (!connection || connection.mode !== "api-key") return null;
  const { key } = connection;

  try {
    const url = new URL(`${API}/IPublishedFileService/QueryFiles/v1/`);
    url.searchParams.set("key", key);
    url.searchParams.set("appid", String(appid));
    url.searchParams.set("query_type", "0"); // k_PublishedFileQueryType_RankedByVote
    url.searchParams.set("filetype", "9"); // k_EWorkshopFileTypeWebGuide
    url.searchParams.set("numperpage", "1");
    url.searchParams.set("return_vote_data", "false");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const body = (await res.json()) as QueryFilesResponse;
    const top = body.response?.publishedfiledetails?.[0];
    if (!top) return null;

    return {
      url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${top.publishedfileid}`,
      title: top.title,
    };
  } catch {
    return null;
  }
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
