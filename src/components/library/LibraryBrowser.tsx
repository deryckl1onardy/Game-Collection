"use client";

import { useMemo, useState } from "react";
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

  const unopened = games.filter((g) => shelfState(g) === "unopened").length;

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
          <Chip active={state === "all"} onClick={() => setState("all")}>
            all
          </Chip>
          {(["unopened", "unfinished", "finished"] as ShelfState[]).map((s) => (
            <Chip key={s} active={state === s} onClick={() => setState(s)}>
              {s}
            </Chip>
          ))}
        </div>

        {platforms.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Chip active={platform === "all"} onClick={() => setPlatform("all")}>
              every platform
            </Chip>
            {platforms.map((p) => (
              <Chip key={p} active={platform === p} onClick={() => setPlatform(p)}>
                {p}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {genres.length > 0 && (
            <>
              <Chip active={genre === "all"} onClick={() => setGenre("all")}>
                any genre
              </Chip>
              {genres.map((t) => (
                <Chip key={t} active={genre === t} onClick={() => setGenre(t)}>
                  {t}
                </Chip>
              ))}
            </>
          )}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
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
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {shown.slice(0, limit).map((g) => {
              const s = shelfState(g);
              return (
                <li key={g.id}>
                  <Link href={`/game/${g.id}`} className="block">
                    <CaseCover
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
