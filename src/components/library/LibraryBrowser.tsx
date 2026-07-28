"use client";

import { useLayoutEffect, useMemo, useState, ViewTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { CaseCover } from "@/components/library/CaseCover";
import { ThemeToggle } from "@/components/ThemeToggle";
import { type Game, type ShelfState, shelfState } from "@/lib/games";
import { useRoomLight } from "@/lib/room-light";
import {
  lastShelfView,
  rememberShelfScroll,
  rememberShelfView,
  takeShelfScroll,
} from "@/lib/shelf-history";

// WebGL, so it must never run during SSR — same reasoning as `CaseStage` on
// the detail page.
const Shelf3D = dynamic(
  () => import("@/components/library/Shelf3D").then((m) => m.Shelf3D),
  { ssr: false },
);

type Sort = "title" | "playtime" | "recent";
type View = "cases" | "shelf3d";

const STATE_INK: Record<ShelfState, string> = {
  unopened: "var(--dusk)",
  unfinished: "var(--amber)",
  finished: "var(--verdigris)",
};

/**
 * A switch resting loose on the page — not a text link with an underline.
 * Idle it's dark, unlit plastic; the active one in a group is pressed, lit
 * amber, and pops up off the page with its pilot lamp on. See `.key-tab` in
 * globals.css for what that actually looks like.
 */
function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} data-active={active || undefined} className="key-tab">
      {children}
    </button>
  );
}

/**
 * One group of switches, inline rather than its own row — set down together
 * the way you'd lay out a handful of loose parts on a desk, close enough to
 * read as one group without needing a shared surface to make the point.
 */
function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <span className="console-row-label mr-0.5">{label}</span>
      {children}
    </div>
  );
}

export function LibraryBrowser({
  games,
  subtitle,
  action,
}: {
  games: Game[];
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ShelfState | "all">("all");
  const [platform, setPlatform] = useState<string>("all");
  const [genre, setGenre] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("title");
  // Restores whichever view was showing when a case was last picked off the
  // shelf, so returning from the detail page doesn't dump you back onto the
  // flat grid every time (`shelf-history.ts`).
  const [view, setViewState] = useState<View>(
    () => (lastShelfView() as View | null) ?? "cases",
  );
  const setView = (v: View) => {
    setViewState(v);
    rememberShelfView(v);
  };
  const [limit, setLimit] = useState(60);
  const [allSubjects, setAllSubjects] = useState(false);

  /**
   * Put the shelf back where it was when a case was picked off it. Layout
   * effect rather than effect: this has to land before paint, so the case is
   * already on screen when the browser captures the incoming state for the
   * return morph (ADR-0014).
   */
  useLayoutEffect(() => {
    const y = takeShelfScroll();
    if (y !== null) window.scrollTo(0, y);
  }, []);

  const platforms = useMemo(
    () => [...new Set(games.map((g) => g.platform))].sort(),
    [games],
  );
  const genres = useMemo(
    () => [...new Set(games.flatMap((g) => [...g.genres, ...g.tags]))].sort(),
    [games],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = games.filter((g) => {
      if (state !== "all" && shelfState(g) !== state) return false;
      if (platform !== "all" && g.platform !== platform) return false;
      if (genre !== "all" && ![...g.genres, ...g.tags].includes(genre)) return false;
      if (q && !g.title.toLowerCase().includes(q)) return false;
      return true;
    });

    const by: Record<Sort, (a: Game, b: Game) => number> = {
      title: (a, b) => a.title.localeCompare(b.title),
      playtime: (a, b) => b.playtime - a.playtime,
      recent: (a, b) => (b.stamps?.length ?? 0) - (a.stamps?.length ?? 0),
    };

    return [...filtered].sort(by[sort]);
  }, [games, query, state, platform, genre, sort]);

  const sealed = games.filter((g) => shelfState(g) === "unopened").length;

  // Re-measured whenever the shelf reflows: a filter, a sort, or another sixty
  // drawn onto it all change where each case stands relative to the light.
  const shelfRef = useRoomLight<HTMLUListElement>(
    `${shown.length}:${limit}:${sort}`,
  );

  // In shelf view the WebGL wall is a fixed layer behind this page, so the
  // page itself must stop intercepting the pointer or nothing on the wall
  // could ever be hovered or clicked. Only the real chrome takes events back.
  const overStage = view === "shelf3d";

  return (
    <main
      className={`relative z-10 min-h-screen px-6 pb-24 pt-12 sm:px-10 lg:px-14 ${
        overStage ? "pointer-events-none" : ""
      }`}
    >
      <div className="mx-auto max-w-[1500px]">
        {/* ── Masthead ─────────────────────────────────────────────── */}
        <header className={`mb-11 ${overStage ? "pointer-events-auto" : ""}`}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-[clamp(2.75rem,7vw,4.75rem)] font-semibold leading-[0.85] tracking-[-0.03em] text-paper">
                Shelf
              </h1>
              <p className="catalog mt-4 text-paper-faint">
                {subtitle ?? "a private archive"}
              </p>
            </div>

            <div className="flex items-end gap-8">
              <div className="text-right">
                <p className="font-display text-3xl leading-none text-paper">
                  {games.length}
                </p>
                <p className="catalog mt-2 text-paper-ghost">held</p>
              </div>
              <div className="text-right">
                <p
                  className="font-display text-3xl leading-none"
                  style={{ color: "var(--dusk)" }}
                >
                  {sealed}
                </p>
                <p className="catalog mt-2 text-paper-ghost">sealed</p>
              </div>
              {action}
              <ThemeToggle className="pb-1" />
            </div>
          </div>

          {/* Double rule — the masthead device of a printed journal. */}
          <div className="mt-7 h-px w-full bg-[var(--rule-strong)]" />
          <div className="mt-[3px] h-px w-full bg-[var(--rule)]" />
        </header>

        {/* ── Catalog controls ─────────────────────────────────────────
            No panel underneath any more — every switch and the readout are
            loose objects resting directly on the page, each carrying its
            own weight (a real shadow) rather than a shared plate carrying
            all of them. See `.key-tab` / `.console-readout` in globals.css. */}
        <div
          className={`mb-10 flex flex-wrap items-center gap-x-5 gap-y-3 ${
            overStage ? "pointer-events-auto" : ""
          }`}
        >
          <div className="console-readout">
            <span aria-hidden className="console-readout-glyph">
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="title…"
              className="console-readout-input"
            />
          </div>

          <FilterRow label="order">
            <Tab active={sort === "title"} onClick={() => setSort("title")}>
              alphabetical
            </Tab>
            <Tab active={sort === "playtime"} onClick={() => setSort("playtime")}>
              most played
            </Tab>
            <Tab active={sort === "recent"} onClick={() => setSort("recent")}>
              most sessions
            </Tab>
          </FilterRow>

          <FilterRow label="view">
            <Tab active={view === "cases"} onClick={() => setView("cases")}>
              cases
            </Tab>
            <Tab active={view === "shelf3d"} onClick={() => setView("shelf3d")}>
              shelf
            </Tab>
          </FilterRow>

          <FilterRow label="state">
            <Tab active={state === "all"} onClick={() => setState("all")}>
              all
            </Tab>
            {(["unopened", "unfinished", "finished"] as ShelfState[]).map((s) => (
              <Tab key={s} active={state === s} onClick={() => setState(s)}>
                {s}
              </Tab>
            ))}
          </FilterRow>

          {platforms.length > 1 && (
            <FilterRow label="origin">
              <Tab active={platform === "all"} onClick={() => setPlatform("all")}>
                any
              </Tab>
              {platforms.map((p) => (
                <Tab key={p} active={platform === p} onClick={() => setPlatform(p)}>
                  {p}
                </Tab>
              ))}
            </FilterRow>
          )}

          {genres.length > 0 && (
            <FilterRow label="subject">
              <Tab active={genre === "all"} onClick={() => setGenre("all")}>
                any
              </Tab>
              {/* Capped — a big library has dozens of subjects, and an
                  unbounded strip runs off past any usable width. */}
              {(allSubjects ? genres : genres.slice(0, 9)).map((t) => (
                <Tab key={t} active={genre === t} onClick={() => setGenre(t)}>
                  {t}
                </Tab>
              ))}
              {genres.length > 9 && (
                <button
                  onClick={() => setAllSubjects((v) => !v)}
                  className="console-row-label transition-colors hover:text-amber"
                >
                  {allSubjects ? "fewer" : `+${genres.length - 9}`}
                </button>
              )}
            </FilterRow>
          )}
        </div>

        {/* ── The shelf itself ─────────────────────────────────────── */}
        {shown.length === 0 ? (
          <p className="py-28 text-center font-display text-xl italic text-paper-faint">
            Nothing on the shelf matches that.
          </p>
        ) : view === "shelf3d" ? (
          /* Real WebGL, not windowed by a "draw more" button — the whole
             collection is laid out at once and the camera dollies through it
             as the page scrolls. Cases far from the camera render as cheap
             instanced impostors; only the ones nearby get a real textured
             mesh (see Shelf3D.tsx). */
          <Shelf3D games={shown} grouping={sort} />
        ) : (
          <>
            <ul
              ref={shelfRef}
              className="grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              {shown.slice(0, limit).map((g, i) => {
                const s = shelfState(g);
                return (
                  <li
                    key={g.id}
                    data-lit
                    className="rise"
                    // Capped so a large library still finishes settling quickly.
                    style={{ animationDelay: `${Math.min(i, 23) * 28}ms` }}
                  >
                    <Link
                      href={`/game/${g.id}`}
                      className="group/item block"
                      onClick={rememberShelfScroll}
                      // The title is no longer set as text anywhere in the
                      // cell, so the link needs its name stated outright.
                      aria-label={g.title}
                    >
                      {/* The plank wraps the case and nothing else, so the case
                          stands on it. The caption sits below the timber, the
                          way a shelf-edge label does. */}
                      <div className="shelf-plank">
                        {/* Names this case so it morphs into the detail hero
                            rather than the page cutting (ADR-0014). */}
                        <ViewTransition name={`case-${g.id}`} share="morph">
                          <CaseCover
                            title={g.title}
                            coverPath={g.coverPath}
                            platform={g.platform}
                            sealed={s === "unopened"}
                          />
                        </ViewTransition>
                      </div>
                      {/*
                        The shelf-edge label carries only what the object does
                        not. The title is printed on the artwork and the
                        platform is on the band across the box, so repeating
                        either here was just saying it twice.

                        The slot is held at a fixed height even when there are
                        no hours to show, so a row of never-launched cases does
                        not sit at a different height from its neighbours.
                      */}
                      <div className="mt-3 h-5 px-0.5 pb-4">
                        {g.playtime > 0 && (
                          <p className="catalog flex items-center gap-2 text-paper-ghost">
                            <span
                              aria-hidden
                              className="inline-block h-1 w-1 shrink-0 rounded-full"
                              style={{ background: STATE_INK[s] }}
                            />
                            <span className="truncate">{g.playtime} hrs</span>
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Cheap stand-in for virtualization until library size warrants it. */}
            {shown.length > limit && (
              <div className="mt-16 flex items-center gap-5">
                <div className="h-px flex-1 bg-[var(--rule)]" />
                <button
                  onClick={() => setLimit((l) => l + 60)}
                  className="catalog text-paper-faint transition-colors hover:text-amber"
                >
                  draw {Math.min(60, shown.length - limit)} more
                </button>
                <div className="h-px flex-1 bg-[var(--rule)]" />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
