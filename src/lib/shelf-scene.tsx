"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";

import type { Game } from "./games";

/**
 * Loaded lazily and client-only: it is WebGL, so it must never run during
 * SSR, and the late import also breaks what would otherwise be a cycle
 * (the stage reads this module's context).
 */
const ShelfStage = dynamic(
  () => import("@/components/library/ShelfStage").then((m) => m.ShelfStage),
  { ssr: false },
);

/**
 * The state of the one persistent 3D scene.
 *
 * The library and a game's detail page are two different routes but must be
 * the same WebGL context: a route change that unmounts the canvas destroys
 * the renderer, drops every texture off the GPU and rebuilds a fresh scene,
 * which is a teardown no crossfade can disguise. So the canvas lives above
 * both routes (see `ShelfSceneProvider` in the root layout) and the routes
 * only tell it what to show.
 *
 * `mode` is therefore a camera state, not a different scene: `wall` flies the
 * camera along the rows, `detail` flies it to one case, which comes out of
 * the row and upgrades in place to the full openable case.
 */

export type SceneMode = "wall" | "detail";

type SceneValue = {
  /** The wall's contents. Empty means nothing has claimed the scene. */
  games: Game[];
  mode: SceneMode;
  selectedId: string | null;
  /** Whether the presented case is hinged open. */
  open: boolean;
  /**
   * Live scroll offset in world units, written by the library route every
   * scroll event and read by the camera rig every frame. A ref rather than
   * state so scrolling never re-renders the scene graph.
   */
  scroll: React.RefObject<number>;
  /** Writes `scroll`. A setter, so callers never mutate the ref directly. */
  setScroll: (world: number) => void;

  showWall: (games: Game[]) => void;
  showDetail: (id: string) => void;
  setOpen: (open: boolean) => void;
  /** Registers a route as using the scene; returns its release function. */
  claim: () => () => void;
};

const Ctx = createContext<SceneValue | null>(null);

export function ShelfSceneProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [mode, setMode] = useState<SceneMode>("wall");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const scroll = useRef(0);

  /**
   * Reference counting with a deferred release.
   *
   * Navigating shelf → detail unmounts the library route before it mounts the
   * detail route, so a naive "clear on unmount" would blank the wall for a
   * frame in the middle of the very transition this exists to make seamless.
   * The grace period lets the incoming route claim the scene before the
   * outgoing one's release is honoured.
   */
  const claims = useRef(0);
  const timer = useRef<number | null>(null);

  const claim = useCallback(() => {
    claims.current += 1;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      claims.current -= 1;
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (claims.current <= 0) {
          setGames([]);
          setSelectedId(null);
          setOpen(false);
        }
      }, 200);
    };
  }, []);

  const setScroll = useCallback((world: number) => {
    scroll.current = world;
  }, []);

  const showWall = useCallback((next: Game[]) => {
    setGames((prev) =>
      prev.length === next.length && prev.every((g, i) => g.id === next[i]?.id) ? prev : next,
    );
    setMode("wall");
    setOpen(false);
  }, []);

  const showDetail = useCallback((id: string) => {
    setSelectedId(id);
    setMode("detail");
  }, []);

  const value = useMemo<SceneValue>(
    () => ({
      games,
      mode,
      selectedId,
      open,
      scroll,
      setScroll,
      showWall,
      showDetail,
      setOpen,
      claim,
    }),
    [games, mode, selectedId, open, setScroll, showWall, showDetail, claim],
  );

  return (
    <Ctx.Provider value={value}>
      <ShelfStage />
      {children}
    </Ctx.Provider>
  );
}

export function useShelfScene() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShelfScene must be used inside <ShelfSceneProvider>");
  return ctx;
}

/**
 * Whether the persistent scene is already showing this game, i.e. the user
 * arrived here from the 3D wall and the case is on screen right now.
 *
 * When false the detail route is being reached cold — a direct URL, a reload,
 * or a click from the flat cases grid — and must render its own standalone
 * stage instead, since there is no live scene to hand off from.
 */
export function useSceneHolds(id: string) {
  const { games } = useShelfScene();
  return games.some((g) => g.id === id);
}
