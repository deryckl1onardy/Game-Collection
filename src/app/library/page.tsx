import Link from "next/link";

import { AddGameForm } from "@/components/library/AddGameForm";
import { LibraryBrowser } from "@/components/library/LibraryBrowser";
import { SyncButton } from "@/components/library/SyncButton";
import { type Game, SEED_GAMES } from "@/lib/games";
import { getLibrary, libraryIsPopulated } from "@/lib/library";
import { steamIsConfigured } from "@/lib/steam";

export const dynamic = "force-dynamic";

type Result =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ok"; games: Game[] };

/**
 * Manual games (ADR-0006) mean the library can be non-empty with Steam never
 * configured at all — a Switch/GOG/physical-only collection is a legitimate
 * use of this app, not just a fallback while waiting to connect Steam. So
 * "is there anything to show" is answered by the database, not by whether
 * STEAM_API_KEY is set; Steam configuration only decides whether the sync
 * button appears.
 */
async function load(): Promise<Result> {
  try {
    if (!(await libraryIsPopulated())) return { kind: "empty" };
    return { kind: "ok", games: await getLibrary() };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

function Notice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-1 font-display text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[0.9] tracking-[-0.03em] text-paper">
          Shelf
        </h1>
        <div className="mt-6 h-px w-full bg-[var(--rule-strong)]" />
        <div className="mt-[3px] h-px w-full bg-[var(--rule)]" />

        <div className="panel mt-10 p-8 text-sm leading-relaxed text-paper-dim">
          <h2 className="mb-4 font-display text-xl text-paper">{title}</h2>
          {children}
        </div>
      </div>
    </main>
  );
}

function AddAction({ steamConfigured }: { steamConfigured: boolean }) {
  return (
    <div className="relative flex items-center gap-2">
      {steamConfigured && <SyncButton />}
      <AddGameForm />
    </div>
  );
}

export default async function LibraryPage() {
  const [result, steamConfigured] = await Promise.all([load(), steamIsConfigured()]);

  if (result.kind === "ok") {
    return (
      <LibraryBrowser
        games={result.games}
        action={<AddAction steamConfigured={steamConfigured} />}
      />
    );
  }

  if (result.kind === "empty") {
    return (
      <Notice title="Nothing on the shelf yet">
        <p>Enter a game by hand, or connect Steam to import a library.</p>
        <div className="relative mt-6 inline-block">
          <AddGameForm />
        </div>
        {steamConfigured ? (
          <div className="mt-4">
            <SyncButton />
          </div>
        ) : (
          <p className="mt-6">
            <Link
              href="/connect-steam"
              className="catalog text-amber underline decoration-[var(--amber-deep)] underline-offset-4 hover:decoration-[var(--amber)]"
            >
              connect steam →
            </Link>
          </p>
        )}
        <p className="catalog mt-8 leading-[1.9] text-paper-ghost">
          if steam is connected and a sync still comes back empty, your
          profile&apos;s game details privacy is not public — steam reports
          that as success with an empty list.
        </p>
      </Notice>
    );
  }

  return (
    <>
      <Notice title="Could not read the library">
        <p className="catalog leading-[1.9] text-rust">{result.message}</p>
      </Notice>
      <LibraryBrowser games={SEED_GAMES} subtitle="seed data · not your library" />
    </>
  );
}
