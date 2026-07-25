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
    <div className="panel p-8">
      <p className="drawer-label mb-5">public record found</p>

      <p className="font-display text-[2.5rem] leading-none text-paper">
        {gameCount}
        <span className="ml-2.5 font-sans text-base text-paper-faint">
          games readable
        </span>
      </p>

      <p className="catalog mt-4 leading-[1.9] text-paper-faint">
        steamid {steamId} · no api key needed
      </p>

      {state.kind === "error" && (
        <p className="catalog mt-5 leading-[1.9] text-rust">{state.message}</p>
      )}

      <button
        onClick={connect}
        disabled={state.kind === "saving"}
        className="btn btn-primary mt-8"
      >
        {state.kind === "saving" ? "connecting…" : "connect →"}
      </button>

      <p className="catalog mt-8 leading-[1.9] text-paper-ghost">
        this feed carries no exact last-played dates.{" "}
        <button
          onClick={() => setUseKeyInstead(true)}
          className="text-amber underline decoration-[var(--amber-deep)] underline-offset-4 hover:decoration-[var(--amber)]"
        >
          file an api key instead
        </button>{" "}
        for full data.
      </p>
    </div>
  );
}
