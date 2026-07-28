"use client";

import { useEffect, useState, ViewTransition } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";

import { CaseCover } from "@/components/library/CaseCover";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buildSleeve } from "@/lib/case-sleeve";
import { type Game, type Platform, shelfState } from "@/lib/games";
import { useSceneHolds, useShelfScene } from "@/lib/shelf-scene";
import { useThemeColor } from "@/lib/theme";
import { BackToShelf } from "./BackToShelf";
import { GameDetails } from "./GameDetails";
import { GameEditor } from "./GameEditor";

/**
 * Where the WebGL case actually lands on screen, derived rather than eyeballed
 * so the flat stand-in it hands off to lines up exactly.
 *
 * Panel is W 1.86 × H 2.62 (case-geometry.ts), centred at the origin, viewed
 * by a fov-32 camera 7 units back — so ~6.87 to the front face. Visible height
 * there is 2·6.87·tan(16°) ≈ 3.94 units, putting the case at 2.62/3.94 ≈ 66.3%
 * of viewport height, and its width at 66.3vh × (1.86/2.62).
 */
const CASE_H_VH = 66.3;
const CASE_W_VH = CASE_H_VH * (1.86 / 2.62);

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
 * Builds the printed sleeve texture for the case, via the shared compositor in
 * `case-sleeve.ts` — the same one the 3D shelf uses, so the detail stage and
 * the shelf show byte-identical art on the front face. Composited rather than
 * handed to WebGL as the raw cover because the 3D case has to be the same
 * object the grid shows; without this the morph landed on a banded case and
 * then crossfaded into an unbanded one.
 */
function useCoverTexture(
  coverPath: string | null | undefined,
  platform: Platform | undefined,
  title: string,
) {
  const key = `${coverPath ?? "generated"}|${platform ?? ""}|${title}`;
  const [built, setBuilt] = useState<{
    key: string;
    texture: THREE.Texture;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: THREE.Texture | null = null;

    buildSleeve(coverPath, platform, title).then((sleeve) => {
      if (cancelled) return;
      const texture = new THREE.CanvasTexture(sleeve);
      texture.colorSpace = THREE.SRGBColorSpace;
      created = texture;
      setBuilt({ key, texture });
    });

    return () => {
      cancelled = true;
      // Only the GPU-side texture is disposed — the canvas underneath is
      // owned by `buildSleeve`'s cache and may still be in use elsewhere
      // (the 3D shelf's spine crop reads from the same canvas).
      created?.dispose();
    };
  }, [coverPath, platform, title, key]);

  return built && built.key === key ? built.texture : null;
}

export function CaseView({ game }: { game: Game }) {
  const [open, setOpen] = useState(false);
  const [stageReady, setStageReady] = useState(false);

  /**
   * Whether the persistent 3D scene is already on screen holding this game —
   * i.e. the user got here by clicking a case on the 3D wall, and that very
   * case is still rendered, in the same WebGL context, behind this chrome.
   *
   * When true we mount no stage of our own at all: the case simply turns to
   * face the camera where it stands, which is what makes the transition
   * continuous rather than a teardown and rebuild. When false the page was
   * reached cold (a direct link, a reload, or the flat cases grid), so it
   * falls back to its own self-contained stage exactly as before.
   */
  const live = useSceneHolds(game.id);
  const { claim, showDetail, setOpen: setSceneOpen } = useShelfScene();

  useEffect(() => {
    if (live) return claim();
  }, [live, claim]);

  useEffect(() => {
    if (live) showDetail(game.id);
  }, [live, game.id, showDetail]);

  useEffect(() => {
    if (live) setSceneOpen(open);
  }, [live, open, setSceneOpen]);

  const cover = useCoverTexture(game.coverPath, game.platform, game.title);
  const stageBackground = useThemeColor("--ink", "#100e0b");
  // The shelf timber, tracking the theme the same way the room does — dark
  // board at night, mid-tone by day, matching the 2D planks in the grid.
  const stageSurface = useThemeColor("--plank-1", "#33291b");

  const state = shelfState(game);
  const sealed = state === "unopened";

  // <main> deliberately sets no background or text colour: both come from
  // <body>, so this page tracks the theme instead of pinning one.
  return (
    // Above the persistent canvas, which sits at z-0 behind everything. In
    // live mode the hero itself must let the pointer through to the case
    // standing behind it, so only the real controls take events.
    <main className="relative z-10">
      {/* Fixed-viewport hero — the page scrolls past it to GameDetails below,
          rather than the whole page being locked to one screen like before
          enrichment data needed somewhere to live. */}
      <div className={`relative h-screen ${live ? "pointer-events-none" : ""}`}>
        {/*
          The flat case the morph from the shelf lands on. It is never faded
          out — the WebGL canvas is opaque and simply covers it once ready, so
          it is still there, in place, to morph *back* to the shelf on the
          return navigation (ADR-0014).
        */}
        {!live && (
          <>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div style={{ width: `${CASE_W_VH}vh` }}>
                <ViewTransition name={`case-${game.id}`} share="morph">
                  <CaseCover
                    title={game.title}
                    coverPath={game.coverPath}
                    platform={game.platform}
                    sealed={sealed}
                    still
                    aspectRatio="1.86 / 2.62"
                  />
                </ViewTransition>
              </div>
            </div>

            <div
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{ opacity: stageReady ? 1 : 0 }}
            >
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
                background={stageBackground}
                surface={stageSurface}
                onReady={() => setStageReady(true)}
              />
            </div>
          </>
        )}

        {/*
          Light raking off toward the left wall.

          The key light in the scene sits front-right (CaseStage), so the left
          of the frame falling away is what the room would actually do — and it
          gives the record column a ground to sit on instead of leaving it
          stranded over cover art. Eased across five stops and fully transparent
          well before the centre, so it rakes rather than drawing a band edge.
        */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[min(30rem,58%)]"
          style={{
            background:
              "linear-gradient(90deg," +
              " color-mix(in srgb, var(--ink) 92%, transparent) 0%," +
              " color-mix(in srgb, var(--ink) 74%, transparent) 26%," +
              " color-mix(in srgb, var(--ink) 40%, transparent) 58%," +
              " color-mix(in srgb, var(--ink) 14%, transparent) 80%," +
              " transparent 100%)",
          }}
        />

        <div className="pointer-events-none absolute right-6 top-7 flex items-start gap-6 sm:right-10">
          <ThemeToggle className="pointer-events-auto mt-3" />
          <GameEditor game={game} />
        </div>

        <div className="pointer-events-none absolute left-6 top-7 max-w-[22rem] sm:left-10">
          <BackToShelf className="catalog pointer-events-auto inline-block text-paper-ghost transition-colors hover:text-amber" />

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
                generated stand-in gets the plain metadata voice.

                A generated note only earns a line when it says something the
                playtime above does not. At zero hours it is the literal string
                "never launched" (library.ts), which the line directly above
                has already printed — so the hero showed it twice. */}
            {game.note &&
              (game.noteIsOwn ? (
                <p className="mt-5 max-w-[18rem] font-display text-[15px] italic leading-relaxed text-paper-dim">
                  “{game.note}”
                </p>
              ) : (
                game.playtime > 0 && (
                  <p className="catalog mt-5 text-paper-ghost">{game.note}</p>
                )
              ))}
          </div>
        </div>

        <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-4 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/85 to-transparent px-6 pb-7 pt-16 sm:px-10">
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

      {/* Opaque, so scrolling the record up covers the scene behind it
          rather than letting the wall show through the type. */}
      <div style={{ background: "var(--ink)" }}>
        <GameDetails game={game} />
      </div>
    </main>
  );
}
