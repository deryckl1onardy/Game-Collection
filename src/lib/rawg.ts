import "server-only";

/**
 * RAWG API client (ADR-0010).
 *
 * The only source in this app for cross-platform availability — Steam's own
 * APIs have no notion of "also on Epic/GOG/Switch". Also the sole metadata
 * source for manually-tracked games, which have no appid to key off of.
 *
 * Matched by title search, not appid, so a wrong match is possible for an
 * ambiguous title. Accepted: a miss just leaves the enrichment fields null,
 * same as any other best-effort source in this pipeline.
 */

const API = "https://api.rawg.io/api";

export function rawgIsConfigured() {
  return Boolean(process.env.RAWG_API_KEY);
}

type RawgPlatformEntry = { platform?: { name?: string } };
type RawgStoreEntry = { store?: { name?: string } };
type RawgScreenshot = { image?: string };
type RawgGenre = { name?: string };

type RawgSearchResult = {
  id: number;
  platforms?: RawgPlatformEntry[];
  stores?: RawgStoreEntry[];
  short_screenshots?: RawgScreenshot[];
  genres?: RawgGenre[];
};

type RawgGameDetail = {
  description_raw?: string;
  platforms?: RawgPlatformEntry[];
  stores?: RawgStoreEntry[];
  genres?: RawgGenre[];
};

export type RawgDetails = {
  description: string | null;
  screenshots: string[];
  platforms: string[];
  stores: string[];
  genres: string[];
};

/**
 * Looks up a title and returns the enrichment fields, or null if RAWG has
 * nothing under this name or the lookup fails for any reason.
 *
 * Two calls (search, then the matched game's detail) — `description_raw`
 * only exists on the single-game endpoint, not the search/list response.
 */
export async function fetchRawgDetails(title: string): Promise<RawgDetails | null> {
  const key = process.env.RAWG_API_KEY;
  if (!key) return null;

  try {
    const searchUrl = new URL(`${API}/games`);
    searchUrl.searchParams.set("key", key);
    searchUrl.searchParams.set("search", title);
    searchUrl.searchParams.set("page_size", "1");

    const searchRes = await fetch(searchUrl, { cache: "no-store" });
    if (!searchRes.ok) return null;

    const searchBody = (await searchRes.json()) as { results?: RawgSearchResult[] };
    const match = searchBody.results?.[0];
    if (!match) return null;

    const detailUrl = new URL(`${API}/games/${match.id}`);
    detailUrl.searchParams.set("key", key);
    const detailRes = await fetch(detailUrl, { cache: "no-store" });
    const detail = detailRes.ok
      ? ((await detailRes.json()) as RawgGameDetail)
      : undefined;

    const platforms = detail?.platforms ?? match.platforms;
    const stores = detail?.stores ?? match.stores;
    const genres = detail?.genres ?? match.genres;

    return {
      description: detail?.description_raw?.trim() || null,
      screenshots: (match.short_screenshots ?? [])
        .map((s) => s.image)
        .filter((u): u is string => Boolean(u)),
      platforms: [
        ...new Set(
          (platforms ?? []).map((p) => p.platform?.name).filter((n): n is string => Boolean(n)),
        ),
      ],
      stores: [
        ...new Set(
          (stores ?? []).map((s) => s.store?.name).filter((n): n is string => Boolean(n)),
        ),
      ],
      genres: [
        ...new Set((genres ?? []).map((g) => g.name).filter((n): n is string => Boolean(n))),
      ],
    };
  } catch {
    // Best-effort — a network error or shape change here should never break
    // sync for games that don't depend on it.
    return null;
  }
}
