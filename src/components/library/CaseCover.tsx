import { ViewTransition } from "react";

import { Cover } from "./Cover";

/**
 * A game case rendered in 2D.
 *
 * The grid must never mount WebGL — a hundred Canvases would crawl — but a flat
 * cover image reads as a picture of a game, not an object you own. So the
 * physicality is faked in CSS, from the things you actually notice about a real
 * case seen face-on:
 *
 * - the art sits *behind* a clear sleeve, so a plastic rim shows around it
 * - the spine folds away on the left, catching a band of light
 * - the opening edge on the right is a bright hairline
 * - gloss falls diagonally across the whole front
 * - it rests on a surface, so it has a contact shadow rather than floating
 *
 * Everything is static CSS; only the hover transform costs anything.
 */
export function CaseCover({
  id,
  title,
  coverPath,
  sealed = false,
  className = "",
}: {
  /**
   * Names the shared-element transition (`cover-${id}`) so this cover morphs
   * into the 3D case's placeholder on navigation, and repositions smoothly
   * when the grid re-filters. Caller's <Link> must carry `group/case`.
   */
  id: string;
  title: string;
  coverPath?: string | null;
  sealed?: boolean;
  className?: string;
}) {
  return (
    <div className={`[perspective:1400px] ${className}`}>
      <div
        className="relative aspect-[2/3] rounded-[3px] transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d] motion-reduce:transition-none group-hover/case:[transform:rotateY(-7deg)_translateY(-5px)] group-focus-visible/case:[transform:rotateY(-7deg)_translateY(-5px)]"
        style={{
          // Dark moulded plastic showing at the edges of the shell.
          background: "#0b0c0e",
          boxShadow: [
            "0 1px 2px rgba(0,0,0,0.6)",
            "0 12px 24px -8px rgba(0,0,0,0.75)",
            "inset 0 0 0 1px rgba(255,255,255,0.07)",
          ].join(","),
        }}
      >
        {/* cover art, inset so the plastic rim reads around it */}
        <ViewTransition name={`cover-${id}`} share="morph">
          <div className="absolute inset-[3px] left-[7px] overflow-hidden rounded-[1px]">
            <Cover title={title} coverPath={coverPath} />
          </div>
        </ViewTransition>

        {/* the spine folding away on the left */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[7px] rounded-l-[3px]"
          style={{
            background:
              "linear-gradient(90deg, #2b2f36 0%, #14171b 38%, #08090b 72%, rgba(0,0,0,0.85) 100%)",
          }}
        />
        {/* highlight running down the spine's outer curve */}
        <div className="pointer-events-none absolute inset-y-[6px] left-[1px] w-px bg-white/25" />

        {/* the opening edge, catching light */}
        <div className="pointer-events-none absolute inset-y-[4px] right-0 w-px bg-white/20" />

        {/* gloss across the sleeve */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[3px]"
          style={{
            background:
              "linear-gradient(118deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 18%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 100%)",
          }}
        />

        {sealed && <ShrinkWrap />}
      </div>

      {/* contact shadow — grounds the case instead of letting it float */}
      <div
        className="mx-auto h-3 w-[86%] rounded-[50%] opacity-70 blur-[6px] transition-all duration-300 motion-reduce:transition-none group-hover/case:w-[78%] group-hover/case:opacity-50 group-focus-visible/case:w-[78%] group-focus-visible/case:opacity-50"
        style={{ background: "rgba(0,0,0,0.85)", marginTop: "-6px" }}
      />
    </div>
  );
}

/**
 * Shrink wrap, still on.
 *
 * Cool sheen plus faint creases — enough to read as "sealed" at thumbnail size
 * without obscuring the art underneath. This is the 2D counterpart of the
 * wrap on the 3D case, and like it, only playtime removes it (ADR-0005).
 */
function ShrinkWrap() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 rounded-[3px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(226,239,250,0.30) 0%, rgba(226,239,250,0.06) 30%, rgba(255,255,255,0) 52%, rgba(127,182,223,0.12) 78%, rgba(226,239,250,0.22) 100%)",
        }}
      />
      {/* creases */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[3px] opacity-45 mix-blend-screen"
        style={{
          background: [
            "repeating-linear-gradient(114deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0) 3px, rgba(255,255,255,0) 22px)",
            "repeating-linear-gradient(58deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0) 2px, rgba(255,255,255,0) 31px)",
          ].join(","),
        }}
      />
    </>
  );
}
