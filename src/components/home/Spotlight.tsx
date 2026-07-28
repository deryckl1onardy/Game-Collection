import Link from "next/link";

import { CaseCover } from "@/components/library/CaseCover";
import { Cover } from "@/components/library/Cover";
import type { Game } from "@/lib/games";
import { agoLabel, daysSincePlayed } from "@/lib/spotlight";

/** The large "continue" card — a spotlight, not a row in a list. */
export function ContinueCard({ game }: { game: Game }) {
  const ago = agoLabel(daysSincePlayed(game));

  return (
    <Link href={`/game/${game.id}`} className="group/case block">
      <CaseCover id={game.id} title={game.title} coverPath={game.coverPath} />
      <p className="mt-3 truncate text-[15px] text-[#e2e0d9]">{game.title}</p>
      <p className="mt-0.5 text-xs text-[#75746e]">
        {game.playtime} hrs in · {ago}
      </p>
    </Link>
  );
}

/**
 * The daily sealed pick.
 *
 * Framed as an offer, never a prompt — no "you should play this", no counter,
 * no streak. Just the object, sitting there.
 */
export function SealedPick({ game }: { game: Game }) {
  return (
    <Link href={`/game/${game.id}`} className="group flex items-center gap-5">
      <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg bg-[#15171a] shadow-xl shadow-black/50 ring-1 ring-white/5 transition duration-300 motion-reduce:transition-none group-hover:-translate-y-1 group-hover:ring-white/25 group-focus-visible:-translate-y-1 group-focus-visible:ring-white/25">
        <Cover title={game.title} coverPath={game.coverPath} />
        {/* the sheen that stands in for shrink wrap in 2D */}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-[#7fb6df]/10" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg text-[#e2e0d9]">{game.title}</p>
        <p className="mt-1 text-xs text-[#75746e]">
          still sealed
          {game.acquired !== "unknown" && ` · on the shelf since ${game.acquired}`}
        </p>
        <p className="mt-3 text-xs text-[#5f5e59] transition group-hover:text-[#8e8d86] group-focus-visible:text-[#8e8d86]">
          take a look →
        </p>
      </div>
    </Link>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <h2 className="mb-5 text-xs uppercase tracking-[0.18em] text-[#5f5e59]">
        {title}
      </h2>
      {children}
    </section>
  );
}
