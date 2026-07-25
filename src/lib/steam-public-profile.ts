import "server-only";

import type { OwnedGame } from "./steam";

/**
 * The free, unauthenticated Steam community games-list feed (ADR-0013) —
 * the only way to read a library with zero API key, but with two real
 * costs against the official `GetOwnedGames` Web API:
 *
 * 1. It only returns anything if the profile's "Game details" privacy is
 *    Public. There is no self-key bypass the way the official API has for
 *    your own account — a private profile has no anonymous door at all.
 * 2. It's a Valve legacy endpoint, explicitly marked deprecated (still
 *    functional as of this writing, but could be pulled without notice —
 *    a real risk, not the usual "undocumented but stable" caveat elsewhere
 *    in this codebase). It also has no last-played timestamp, only total
 *    and last-2-weeks hours.
 *
 * No XML library is pulled in for this — the feed's shape is a flat,
 * predictable list of `<game>` blocks, and a full parser is more surface
 * area than a handful of targeted regexes. Any shape this doesn't
 * recognize — private profile, endpoint gone, a redesign — is treated as
 * "can't do this," not partial success; the caller falls back to the API
 * key path rather than risk a garbled read of someone's library.
 */

const FEED_URL = (steamId: string) =>
  `https://steamcommunity.com/profiles/${steamId}/games?tab=all&xml=1`;

function unescapeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTag(block: string, tag: string): string | null {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  return m ? unescapeXml(m[1]).trim() : null;
}

/** Steam formats large hour totals with thousands separators, e.g. "1,234.5". */
function parseHours(raw: string | null): number {
  if (!raw) return 0;
  const n = Number.parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fetches and parses the public feed. Returns `null` for anything that
 * isn't a clean success — private profile, network failure, or a response
 * shape this parser doesn't recognize — never a partial or garbled list.
 */
export async function fetchPublicOwnedGames(steamId: string): Promise<OwnedGame[] | null> {
  try {
    const res = await fetch(FEED_URL(steamId), { cache: "no-store" });
    if (!res.ok) return null;

    const xml = await res.text();

    // A private profile, or any other non-success case, comes back as
    // <response><error>...</error></response> rather than <gamesList>.
    if (!/<gamesList>/.test(xml) || /<error>/.test(xml)) return null;

    const gamesBlock = /<games>([\s\S]*?)<\/games>/.exec(xml)?.[1];
    if (!gamesBlock) return null;

    const games: OwnedGame[] = [];
    for (const match of gamesBlock.matchAll(/<game>([\s\S]*?)<\/game>/g)) {
      const block = match[1];
      const appIdRaw = extractTag(block, "appID");
      if (!appIdRaw) continue;
      const appid = Number.parseInt(appIdRaw, 10);
      if (!Number.isFinite(appid)) continue;

      games.push({
        appid,
        name: extractTag(block, "name") ?? undefined,
        playtime_forever: Math.round(parseHours(extractTag(block, "hoursOnRecord")) * 60),
        playtime_2weeks: Math.round(parseHours(extractTag(block, "hoursLast2Weeks")) * 60),
        // Not exposed by this feed — see the module doc comment.
        rtime_last_played: undefined,
      });
    }

    return games;
  } catch {
    return null;
  }
}
