import { LibraryBrowser } from "@/components/library/LibraryBrowser";
import { SyncButton } from "@/components/library/SyncButton";
import { type Game, SEED_GAMES } from "@/lib/games";
import { getLibrary } from "@/lib/library";
import { steamIsConfigured } from "@/lib/steam";

export const dynamic = "force-dynamic";

type Result =
  | { kind: "unconfigured" }
  | { kind: "never-synced" }
  | { kind: "error"; message: string }
  | { kind: "ok"; games: Game[] };

async function load(): Promise<Result> {
  if (!steamIsConfigured()) return { kind: "unconfigured" };

  try {
    const games = await getLibrary();
    return games.length === 0 ? { kind: "never-synced" } : { kind: "ok", games };
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

export default async function LibraryPage() {
  const result = await load();

  if (result.kind === "ok") {
    return <LibraryBrowser games={result.games} action={<SyncButton />} />;
  }

  if (result.kind === "unconfigured") {
    return (
      <Notice title="Steam is not connected yet">
        <p>
          Put your credentials in <code className="text-[#e8bd6b]">.env.local</code>:
        </p>
        <pre className="my-3 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-[#c9c7c0]">
          {`STEAM_API_KEY=your-key-here\nSTEAM_ID=your-17-digit-steamid64`}
        </pre>
        <p>Then restart the dev server.</p>
      </Notice>
    );
  }

  if (result.kind === "never-synced") {
    return (
      <Notice title="The shelf is empty">
        <p>
          Steam is connected but nothing has been synced yet. Run the first sync
          to pull your library in.
        </p>
        <p className="mt-4">
          <SyncButton />
        </p>
        <p className="mt-4 text-xs">
          If it comes back with zero games, your Steam profile&apos;s{" "}
          <strong>Game details</strong> privacy is not Public — Steam reports
          that as success with an empty list.
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
