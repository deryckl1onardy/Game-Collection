import Link from "next/link";
import { redirect } from "next/navigation";

import { ContinueCard, SealedPick, Section } from "@/components/home/Spotlight";
import { shelfState } from "@/lib/games";
import { getLibrary } from "@/lib/library";
import { steamIsConfigured } from "@/lib/steam";
import { continueWhereYouLeftOff, pulledFromTheShelf } from "@/lib/spotlight";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Nothing to spotlight until a library exists; the shelf page handles setup.
  if (!steamIsConfigured()) redirect("/library");

  const games = await getLibrary();
  if (games.length === 0) redirect("/library");

  const resume = continueWhereYouLeftOff(games);
  const sealed = pulledFromTheShelf(games);
  const sealedCount = games.filter((g) => shelfState(g) === "unopened").length;

  return (
    <main className="min-h-screen bg-[#101113] px-6 py-14 text-[#e9e7e0] sm:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-14 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-medium tracking-tight">Shelf</h1>
          <Link
            href="/library"
            className="text-sm text-[#75746e] transition hover:text-[#c9c7c0]"
          >
            all {games.length} games →
          </Link>
        </header>

        {resume.length > 0 && (
          <Section title="Continue where you left off">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              {resume.map((g) => (
                <ContinueCard key={g.id} game={g} />
              ))}
            </div>
          </Section>
        )}

        {sealed && (
          <Section title="Pulled from the shelf today">
            <SealedPick game={sealed} />
            <p className="mt-6 text-xs text-[#4e4d49]">
              one of {sealedCount} still sealed · a different one tomorrow
            </p>
          </Section>
        )}

        {resume.length === 0 && !sealed && (
          <p className="py-20 text-center text-sm text-[#75746e]">
            nothing to surface yet — try a sync.
          </p>
        )}
      </div>
    </main>
  );
}
