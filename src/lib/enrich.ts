import "server-only";

import { fetchHltbTimes } from "./hltb";
import { rawgIsConfigured, fetchRawgDetails } from "./rawg";
import { fetchSteamAppDetails, fetchTopSteamGuide } from "./steam";

/**
 * Fills in the detail-page fields for one game (ADR-0010, ADR-0011):
 * description, screenshots, genres, cross-platform availability, a guide,
 * and completion-time estimates.
 *
 * Runs once per game, called from sync for newly-discovered and
 * not-yet-enriched Steam games. Every source here is independently
 * best-effort — one failing (wrong RAWG match, HLTB endpoint having moved,
 * no guide found) must never affect the others, so each is caught on its
 * own rather than letting one throw abort the batch.
 */
export type Enrichment = {
  description: string | null;
  screenshots: string[];
  genres: string[];
  platformsAvailable: string[];
  storesAvailable: string[];
  topGuideUrl: string | null;
  topGuideTitle: string | null;
  hltbMainHours: number | null;
  hltbMainExtraHours: number | null;
  hltbCompletionistHours: number | null;
};

export async function enrichGame(game: {
  title: string;
  source: "steam" | "manual";
  sourceId: string | null;
}): Promise<Enrichment> {
  const appid = game.source === "steam" && game.sourceId ? Number(game.sourceId) : null;

  const [steamDetails, rawgDetails, guide, hltb] = await Promise.all([
    appid ? fetchSteamAppDetails(appid) : Promise.resolve(null),
    rawgIsConfigured() ? fetchRawgDetails(game.title) : Promise.resolve(null),
    appid ? fetchTopSteamGuide(appid) : Promise.resolve(null),
    fetchHltbTimes(game.title),
  ]);

  return {
    // Steam's appdetails is appid-keyed and can't mismatch, so it wins over
    // RAWG's title search whenever both are available (ADR-0008, ADR-0010).
    description: steamDetails?.description ?? rawgDetails?.description ?? null,
    screenshots: steamDetails?.screenshots?.length
      ? steamDetails.screenshots
      : (rawgDetails?.screenshots ?? []),
    genres: steamDetails?.genres?.length ? steamDetails.genres : (rawgDetails?.genres ?? []),
    platformsAvailable: rawgDetails?.platforms ?? [],
    storesAvailable: rawgDetails?.stores ?? [],
    topGuideUrl: guide?.url ?? null,
    topGuideTitle: guide?.title ?? null,
    hltbMainHours: hltb?.mainHours ?? null,
    hltbMainExtraHours: hltb?.mainExtraHours ?? null,
    hltbCompletionistHours: hltb?.completionistHours ?? null,
  };
}
