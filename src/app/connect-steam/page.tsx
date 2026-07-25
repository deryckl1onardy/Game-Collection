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
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-xl">
        <Link
          href="/library"
          className="catalog inline-block text-paper-ghost transition-colors hover:text-amber"
        >
          ← the shelf
        </Link>

        <h1 className="mt-9 font-display text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[0.9] tracking-[-0.03em] text-paper">
          Connect Steam
        </h1>
        <div className="mt-6 h-px w-full bg-[var(--rule-strong)]" />
        <div className="mt-[3px] h-px w-full bg-[var(--rule)]" />

        <div className="mt-10">
          {connection ? (
            <div className="panel p-8">
              <p className="drawer-label mb-5">accession source</p>
              <p className="font-display text-lg leading-relaxed text-paper">
                SteamID {connection.steamId}
              </p>
              <p className="catalog mt-3 leading-[1.9] text-paper-faint">
                {connection.mode === "public-profile"
                  ? "via your public profile · no api key stored"
                  : "via an api key"}
              </p>
              <div className="mt-8">
                <DisconnectButton />
              </div>
            </div>
          ) : probe?.ok ? (
            <PublicProfilePanel steamId={params.steamid!} gameCount={probe.gameCount} />
          ) : params.steamid ? (
            <div className="space-y-5">
              <div className="panel p-8">
                <p className="drawer-label mb-5">no public record</p>
                <p className="text-sm leading-relaxed text-paper-dim">{probe?.error}</p>
                <p className="catalog mt-5 leading-[1.9] text-paper-ghost">
                  either{" "}
                  <a
                    href="https://steamcommunity.com/my/edit/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber underline decoration-[var(--amber-deep)] underline-offset-4 hover:decoration-[var(--amber)]"
                  >
                    set game details to public
                  </a>{" "}
                  and reload, or file a key below.
                </p>
              </div>
              <ApiKeyForm steamId={params.steamid} />
            </div>
          ) : (
            <div className="panel p-8">
              {params.error && (
                <p className="catalog mb-5 leading-[1.9] text-rust">
                  steam sign-in could not be verified. try again.
                </p>
              )}
              <p className="text-sm leading-relaxed text-paper-dim">
                Sign in through Steam to fill in your SteamID64 automatically.
                This only proves who you are — Steam has no scoped-access flow
                for the Web API, so it doesn&apos;t grant this app anything by
                itself. If your profile is public, that&apos;s all you&apos;ll
                need.
              </p>
              <a href="/api/auth/steam" className="btn btn-primary mt-8 inline-block">
                sign in through steam →
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
