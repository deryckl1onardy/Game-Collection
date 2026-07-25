"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import * as THREE from "three";

import { type Game, shelfState } from "@/lib/games";
import { GameDetails } from "./GameDetails";
import { GameEditor } from "./GameEditor";

const CaseStage = dynamic(() => import("./CaseStage").then((m) => m.CaseStage), {
  ssr: false,
});

const STATE_STYLE = {
  unopened: "bg-[#1d3040] text-[#7fb6df]",
  unfinished: "bg-[#3a2f18] text-[#e8bd6b]",
  finished: "bg-[#1f3327] text-[#82c497]",
} as const;

/**
 * Loads real cover art for the case, falling back to generated art.
 *
 * The URL must be same-origin (our proxy or blob storage) — WebGL cannot use a
 * texture it isn't permitted to read, so hotlinked Steam CDN art fails here
 * even though it works fine in the 2D grid.
 */
function useCoverTexture(coverPath?: string | null) {
  // Tagged with the path it belongs to, so a stale texture is never handed to
  // a different game and no state has to be cleared synchronously on change.
  const [loaded, setLoaded] = useState<{
    path: string;
    texture: THREE.Texture;
  } | null>(null);

  useEffect(() => {
    if (!coverPath) return;

    let cancelled = false;
    let created: THREE.Texture | null = null;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      coverPath,
      (t) => {
        if (cancelled) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        created = t;
        setLoaded({ path: coverPath, texture: t });
      },
      undefined,
      // 404 is expected for apps with no portrait art — generated cover wins.
      () => undefined,
    );

    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [coverPath]);

  return loaded && loaded.path === coverPath ? loaded.texture : null;
}

export function CaseView({ game }: { game: Game }) {
  const [open, setOpen] = useState(false);
  const cover = useCoverTexture(game.coverPath);

  const state = shelfState(game);
  const sealed = state === "unopened";

  return (
    <main className="bg-[#101113] font-sans text-[#e9e7e0]">
      {/* Fixed-viewport hero — the page scrolls past it to GameDetails below,
          rather than the whole page being locked to one screen like before
          enrichment data needed somewhere to live. */}
      <div className="relative h-screen">
        <div className="absolute inset-0">
          <CaseStage
            game={{
              title: game.title,
              playtime: game.playtime,
              note: game.note,
              acquired: game.acquired,
              stamps: game.stamps,
            }}
            open={open}
            coverTexture={cover}
          />
        </div>

        <div className="pointer-events-none absolute right-6 top-6">
          <GameEditor game={game} />
        </div>

        <div className="pointer-events-none absolute left-6 top-6 max-w-[320px]">
          <Link
            href="/library"
            className="pointer-events-auto mb-3 inline-block text-xs text-[#75746e] transition hover:text-[#c9c7c0]"
          >
            ← back to the shelf
          </Link>
          <div>
            <span
              className={`mb-2 inline-block rounded-md px-2 py-1 text-[11px] uppercase tracking-wider ${STATE_STYLE[state]}`}
            >
              {state}
            </span>
            <h1 className="mb-1.5 text-[19px] font-medium">{game.title}</h1>
            <p className="text-xs tracking-wide text-[#8e8d86]">
              {game.playtime > 0
                ? `${game.playtime} hrs played · ${game.note}`
                : game.acquired === "unknown"
                  ? "never launched · still sealed"
                  : `never launched · owned since ${game.acquired}`}
            </p>
            <p className="mt-0.5 text-xs tracking-wide text-[#75746e]">
              {[game.platform, ...game.genres].join(" · ")}
            </p>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2.5 bg-gradient-to-t from-[#101113]/95 to-transparent px-6 pb-5 pt-4">
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={sealed}
            title={
              sealed
                ? "still sealed — the wrap comes off when playtime is recorded"
                : undefined
            }
            className="rounded-lg border border-white/25 px-4 py-2 text-[13px] transition hover:border-white/45 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/25 disabled:hover:bg-transparent"
          >
            {open ? "close case" : "open case"}
          </button>
          <span className="ml-auto text-xs text-[#75746e]">
            drag to rotate{sealed && " · sealed until played"}
          </span>
        </div>
      </div>

      <GameDetails game={game} />
    </main>
  );
}
