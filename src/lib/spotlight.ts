import { type Game, shelfState } from "./games";

/**
 * Picking what to put in front of you when you open the site.
 *
 * Both surfaces are deliberately low-pressure. Nothing here counts, ranks, or
 * nags — the point is anticipation, not a chore list.
 */

const DAY_MS = 86_400_000;

/** Whole days since a game was last touched, or null if never played. */
export function daysSincePlayed(g: Game): number | null {
  if (!g.lastPlayedAt) return null;
  const then = new Date(g.lastPlayedAt).getTime();
  if (!then) return null;
  return Math.floor((Date.now() - then) / DAY_MS);
}

/** "3 years ago", "2 months ago", "last week" — vague on purpose. */
export function agoLabel(days: number | null): string {
  if (days === null) return "never launched";
  if (days <= 1) return "today";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 730) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Games you were partway through.
 *
 * Ranked by warmth first — Steam's two-week playtime means you are actually in
 * it right now — then by how recently it was touched. Games left untouched for
 * years are excluded rather than resurfaced: dragging up something abandoned in
 * 2019 reads as an accusation, which is exactly the feeling this project
 * exists to avoid.
 */
export function continueWhereYouLeftOff(games: Game[], limit = 3): Game[] {
  const candidates = games.filter((g) => {
    if (shelfState(g) !== "unfinished") return false;
    const days = daysSincePlayed(g);
    return days !== null && days <= 400;
  });

  return candidates
    .sort((a, b) => {
      const warmth = (b.playtimeRecent ?? 0) - (a.playtimeRecent ?? 0);
      if (warmth !== 0) return warmth;
      return (daysSincePlayed(a) ?? 1e9) - (daysSincePlayed(b) ?? 1e9);
    })
    .slice(0, limit);
}

/** Stable per calendar day, so the pick is a daily ritual and not a reroll. */
function daySeed(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * One sealed game, offered without comment.
 *
 * Chosen deterministically from the date, so it stays the same all day however
 * many times you open the site — re-rolling on every refresh would turn a small
 * ritual into a slot machine.
 */
export function pulledFromTheShelf(games: Game[], date = new Date()): Game | null {
  const sealed = games
    .filter((g) => shelfState(g) === "unopened")
    // Sorted for a stable index; ids are unique so the order never wobbles.
    .sort((a, b) => a.id.localeCompare(b.id));

  if (sealed.length === 0) return null;
  return sealed[daySeed(date) % sealed.length];
}
