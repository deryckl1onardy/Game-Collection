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
    <main className="min-h-screen bg-[#101113] px-6 py-16 text-[#e9e7e0]">
      <div className="mx-auto max-w-xl rounded-xl border border-white/12 bg-white/[0.03] p-6 text-sm leading-relaxed text-[#a8a69f]">
        <h2 className="mb-2 text-base font-medium text-[#e9e7e0]">{title}</h2>
        {children}
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
      <Notice title="The shelf is empty">
        <p>Add a game by hand, or connect Steam to import a library.</p>
        <div className="relative mt-4 inline-block">
          <AddGameForm />
        </div>
        {steamConfigured ? (
          <p className="mt-4">
            <SyncButton />
          </p>
        ) : (
          <p className="mt-4">
            <Link href="/connect-steam" className="text-[#7fb6df] hover:underline">
              Connect your Steam library →
            </Link>
          </p>
        )}
        <p className="mt-4 text-xs">
          If Steam is connected and a sync still comes back empty, your Steam
          profile&apos;s <strong>Game details</strong> privacy is not Public —
          Steam reports that as success with an empty list.
        </p>
      </Notice>
    );
  }

  return (
    <Notice title="Could not read the library">
      <p className="font-mono text-xs text-[#e8877b]">{result.message}</p>
      <div className="mt-6">
        <LibraryBrowser games={SEED_GAMES} subtitle="seed data" />
      </div>
    </Notice>
  );
}
