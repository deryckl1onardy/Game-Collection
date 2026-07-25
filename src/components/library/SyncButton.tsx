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
      if (body.enriched) parts.push(`${body.enriched} enriched`);

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
    <span className="inline-flex items-center gap-3">
      <button onClick={sync} disabled={state.kind === "running"} className="btn">
        {state.kind === "running" ? "syncing…" : "sync"}
      </button>
      {state.kind === "done" && (
        <span className="catalog text-verdigris">{state.message}</span>
      )}
      {state.kind === "error" && (
        <span className="catalog text-rust">{state.message}</span>
      )}
    </span>
  );
}
