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
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-[#c9c7c0] transition hover:border-white/40 hover:bg-white/5"
      >
        + add game
      </button>
    );
  }

  return (
    <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-xl border border-white/15 bg-[#16171a]/95 p-4 text-sm shadow-xl backdrop-blur">
      <form onSubmit={submit}>
        <label className="mb-1 block text-xs text-[#8e8d86]">title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tunic"
          className="mb-3 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-[#e9e7e0] outline-none placeholder:text-[#4e4d49] focus:border-white/35"
        />

        <label className="mb-1 block text-xs text-[#8e8d86]">platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Exclude<Platform, "Steam">)}
          className="mb-3 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-[#e9e7e0] outline-none focus:border-white/35"
        >
          {MANUAL_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs text-[#8e8d86]">playtime (hours)</label>
        <input
          type="number"
          min={0}
          step={0.1}
          value={playtime}
          onChange={(e) => setPlaytime(e.target.value)}
          placeholder="0"
          className="mb-3 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-[#e9e7e0] outline-none placeholder:text-[#4e4d49] focus:border-white/35"
        />

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

        {state.kind === "error" && (
          <p className="mb-2 text-xs text-[#e8877b]">{state.message}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={state.kind === "saving" || !title.trim()}
            className="rounded-lg border border-white/25 px-3 py-1.5 text-xs text-[#e9e7e0] transition hover:border-white/45 hover:bg-white/5 disabled:opacity-40"
          >
            {state.kind === "saving" ? "adding…" : "add"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-1.5 text-xs text-[#75746e] transition hover:text-[#c9c7c0]"
          >
            cancel
          </button>
        </div>
      </form>
    </div>
  );
}
