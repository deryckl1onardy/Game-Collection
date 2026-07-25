"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ApiKeyForm } from "./ApiKeyForm";

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string };

/**
 * The seamless path (ADR-0013) — shown when the public profile probe found
 * a readable games list, so connecting is a single click with no key. Still
 * offers the API key path as an opt-in, since the public feed has no
 * last-played timestamps the official API does carry.
 */
export function PublicProfilePanel({
  steamId,
  gameCount,
}: {
  steamId: string;
  gameCount: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [useKeyInstead, setUseKeyInstead] = useState(false);

  async function connect() {
    setState({ kind: "saving" });
    try {
      const res = await fetch("/api/steam-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamId, mode: "public-profile" }),
      });
      const body = await res.json();

      if (!res.ok) {
        setState({ kind: "error", message: body.error ?? `HTTP ${res.status}` });
        return;
      }

      router.push("/library");
      router.refresh();
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (useKeyInstead) {
    return <ApiKeyForm steamId={steamId} />;
  }

  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.03] p-6 text-sm leading-relaxed text-[#a8a69f]">
      <p className="mb-1">
        Signed in as <span className="text-[#e9e7e0]">SteamID {steamId}</span>.
      </p>
      <p className="mb-4">
        Your profile is public — found{" "}
        <span className="text-[#e9e7e0]">{gameCount} games</span>. No API key
        needed.
      </p>

      {state.kind === "error" && (
        <p className="mb-3 text-xs text-[#e8877b]">{state.message}</p>
      )}

      <button
        onClick={connect}
        disabled={state.kind === "saving"}
        className="rounded-lg border border-white/25 px-4 py-2 text-[13px] text-[#e9e7e0] transition hover:border-white/45 hover:bg-white/5 disabled:opacity-40"
      >
        {state.kind === "saving" ? "connecting…" : "connect →"}
      </button>

      <p className="mt-4 text-xs">
        This public feed doesn&apos;t carry exact last-played dates.{" "}
        <button
          onClick={() => setUseKeyInstead(true)}
          className="text-[#7fb6df] hover:underline"
        >
          Use an API key instead
        </button>{" "}
        for full data.
      </p>
    </div>
  );
}
