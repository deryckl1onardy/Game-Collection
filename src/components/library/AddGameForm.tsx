"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Platform } from "@/lib/games";

const MANUAL_PLATFORMS: Exclude<Platform, "Steam">[] = [
  "Epic",
  "GOG",
  "PSN",
  "Xbox",
  "Switch",
  "Physical",
];

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string };

/**
 * Adds a hand-entered game — Steam is the only platform sync can see
 * (ADR-0006), so this is the only way a Switch/GOG/PSN/Xbox/physical copy
 * enters the library. Navigates straight to the new game's detail page on
 * success, both as confirmation and because enrichment (ADR-0010) already
 * ran server-side by the time the response comes back.
 */
export function AddGameForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<Exclude<Platform, "Steam">>("Physical");
  const [playtime, setPlaytime] = useState("");
  const [finished, setFinished] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setState({ kind: "saving" });
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          platform,
          playtime: playtime.trim() === "" ? 0 : Number(playtime),
          finished,
          note,
          tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setState({ kind: "error", message: body.error ?? `HTTP ${res.status}` });
        return;
      }

      router.push(`/game/${body.id}`);
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn">
        add
      </button>
    );
  }

  return (
    <div className="panel panel-float rise absolute right-0 top-full z-20 mt-3 w-80 p-6 text-left backdrop-blur-md">
      {/* An accession slip: the form a librarian fills to enter a new item. */}
      <p className="drawer-label mb-5">accession slip</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="field-label">title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tunic"
            className="field font-display text-base"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="field-label">origin</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Exclude<Platform, "Steam">)}
              className="field"
            >
              {MANUAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="field-label">hours</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={playtime}
              onChange={(e) => setPlaytime(e.target.value)}
              placeholder="0"
              className="field font-mono"
            />
          </div>
        </div>

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
            type="submit"
            disabled={state.kind === "saving" || !title.trim()}
            className="btn btn-primary"
          >
            {state.kind === "saving" ? "filing…" : "file it"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="catalog text-paper-ghost transition-colors hover:text-paper-dim"
          >
            cancel
          </button>
        </div>
      </form>
    </div>
  );
}
