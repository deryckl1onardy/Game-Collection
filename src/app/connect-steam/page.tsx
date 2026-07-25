import Link from "next/link";

import { ApiKeyForm } from "@/components/steam/ApiKeyForm";
import { DisconnectButton } from "@/components/steam/DisconnectButton";
import { PublicProfilePanel } from "@/components/steam/PublicProfilePanel";
import { probePublicProfile } from "@/lib/steam";
import { getStoredSteamConnection } from "@/lib/steam-connection";

export const dynamic = "force-dynamic";

/**
 * "Sign in through Steam" (ADR-0012, ADR-0013), replacing the old
 * .env.local + restart flow. Sign-in only proves identity, so the next step
 * tries the free public-profile feed automatically — if the profile is
 * public, connecting needs one click and no key at all. Only a private
 * profile (or the feed being unavailable) falls back to pasting a Web API
 * key, which is the one step Steam gives no way to route around.
 */
export default async function ConnectSteamPage({
  searchParams,
}: {
  searchParams: Promise<{ steamid?: string; error?: string }>;
}) {
  const [connection, params] = await Promise.all([getStoredSteamConnection(), searchParams]);

  const probe = !connection && params.steamid ? await probePublicProfile(params.steamid) : null;

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
              <span className="text-[#e9e7e0]">SteamID {connection.steamId}</span>
              {connection.mode === "public-profile"
                ? " via your public profile — no API key stored."
                : " via an API key."}
            </p>
            <DisconnectButton />
          </div>
        ) : probe?.ok ? (
          <PublicProfilePanel steamId={params.steamid!} gameCount={probe.gameCount} />
        ) : params.steamid ? (
          <div>
            <div className="mb-4 rounded-xl border border-white/12 bg-white/[0.03] p-6 text-sm leading-relaxed text-[#a8a69f]">
              <p className="mb-2 text-[#e8bd6b]">
                Couldn&apos;t connect without a key.
              </p>
              <p>{probe?.error}</p>
              <p className="mt-3 text-xs">
                Either{" "}
                <a
                  href="https://steamcommunity.com/my/edit/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#7fb6df] hover:underline"
                >
                  set &quot;Game details&quot; to Public
                </a>{" "}
                and reload this page, or paste an API key below.
              </p>
            </div>
            <ApiKeyForm steamId={params.steamid} />
          </div>
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
              itself. If your profile is public, that&apos;s all you&apos;ll
              need; otherwise you&apos;ll paste a Web API key on the next step.
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
