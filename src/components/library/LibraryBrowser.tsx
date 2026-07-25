"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { CaseCover } from "@/components/library/CaseCover";
import { type Game, type ShelfState, shelfState } from "@/lib/games";

type Sort = "title" | "playtime" | "recent";

const STATE_INK: Record<ShelfState, string> = {
  unopened: "var(--dusk)",
  unfinished: "var(--amber)",
  finished: "var(--verdigris)",
};

/**
 * A tab on a catalog drawer divider — not a pill. Selection is shown by
 * inking the label and ruling under it, the way a physical tab is worn
 * where it has been thumbed.
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
    <button
      onClick={onClick}
      className={`catalog border-b pb-1 transition-colors duration-200 ${
        active
          ? "border-amber text-paper"
          : "border-transparent text-paper-ghost hover:text-paper-dim"
      }`}
    >
      {children}
    </button>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2.5">
      <span className="catalog w-16 shrink-0 text-paper-ghost">{label}</span>
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
  const [limit, setLimit] = useState(60);
  const [allSubjects, setAllSubjects] = useState(false);

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

  return (
    <main className="min-h-screen px-6 pb-24 pt-12 sm:px-10 lg:px-14">
      <div className="mx-auto max-w-[1500px]">
        {/* ── Masthead ─────────────────────────────────────────────── */}
        <header className="mb-11">
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
            </div>
          </div>

          {/* Double rule — the masthead device of a printed journal. */}
          <div className="mt-7 h-px w-full bg-[var(--rule-strong)]" />
          <div className="mt-[3px] h-px w-full bg-[var(--rule)]" />
        </header>

        {/* ── Catalog controls ─────────────────────────────────────── */}
        <div className="mb-12 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <label className="block w-full max-w-xs">
              <span className="catalog text-paper-ghost">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="title…"
                className="mt-2 w-full border-b border-[var(--rule-strong)] bg-transparent pb-1.5 font-display text-lg text-paper outline-none transition-colors placeholder:text-paper-ghost placeholder:font-sans placeholder:text-base focus:border-amber"
              />
            </label>

            <label className="flex items-baseline gap-3">
              <span className="catalog text-paper-ghost">order</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="catalog cursor-pointer border-b border-[var(--rule-strong)] bg-transparent pb-1.5 text-paper outline-none transition-colors focus:border-amber"
              >
                <option value="title">alphabetical</option>
                <option value="playtime">most played</option>
                <option value="recent">most sessions</option>
              </select>
            </label>
          </div>

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
                  unbounded row buries the shelf below three lines of tabs. */}
              {(allSubjects ? genres : genres.slice(0, 9)).map((t) => (
                <Tab key={t} active={genre === t} onClick={() => setGenre(t)}>
                  {t}
                </Tab>
              ))}
              {genres.length > 9 && (
                <button
                  onClick={() => setAllSubjects((v) => !v)}
                  className="catalog pb-1 text-amber-deep transition-colors hover:text-amber"
                >
                  {allSubjects ? "fewer" : `+${genres.length - 9} more`}
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
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {shown.slice(0, limit).map((g, i) => {
                const s = shelfState(g);
                return (
                  <li
                    key={g.id}
                    className="shelf-plank rise pb-4"
                    // Capped so a large library still finishes settling quickly.
                    style={{ animationDelay: `${Math.min(i, 23) * 28}ms` }}
                  >
                    <Link href={`/game/${g.id}`} className="group/item block">
                      <CaseCover
                        title={g.title}
                        coverPath={g.coverPath}
                        sealed={s === "unopened"}
                      />
                      <div className="mt-3.5 px-0.5">
                        <p className="truncate font-display text-[15px] leading-tight text-paper-dim transition-colors duration-200 group-hover/item:text-paper">
                          {g.title}
                        </p>
                        <p className="catalog mt-1.5 flex items-center gap-2 text-paper-ghost">
                          <span
                            aria-hidden
                            className="inline-block h-1 w-1 shrink-0 rounded-full"
                            style={{ background: STATE_INK[s] }}
                          />
                          <span className="truncate">
                            {g.playtime > 0 ? `${g.playtime} hrs` : g.platform}
                          </span>
                        </p>
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
