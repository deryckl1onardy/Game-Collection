import Link from "next/link";

import { ApiKeyForm } from "@/components/steam/ApiKeyForm";
import { DisconnectButton } from "@/components/steam/DisconnectButton";
import { getStoredSteamConnection } from "@/lib/steam-connection";

export const dynamic = "force-dynamic";

/**
 * "Sign in through Steam" (ADR-0012), replacing the old .env.local +
 * restart flow. Two steps because Steam's OpenID sign-in only proves
 * identity — it can't hand out an API key, so that's still a manual paste.
 */
export default async function ConnectSteamPage({
  searchParams,
}: {
  searchParams: Promise<{ steamid?: string; error?: string }>;
}) {
  const [connection, params] = await Promise.all([getStoredSteamConnection(), searchParams]);

  return (
    <main className="min-h-screen bg-[#101113] px-6 py-16 text-[#e9e7e0]">
      <div className="mx-auto max-w-xl">
        <Link
          href="/library"
          className="mb-6 inline-block text-xs text-[#75746e] transition hover:text-[#c9c7c0]"
        >
          ← back to the shelf
        </Link>
        <h1 className="mb-6 text-2xl font-medium tracking-tight">Connect Steam</h1>

        {connection ? (
          <div className="rounded-xl border border-white/12 bg-white/[0.03] p-6 text-sm leading-relaxed text-[#a8a69f]">
            <p className="mb-4">
              Connected as{" "}
              <span className="text-[#e9e7e0]">SteamID {connection.steamId}</span>.
            </p>
            <DisconnectButton />
          </div>
        ) : params.steamid ? (
          <ApiKeyForm steamId={params.steamid} />
        ) : (
          <div className="rounded-xl border border-white/12 bg-white/[0.03] p-6 text-sm leading-relaxed text-[#a8a69f]">
            {params.error && (
              <p className="mb-4 text-[#e8877b]">
                Steam sign-in could not be verified. Try again.
              </p>
            )}
            <p className="mb-4">
              Sign in through Steam to fill in your SteamID64 automatically.
              This only proves who you are — Steam has no scoped-access flow
              for the Web API, so it doesn&apos;t grant this app anything by
              itself. You&apos;ll paste a Web API key on the next step.
            </p>
            <a
              href="/api/auth/steam"
              className="inline-block rounded-lg border border-white/25 px-4 py-2 text-[13px] text-[#e9e7e0] transition hover:border-white/45 hover:bg-white/5"
            >
              Sign in through Steam →
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
