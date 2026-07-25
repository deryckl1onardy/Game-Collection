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

const STATE_LABEL = {
  unopened: "sealed",
  unfinished: "in progress",
  finished: "completed",
} as const;

const STATE_INK = {
  unopened: "var(--dusk)",
  unfinished: "var(--amber)",
  finished: "var(--verdigris)",
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

        <div className="pointer-events-none absolute right-6 top-7 sm:right-10">
          <GameEditor game={game} />
        </div>

        <div className="pointer-events-none absolute left-6 top-7 max-w-[22rem] sm:left-10">
          <Link
            href="/library"
            className="catalog pointer-events-auto inline-block text-paper-ghost transition-colors hover:text-amber"
          >
            ← the shelf
          </Link>

          <div className="mt-8">
            <span
              className="catalog inline-flex items-center gap-2"
              style={{ color: STATE_INK[state] }}
            >
              <span
                aria-hidden
                className="inline-block h-1 w-1 rounded-full"
                style={{ background: STATE_INK[state] }}
              />
              {STATE_LABEL[state]}
            </span>

            <h1 className="mt-3.5 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] font-semibold leading-[0.94] tracking-[-0.025em] text-paper">
              {game.title}
            </h1>

            <div className="mt-5 h-px w-14 bg-[var(--rule-strong)]" />

            <p className="catalog mt-5 leading-[1.9] text-paper-faint">
              {game.playtime > 0 ? `${game.playtime} hrs` : "never launched"}
              <br />
              {[game.platform, ...game.genres].join(" · ")}
            </p>

            {/* Only the owner's own words are set as a quotation — a
                generated stand-in gets the plain metadata voice. */}
            {game.note &&
              (game.noteIsOwn ? (
                <p className="mt-5 max-w-[18rem] font-display text-[15px] italic leading-relaxed text-paper-dim">
                  “{game.note}”
                </p>
              ) : (
                <p className="catalog mt-5 text-paper-ghost">{game.note}</p>
              ))}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-4 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/85 to-transparent px-6 pb-7 pt-16 sm:px-10">
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={sealed}
            title={
              sealed
                ? "still sealed — the wrap comes off when playtime is recorded"
                : undefined
            }
            className="btn"
          >
            {open ? "close case" : "open case"}
          </button>
          <span className="catalog text-paper-ghost">
            drag to rotate{sealed && " · sealed until played"}
          </span>
          <span className="catalog ml-auto hidden items-center gap-2.5 text-paper-ghost sm:inline-flex">
            record below
            <span aria-hidden className="animate-bounce">
              ↓
            </span>
          </span>
        </div>
      </div>

      <GameDetails game={game} />
    </main>
  );
}
