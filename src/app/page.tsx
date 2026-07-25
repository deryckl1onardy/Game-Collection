import Link from "next/link";
import { redirect } from "next/navigation";

import { ContinueCard, SealedPick, Section } from "@/components/home/Spotlight";
import { ThemeToggle } from "@/components/ThemeToggle";
import { shelfState } from "@/lib/games";
import { getLibrary, libraryIsPopulated } from "@/lib/library";
import { continueWhereYouLeftOff, pulledFromTheShelf } from "@/lib/spotlight";

export const dynamic = "force-dynamic";

const TODAY = new Intl.DateTimeFormat("en", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default async function Home() {
  // Nothing to spotlight until a library exists — checked against the
  // database directly, not Steam config, since a manual-only library
  // (ADR-0006) is a real case with no Steam account involved at all.
  if (!(await libraryIsPopulated())) redirect("/library");

  const games = await getLibrary();

  const resume = continueWhereYouLeftOff(games);
  const sealed = pulledFromTheShelf(games);
  const sealedCount = games.filter((g) => shelfState(g) === "unopened").length;

  return (
    <main className="min-h-screen px-6 pb-28 pt-16 sm:px-10 lg:px-14">
      <div className="mx-auto max-w-4xl">
        {/* ── Masthead ─────────────────────────────────────────────── */}
        <header className="mb-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-[0.85] tracking-[-0.03em] text-paper">
              Shelf
            </h1>
            <div className="flex items-baseline gap-7">
              <ThemeToggle />
              <Link
                href="/library"
                className="catalog text-paper-faint transition-colors hover:text-amber"
              >
                all {games.length} →
              </Link>
            </div>
          </div>
          <div className="mt-6 h-px w-full bg-[var(--rule-strong)]" />
          <div className="mt-[3px] h-px w-full bg-[var(--rule)]" />
          <p className="catalog mt-4 text-paper-ghost">{TODAY.format(new Date())}</p>
        </header>

        {sealed && (
          <Section title="pulled from the shelf today">
            <SealedPick game={sealed} />
            <p className="catalog mt-10 text-paper-ghost">
              one of {sealedCount} still sealed · a different one tomorrow
            </p>
          </Section>
        )}

        {resume.length > 0 && (
          <Section title="continue where you left off">
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
              {resume.map((g, i) => (
                <div
                  key={g.id}
                  className="shelf-plank rise pb-3"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <ContinueCard game={g} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {resume.length === 0 && !sealed && (
          <p className="py-24 text-center font-display text-xl italic text-paper-faint">
            Nothing to surface yet — try a sync.
          </p>
        )}
      </div>
    </main>
  );
}
