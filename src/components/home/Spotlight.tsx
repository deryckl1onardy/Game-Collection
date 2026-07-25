import { ViewTransition } from "react";
import Link from "next/link";

import { CaseCover } from "@/components/library/CaseCover";
import type { Game } from "@/lib/games";
import { agoLabel, daysSincePlayed } from "@/lib/spotlight";

/** One case on the "continue" shelf. */
export function ContinueCard({ game }: { game: Game }) {
  const ago = agoLabel(daysSincePlayed(game));

  return (
    <Link href={`/game/${game.id}`} className="group/item block">
      <ViewTransition name={`case-${game.id}`} share="morph">
        <CaseCover title={game.title} coverPath={game.coverPath} />
      </ViewTransition>
      <div className="mt-3.5">
        <p className="truncate font-display text-[15px] leading-tight text-paper-dim transition-colors group-hover/item:text-paper">
          {game.title}
        </p>
        <p className="catalog mt-1.5 text-paper-ghost">
          {game.playtime} hrs · {ago}
        </p>
      </div>
    </Link>
  );
}

/**
 * The daily sealed pick.
 *
 * Framed as an offer, never a prompt — no "you should play this", no counter,
 * no streak. Just the object, sitting there, given the space of a full plate
 * in a printed catalogue.
 */
export function SealedPick({ game }: { game: Game }) {
  return (
    <Link
      href={`/game/${game.id}`}
      className="group/pick grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-8 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-12"
    >
      <ViewTransition name={`case-${game.id}`} share="morph">
        <CaseCover title={game.title} coverPath={game.coverPath} sealed />
      </ViewTransition>

      <div className="min-w-0">
        <span className="stamp inline-block rotate-[-2.5deg] px-2.5 py-1 text-[10px]">
          still sealed
        </span>

        <h3 className="mt-5 font-display text-[clamp(1.75rem,4.2vw,3rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-paper">
          {game.title}
        </h3>

        <p className="catalog mt-5 leading-[1.9] text-paper-faint">
          {[game.platform, ...game.genres].join(" · ")}
          {game.acquired !== "unknown" && (
            <>
              <br />
              on the shelf since {game.acquired}
            </>
          )}
        </p>

        <p className="catalog mt-7 inline-flex items-center gap-2.5 text-paper-ghost transition-colors group-hover/pick:text-amber">
          take a look
          <span className="inline-block transition-transform duration-300 group-hover/pick:translate-x-1.5">
            →
          </span>
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
    <section className="mb-20">
      <h2 className="drawer-label mb-7">{title}</h2>
      {children}
    </section>
  );
}
