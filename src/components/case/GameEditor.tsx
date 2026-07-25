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
      <button onClick={() => setOpen(true)} className="btn pointer-events-auto">
        annotate
      </button>
    );
  }

  return (
    <div className="panel panel-float rise pointer-events-auto w-80 p-6 text-left backdrop-blur-md">
      <p className="drawer-label mb-5">annotations</p>

      <div className="space-y-4">
        <div>
          <label className="field-label">tags</label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="comfort game, someday"
            className="field"
          />
        </div>

        <div>
          <label className="field-label">note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="field"
          />
        </div>

        {game.source === "manual" && (
          <div>
            {/* Template literal, not JSX text: an `&apos;` entity sitting
                next to an expression loses the space between them. */}
            <label className="field-label">
              {`hours · ${game.platform} isn't synced`}
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={manualPlaytime}
              onChange={(e) => setManualPlaytime(e.target.value)}
              className="field font-mono"
            />
          </div>
        )}

        <label className="catalog flex cursor-pointer items-center gap-2.5 pt-1 text-paper-dim">
          <input
            type="checkbox"
            checked={finished}
            onChange={(e) => setFinished(e.target.checked)}
            className="h-3 w-3 accent-[var(--amber)]"
          />
          finished
        </label>

        {state.kind === "error" && (
          <p className="catalog leading-relaxed text-rust">{state.message}</p>
        )}

        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={save}
            disabled={state.kind === "saving"}
            className="btn btn-primary"
          >
            {state.kind === "saving" ? "saving…" : "save"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="catalog text-paper-ghost transition-colors hover:text-paper-dim"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
