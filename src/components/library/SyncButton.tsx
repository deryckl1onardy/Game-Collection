"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

/**
 * Manual trigger for the sync job.
 *
 * Exists because playtime is the only thing that can tear a wrap (ADR-0005),
 * so without this you would wait until the nightly cron to see a game you just
 * played come unsealed.
 */
export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function sync() {
    setState({ kind: "running" });
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        setState({ kind: "error", message: body.error ?? `HTTP ${res.status}` });
        return;
      }

      const parts = [`${body.total} games`];
      if (body.added) parts.push(`${body.added} new`);
      if (body.sessionsRecorded) {
        parts.push(`${body.sessionsRecorded} played (+${body.hoursGained}h)`);
      }

      setState({ kind: "done", message: parts.join(" · ") });
      router.refresh();
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={sync}
        disabled={state.kind === "running"}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-[#c9c7c0] transition hover:border-white/40 hover:bg-white/5 disabled:opacity-40"
      >
        {state.kind === "running" ? "syncing…" : "sync now"}
      </button>
      {state.kind === "done" && (
        <span className="text-xs text-[#82c497]">{state.message}</span>
      )}
      {state.kind === "error" && (
        <span className="text-xs text-[#e8877b]">{state.message}</span>
      )}
    </span>
  );
}
