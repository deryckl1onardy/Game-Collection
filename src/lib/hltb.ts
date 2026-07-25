import "server-only";

/**
 * HowLongToBeat completion-time estimates (ADR-0011).
 *
 * No official API exists. `/api/search` is the endpoint community wrappers
 * (e.g. howlongtobeatpy) have historically used, but HLTB has a track record
 * of rotating this path specifically to break scrapers — this can stop
 * working with no warning and no way to detect why. Every field this
 * produces is best-effort; `hltbSearchUrl` in games.ts is the fallback that
 * always works because it's just a link to their search page, not a scrape.
 */

const SEARCH_URL = "https://howlongtobeat.com/api/search";

type HltbSearchResult = {
  game_name?: string;
  comp_main?: number; // seconds
  comp_plus?: number;
  comp_100?: number;
};

export type HltbTimes = {
  mainHours: number | null;
  mainExtraHours: number | null;
  completionistHours: number | null;
};

function toHours(seconds: number | undefined): number | null {
  if (!seconds) return null;
  return Math.round((seconds / 3600) * 10) / 10;
}

export async function fetchHltbTimes(title: string): Promise<HltbTimes | null> {
  try {
    const res = await fetch(SEARCH_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://howlongtobeat.com",
      },
      body: JSON.stringify({
        searchType: "games",
        searchTerms: title.split(" ").filter(Boolean),
        searchPage: 1,
        size: 1,
        searchOptions: {
          games: {
            sortCategory: "popular",
          },
        },
      }),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { data?: HltbSearchResult[] };
    const match = body.data?.[0];
    if (!match) return null;

    return {
      mainHours: toHours(match.comp_main),
      mainExtraHours: toHours(match.comp_plus),
      completionistHours: toHours(match.comp_100),
    };
  } catch {
    return null;
  }
}
