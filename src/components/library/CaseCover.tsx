import type { Platform } from "@/lib/games";
import { livery } from "@/lib/platform-livery";
import { Cover } from "./Cover";

/**
 * A game case rendered in 2D.
 *
 * The grid must never mount WebGL — a hundred Canvases would crawl — but a flat
 * cover image reads as a picture of a game, not an object you own. So the
 * physicality is faked in CSS, from the things you actually notice about a real
 * case seen face-on:
 *
 * - the shell is moulded in the platform's own colour
 * - a printed band across the top of the sleeve carries the platform wordmark,
 *   over the artwork rather than beside it
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
  platform,
  sealed = false,
  className = "",
  aspectRatio,
  still = false,
  flat = false,
}: {
  title: string;
  coverPath?: string | null;
  /** Decides the shell colour and the wordmark on the band. */
  platform?: Platform;
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
  /**
   * The caller is orienting this case in 3D itself — the spine shelf hinges
   * it out of the row — so the case must not stage itself. Two things go:
   * `.case`'s own room-turn, which would compound with the caller's rotation
   * into a double twist, and the contact shadow, because a shadow that turns
   * with the object stops reading as something cast onto the shelf. The
   * caller casts that shadow on the shelf instead, where it stays flat.
   */
  flat?: boolean;
}) {
  const liv = livery(platform);

  return (
    <div
      className={`case group/case [perspective:1600px] ${className}`}
      // Inline, not a utility class: `.case` is unlayered in globals.css and
      // Tailwind's utilities sit in `@layer utilities`, so an unlayered rule
      // wins the cascade no matter the order. Only an inline style overrides
      // it. The `--lx` lighting on `.case` is deliberately left alone — the
      // case still belongs to the room, it just no longer turns itself.
      style={flat ? { transform: "none" } : undefined}
    >
      <div
        className={`case-body relative aspect-[2/3] origin-bottom rounded-[3px] transition-transform duration-500 [transform-style:preserve-3d] ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
          still
            ? ""
            : "group-hover/case:[transform:rotateY(-9deg)_rotateX(2deg)_translateY(-7px)]"
        }`}
        style={{
          // Moulded plastic in the platform's own colour, showing at the edges.
          background: liv.shell,
          boxShadow: [
            "0 1px 2px rgba(0,0,0,0.7)",
            "0 16px 28px -10px rgba(0,0,0,0.9)",
            "inset 0 0 0 1px rgba(239,231,214,0.09)",
          ].join(","),
          ...(aspectRatio ? { aspectRatio } : {}),
        }}
      >
        {/* The sleeve: band printed across the top, art below it. Inset so the
            moulded shell reads as a rim around the whole thing. */}
        <div className="absolute inset-[3px] left-[8px] flex flex-col overflow-hidden rounded-[1px]">
          <div
            className="platform-band"
            style={{ background: liv.band, color: liv.ink }}
          >
            {liv.icon ? (
              <>
                <span
                  aria-hidden
                  className="platform-band-icon"
                  style={{
                    backgroundColor: liv.ink,
                    WebkitMaskImage: `url(${liv.icon})`,
                    maskImage: `url(${liv.icon})`,
                  }}
                />
                {/* The icon is decorative — the platform still has to reach
                    assistive tech the way the text label did. */}
                <span className="sr-only">{liv.label}</span>
              </>
            ) : (
              liv.label
            )}
          </div>

          <div className="relative min-h-0 flex-1">
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
        </div>

        {/* the spine folding away on the left, moulded in the same plastic */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[8px] rounded-l-[3px]"
          style={{
            background: `linear-gradient(90deg, color-mix(in srgb, ${liv.shell}, #ffffff 22%) 0%, ${liv.shell} 36%, color-mix(in srgb, ${liv.shell}, #000000 58%) 74%, rgba(0,0,0,0.9) 100%)`,
          }}
        />
        {/* Highlight down the spine's outer curve — bright only when the case
            stands right of the room's light, so the spine is turned into it. */}
        <div
          className="pointer-events-none absolute inset-y-[7px] left-[1px] w-px"
          style={{ background: "rgb(239 231 214 / var(--spine-light))" }}
        />

        {/* The opening edge does the opposite: lit from the left wall. */}
        <div
          className="pointer-events-none absolute inset-y-[5px] right-0 w-px"
          style={{ background: "rgb(239 231 214 / var(--edge-light))" }}
        />

        {/* Gloss across the sleeve, raking from wherever the light actually is
            rather than from the same corner on every case in the room. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[3px]"
          style={{
            background:
              "linear-gradient(var(--gloss-angle), rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 17%, rgba(255,255,255,0) 41%, rgba(255,255,255,0) 100%)",
          }}
        />

        {/*
          The due-date card. Title is already printed on the art and platform
          is on the band, so this exists only for the covers that do not carry
          their own name in the illustration — revealed the way you would read
          a library card, by tilting the case toward you.

          Rendered before the wrap so a sealed case shows it hazed under
          plastic rather than crisp on top of it — the wrap sits over
          everything on a sealed case, not just the art.
        */}
        {!still && (
          <div
            className="title-card pointer-events-none absolute inset-x-[8%] bottom-[6%] origin-bottom scale-[0.97] rounded-[1px] px-[6%] py-[4%] opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] translate-y-[32%] group-hover/case:translate-y-0 group-hover/case:scale-100 group-hover/case:opacity-100"
            aria-hidden
          >
            <span className="line-clamp-2 block text-center font-display text-[clamp(9px,6.4cqw,13px)] font-semibold leading-[1.15]">
              {title}
            </span>
          </div>
        )}

        {sealed && <ShrinkWrap />}
      </div>

      {/*
        Contact shadow. Two parts, because one blurred ellipse reads as a smudge
        under the case rather than as the case touching something: a tight, near
        opaque core right at the joint, and a wider soft spread around it. Both
        tighten and lift on hover, the way a shadow does when the object does.

        Warm-black rather than pure black — the light in this room has bounced
        off timber before it gets here.
      */}
      {/* Pulled up hard so the shadow rides over the case's own bottom edge and
          the case is left ~2px off the timber. Any more clearance and the two
          read as separate objects again. */}
      {/* Both parts slide away from the light, so a case at the left wall
          throws its shadow left and one at the right throws it right. */}
      {!flat && (
        <div
          className="relative"
          style={{ marginTop: "-10px", transform: "translateX(var(--shadow-shift))" }}
        >
          <div
            className="mx-auto h-3 w-[92%] rounded-[50%] opacity-60 blur-[7px] transition-all duration-500 group-hover/case:w-[78%] group-hover/case:opacity-30"
            style={{ background: "rgba(14,10,6,0.85)" }}
          />
          <div
            className="absolute inset-x-0 top-[3px] mx-auto h-1.5 w-[76%] rounded-[50%] opacity-90 blur-[2px] transition-all duration-500 group-hover/case:w-[58%] group-hover/case:opacity-40"
            style={{ background: "rgba(8,6,4,0.95)" }}
          />
        </div>
      )}
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
