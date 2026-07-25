"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Game } from "@/lib/games";

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string };

/**
 * The owner's own annotations for a game (ADR-0006): finished flag, tags,
 * note, and — for manually-tracked platforms Steam cannot see — playtime.
 *
 * Collapsed to a single button by default so it doesn't compete with the
 * case itself; opens into an inline panel rather than a modal so the case
 * stays visible while editing.
 */
export function GameEditor({ game }: { game: Game }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [finished, setFinished] = useState(game.finished);
  const [note, setNote] = useState(game.note);
  const [tagsInput, setTagsInput] = useState(game.tags.join(", "));
  const [manualPlaytime, setManualPlaytime] = useState(
    game.source === "manual" ? String(game.playtime) : "",
  );
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  async function save() {
    setState({ kind: "saving" });
    try {
      const res = await fetch(`/api/game/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finished,
          note,
          tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
          manualPlaytime:
            game.source === "manual" && manualPlaytime.trim() !== ""
              ? Number(manualPlaytime)
              : null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({ kind: "error", message: body.error ?? `HTTP ${res.status}` });
        return;
      }

      setState({ kind: "idle" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="pointer-events-auto rounded-lg border border-white/25 px-4 py-2 text-[13px] transition hover:border-white/45 hover:bg-white/5"
      >
        edit
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-72 rounded-xl border border-white/15 bg-[#16171a]/95 p-4 text-sm shadow-xl backdrop-blur">
      <label className="mb-3 flex items-center gap-2 text-[#e9e7e0]">
        <input
          type="checkbox"
          checked={finished}
          onChange={(e) => setFinished(e.target.checked)}
        />
        finished
      </label>

      <label className="mb-1 block text-xs text-[#8e8d86]">tags (comma separated)</label>
      <input
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="comfort game, someday"
        className="mb-3 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-[#e9e7e0] outline-none placeholder:text-[#4e4d49] focus:border-white/35"
      />

      <label className="mb-1 block text-xs text-[#8e8d86]">note</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="mb-3 w-full resize-none rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-[#e9e7e0] outline-none focus:border-white/35"
      />

      {game.source === "manual" && (
        <>
          <label className="mb-1 block text-xs text-[#8e8d86]">
            playtime (hours) — {game.platform} isn&apos;t synced
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={manualPlaytime}
            onChange={(e) => setManualPlaytime(e.target.value)}
            className="mb-3 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-[#e9e7e0] outline-none focus:border-white/35"
          />
        </>
      )}

      {state.kind === "error" && (
        <p className="mb-2 text-xs text-[#e8877b]">{state.message}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={state.kind === "saving"}
          className="rounded-lg border border-white/25 px-3 py-1.5 text-xs text-[#e9e7e0] transition hover:border-white/45 hover:bg-white/5 disabled:opacity-40"
        >
          {state.kind === "saving" ? "saving…" : "save"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-xs text-[#75746e] transition hover:text-[#c9c7c0]"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
