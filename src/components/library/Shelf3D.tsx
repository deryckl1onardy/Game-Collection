"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

import { type Game } from "@/lib/games";
import { rememberShelfScroll } from "@/lib/shelf-history";
import { packRows, PX_PER_WORLD, ROW_STEP } from "@/lib/shelf-layout";
import { useShelfScene } from "@/lib/shelf-scene";

export type Grouping = "title" | "playtime" | "recent";

/**
 * The library's half of the persistent 3D scene.
 *
 * Deliberately renders no WebGL of its own. The canvas lives above the router
 * (`ShelfStage`, mounted by `ShelfSceneProvider` in the root layout) so that
 * navigating to a game does not tear the renderer down — see the comment on
 * `shelf-scene.tsx`. All this route does is hand the wall its contents, own
 * the scroll runway that drives the camera, and keep the collection reachable
 * as ordinary links.
 */
export function Shelf3D({ games }: { games: Game[]; grouping: Grouping }) {
  const { showWall, claim, setScroll } = useShelfScene();

  const rows = useMemo(() => packRows(games).rows, [games]);
  const runway = Math.max(1, rows - 1) * ROW_STEP * PX_PER_WORLD + 800;

  // Claim for as long as this route is mounted. The scene is released on a
  // short delay, so the detail route can take over without the wall blinking
  // out between the two.
  useEffect(() => claim(), [claim]);

  useEffect(() => {
    showWall(games);
  }, [games, showWall]);

  useEffect(() => {
    const onScroll = () => {
      const maxY = Math.max(0, (rows - 1) * ROW_STEP);
      setScroll(Math.min(maxY, Math.max(0, window.scrollY) / PX_PER_WORLD));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [rows, setScroll]);

  return (
    <div style={{ height: runway }}>
      {/* The accessible floor: every game as a real link, for keyboard,
          screen reader and no-WebGL access regardless of what the wall is
          doing. */}
      <ul className="sr-only">
        {games.map((g) => (
          <li key={g.id}>
            <Link href={`/game/${g.id}`} onClick={rememberShelfScroll}>
              {g.title} — {g.platform}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
