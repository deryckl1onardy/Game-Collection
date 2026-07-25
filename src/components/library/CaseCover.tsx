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
 * Everything is static CSS; only the hover transform and the wrap's sheen
 * sweep cost anything.
 */
export function CaseCover({
  title,
  coverPath,
  sealed = false,
  className = "",
  aspectRatio,
  still = false,
}: {
  title: string;
  coverPath?: string | null;
  sealed?: boolean;
  className?: string;
  /**
   * Overrides the default 2:3 box. The detail hero passes the real 3D case
   * proportions so the flat stand-in lines up with the WebGL case it hands
   * off to (ADR-0014).
   */
  aspectRatio?: string;
  /** Suppresses hover motion — wrong for a hero that isn't a link. */
  still?: boolean;
}) {
  return (
    <div className={`group/case [perspective:1600px] ${className}`}>
      <div
        className={`relative aspect-[2/3] origin-bottom rounded-[3px] transition-transform duration-500 [transform-style:preserve-3d] ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
          still
            ? ""
            : "group-hover/case:[transform:rotateY(-9deg)_rotateX(2deg)_translateY(-7px)]"
        }`}
        style={{
          // Dark moulded plastic showing at the edges of the shell.
          background: "#0a0907",
          boxShadow: [
            "0 1px 2px rgba(0,0,0,0.7)",
            "0 16px 28px -10px rgba(0,0,0,0.9)",
            "inset 0 0 0 1px rgba(239,231,214,0.09)",
          ].join(","),
          ...(aspectRatio ? { aspectRatio } : {}),
        }}
      >
        {/* cover art, inset so the plastic rim reads around it */}
        <div className="absolute inset-[3px] left-[8px] overflow-hidden rounded-[1px]">
          <Cover title={title} coverPath={coverPath} />
          {/* the art itself is behind a sleeve — darken toward the spine */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.06) 9%, transparent 26%)",
            }}
          />
        </div>

        {/* the spine folding away on the left */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[8px] rounded-l-[3px]"
          style={{
            background:
              "linear-gradient(90deg, #38312a 0%, #1b1712 36%, #0b0906 74%, rgba(0,0,0,0.9) 100%)",
          }}
        />
        {/* highlight running down the spine's outer curve */}
        <div className="pointer-events-none absolute inset-y-[7px] left-[1px] w-px bg-paper/25" />

        {/* the opening edge, catching light */}
        <div className="pointer-events-none absolute inset-y-[5px] right-0 w-px bg-paper/20" />

        {/* gloss across the sleeve */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[3px]"
          style={{
            background:
              "linear-gradient(118deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.045) 17%, rgba(255,255,255,0) 41%, rgba(255,255,255,0) 100%)",
          }}
        />

        {sealed && <ShrinkWrap />}
      </div>

      {/* contact shadow — grounds the case on the shelf instead of floating */}
      <div
        className="mx-auto h-2.5 w-[88%] rounded-[50%] opacity-80 blur-[5px] transition-all duration-500 group-hover/case:w-[74%] group-hover/case:opacity-45"
        style={{ background: "rgba(0,0,0,0.92)", marginTop: "-5px" }}
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
 *
 * The sweep on hover is the one place this app flirts with delight: light
 * travelling across plastic is exactly what makes you want to pick a sealed
 * thing up, which is the whole point of the sealed state (anticipation, not
 * guilt).
 */
function ShrinkWrap() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 rounded-[3px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(226,239,250,0.30) 0%, rgba(226,239,250,0.06) 30%, rgba(255,255,255,0) 52%, rgba(124,154,184,0.16) 78%, rgba(226,239,250,0.24) 100%)",
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
      {/* the sweep, held off until hover */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3px]">
        <div
          className="absolute inset-y-0 -left-1/3 w-1/3 opacity-0 group-hover/case:opacity-100 group-hover/case:[animation:sheen_0.9s_cubic-bezier(0.4,0,0.2,1)]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
          }}
        />
      </div>
    </>
  );
}
