"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";

import { CaseCover } from "@/components/library/CaseCover";
import { type Game, type ShelfState, shelfState } from "@/lib/games";

type Sort = "title" | "playtime" | "recent";

const STATE_STYLE: Record<ShelfState, string> = {
  unopened: "bg-[#1d3040] text-[#7fb6df]",
  unfinished: "bg-[#3a2f18] text-[#e8bd6b]",
  finished: "bg-[#1f3327] text-[#82c497]",
};

function Chip({
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
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-white/50 bg-white/10 text-[#e9e7e0]"
          : "border-white/15 text-[#8e8d86] hover:border-white/30 hover:text-[#c9c7c0]"
      }`}
    >
      {children}
    </button>
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

  // Deferred rather than transition-wrapped: `query` also drives the input's
  // own `value`, so deferring *that* would make typing lag. This keeps
  // keystrokes instant while the (possibly expensive) re-filter — and the
  // view-transition crossfade it triggers — lags a beat behind.
  const deferredQuery = useDeferredValue(query);
  const [isPending, startTransition] = useTransition();

  const platforms = useMemo(
    () => [...new Set(games.map((g) => g.platform))].sort(),
    [games],
  );
  const genres = useMemo(
    () => [...new Set(games.flatMap((g) => [...g.genres, ...g.tags]))].sort(),
    [games],
  );

  const shown = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();

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
  }, [games, deferredQuery, state, platform, genre, sort]);

  const visible = shown.slice(0, limit);
  const stale = query !== deferredQuery || isPending;

  const unopened = games.filter((g) => shelfState(g) === "unopened").length;

  // Roving-tabindex arrow-key navigation across the grid: Tab enters/exits
  // the grid once, arrow keys move within it — the usual grid-widget pattern,
  // since the responsive column count makes a fixed grid stride unreliable.
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    cardRefs.current.length = visible.length;
  }, [visible.length]);

  function onCardKeyDown(e: React.KeyboardEvent<HTMLAnchorElement>, i: number) {
    const current = cardRefs.current[i];
    if (!current) return;

    let next: number | null = null;

    if (e.key === "ArrowRight") next = Math.min(i + 1, visible.length - 1);
    else if (e.key === "ArrowLeft") next = Math.max(i - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = visible.length - 1;
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const rect = current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      let bestDy = Infinity;
      let bestDx = Infinity;

      for (let idx = 0; idx < cardRefs.current.length; idx++) {
        const el = cardRefs.current[idx];
        if (!el || idx === i) continue;
        const r = el.getBoundingClientRect();
        const isNextRow = e.key === "ArrowDown" ? r.top > rect.top : r.top < rect.top;
        if (!isNextRow) continue;
        const dy = Math.abs(r.top - rect.top);
        const dx = Math.abs(r.left + r.width / 2 - centerX);
        if (dy < bestDy || (dy === bestDy && dx < bestDx)) {
          bestDy = dy;
          bestDx = dx;
          next = idx;
        }
      }
    }

    if (next !== null && next !== i) {
      e.preventDefault();
      setActiveIndex(next);
      cardRefs.current[next]?.focus();
    }
  }

  return (
    <main className="min-h-screen bg-[#101113] px-6 py-8 text-[#e9e7e0] sm:px-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Shelf</h1>
          <p className="mt-1 text-sm text-[#75746e]">
            {games.length} games · {unopened} still sealed
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
        </div>
        {action}
      </header>

      <div className="mb-6 space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search the shelf…"
          className="w-full max-w-sm rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-[#5f5e59] focus:border-white/35"
        />

        <div className="flex flex-wrap gap-1.5">
          <Chip active={state === "all"} onClick={() => startTransition(() => setState("all"))}>
            all
          </Chip>
          {(["unopened", "unfinished", "finished"] as ShelfState[]).map((s) => (
            <Chip
              key={s}
              active={state === s}
              onClick={() => startTransition(() => setState(s))}
            >
              {s}
            </Chip>
          ))}
        </div>

        {platforms.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Chip
              active={platform === "all"}
              onClick={() => startTransition(() => setPlatform("all"))}
            >
              every platform
            </Chip>
            {platforms.map((p) => (
              <Chip
                key={p}
                active={platform === p}
                onClick={() => startTransition(() => setPlatform(p))}
              >
                {p}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {genres.length > 0 && (
            <>
              <Chip
                active={genre === "all"}
                onClick={() => startTransition(() => setGenre("all"))}
              >
                any genre
              </Chip>
              {genres.map((t) => (
                <Chip
                  key={t}
                  active={genre === t}
                  onClick={() => startTransition(() => setGenre(t))}
                >
                  {t}
                </Chip>
              ))}
            </>
          )}

          <select
            value={sort}
            onChange={(e) => startTransition(() => setSort(e.target.value as Sort))}
            className="ml-auto rounded-lg border border-white/15 bg-[#15171a] px-2 py-1.5 text-xs text-[#c9c7c0] outline-none focus:border-white/35"
          >
            <option value="title">sort: title</option>
            <option value="playtime">sort: most played</option>
            <option value="recent">sort: most sessions</option>
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-20 text-center text-sm text-[#75746e]">
          nothing on the shelf matches that.
        </p>
      ) : (
        <>
          <ul
            className={`grid grid-cols-2 gap-x-4 gap-y-7 transition-opacity duration-150 motion-reduce:transition-none sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${
              stale ? "opacity-60" : "opacity-100"
            }`}
          >
            {visible.map((g, i) => {
              const s = shelfState(g);
              return (
                <li key={g.id}>
                  <Link
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    href={`/game/${g.id}`}
                    className="group/case block"
                    tabIndex={i === activeIndex ? 0 : -1}
                    onFocus={() => setActiveIndex(i)}
                    onKeyDown={(e) => onCardKeyDown(e, i)}
                  >
                    <CaseCover
                      id={g.id}
                      title={g.title}
                      coverPath={g.coverPath}
                      sealed={s === "unopened"}
                    />
                    <p className="mt-2 truncate text-sm text-[#d7d5ce]">{g.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#75746e]">
                      <span className={`rounded px-1.5 py-0.5 ${STATE_STYLE[s]}`}>
                        {s}
                      </span>
                      <span>{g.playtime > 0 ? `${g.playtime} hrs` : g.platform}</span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Cheap stand-in for virtualization until library size warrants it. */}
          {shown.length > limit && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setLimit((l) => l + 60)}
                className="rounded-lg border border-white/20 px-5 py-2 text-sm text-[#c9c7c0] transition hover:border-white/40 hover:bg-white/5"
              >
                show more ({shown.length - limit} left)
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
