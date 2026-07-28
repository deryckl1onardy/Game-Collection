import { H, THICK } from "./case-geometry";
import type { Game } from "./games";

/**
 * Where every case stands on the wall, in world units.
 *
 * Split out of the stage component because two things now need it: the WebGL
 * scene, which draws the cases, and the page-level controller, which sizes the
 * scroll spacer and maps arrow keys onto rows. Both must agree exactly or the
 * camera lands somewhere the cases are not.
 */

const ROW_WIDTH = 30;
const ROW_GAP_X = 0.05;
export const ROW_STEP = H + 0.85;
/** How many px of page scroll cover one world unit of shelf. */
export const PX_PER_WORLD = 92;
/** Same base-40px-per-thickness convention the old CSS spine wall used. */
const WORLD_PER_PX_THICK = THICK / 40;

export const CAMERA_Z = 9.2;
export const CAMERA_FOV = 40;

/**
 * How far the camera sits from a case it is presenting, and how far that case
 * comes out of the row to be presented. Derived rather than eyeballed: at
 * fov 40 the visible height at distance d is 2·d·tan(20°), so framing a case
 * (H tall) at ~62% of the viewport puts the camera 4.55 units off its face.
 */
export const DETAIL_CASE_PULL = 1.9;
export const DETAIL_CAMERA_GAP = H / (2 * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)) * 0.62);

/**
 * How thick a case is, in world units.
 *
 * A wall of identical slabs reads as a bar chart — real collections have no
 * such uniformity. The platform gives an honest base; the jitter is decoration
 * standing in for edition variance the data does not record, seeded from the
 * id so it never reshuffles between renders.
 */
const PLATFORM_THICKNESS_PX: Record<string, number> = {
  Switch: 34,
  PSN: 44,
  Xbox: 44,
  Physical: 46,
  Steam: 40,
  Epic: 40,
  GOG: 40,
};

function thicknessWorld(g: Game): number {
  const base = (g.platform && PLATFORM_THICKNESS_PX[g.platform]) ?? 40;
  let h = 2166136261;
  for (let i = 0; i < g.id.length; i++) {
    h ^= g.id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const px = base + (((h >>> 0) % 11) - 5);
  return px * WORLD_PER_PX_THICK;
}

export type Placed = { game: Game; row: number; x: number; thickness: number };

/**
 * Packs the (already-sorted) list into rows of roughly `ROW_WIDTH`, the way a
 * real shelf breaks into runs.
 */
export function packRows(games: Game[]): { placed: Placed[]; rows: number } {
  const placed: Placed[] = [];
  let row = 0;
  let rowGames: { game: Game; t: number }[] = [];
  let w = 0;

  const flush = () => {
    if (!rowGames.length) return;
    const total = rowGames.reduce((s, r) => s + r.t, 0) + ROW_GAP_X * (rowGames.length - 1);
    let x = -total / 2;
    for (const r of rowGames) {
      placed.push({ game: r.game, row, x: x + r.t / 2, thickness: r.t });
      x += r.t + ROW_GAP_X;
    }
    row += 1;
    rowGames = [];
    w = 0;
  };

  for (const game of games) {
    const t = thicknessWorld(game);
    if (w + t > ROW_WIDTH && rowGames.length) flush();
    rowGames.push({ game, t });
    w += t + ROW_GAP_X;
  }
  flush();

  return { placed, rows: row };
}

/** The world Y of a row's centre line. */
export const rowY = (row: number) => -row * ROW_STEP;
