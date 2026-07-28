import { drawFallbackCover } from "./cover-art";
import type { Platform } from "./games";
import { livery } from "./platform-livery";

/**
 * The printed sleeve — art plus the platform's band across the top — shared by
 * every surface that needs to show a game's real cover: the detail stage's
 * front-face texture (`CaseView.tsx`) and the 3D shelf's front AND spine
 * textures (`spine-crop.ts`). One canvas, drawn once per game, so all three
 * surfaces show byte-identical art instead of three near-misses.
 *
 * Cover URLs must be same-origin (our `/api/cover` proxy or blob storage) — a
 * canvas tainted by a cross-origin image cannot be read back into a WebGL
 * texture at all (gotcha 2 in PROJECT_BRIEF.md).
 */

/** `object-fit: cover`, by hand, so the art fills the sleeve without stretching. */
function drawCovering(
  x: CanvasRenderingContext2D,
  art: HTMLImageElement,
  dy: number,
  dw: number,
  dh: number,
) {
  const scale = Math.max(dw / art.width, dh / art.height);
  const sw = dw / scale;
  const sh = dh / scale;
  x.drawImage(art, (art.width - sw) / 2, (art.height - sh) / 2, sw, sh, 0, dy, dw, dh);
}

/**
 * Loads a same-origin image, resolving `undefined` on failure rather than
 * rejecting. A missing cover or a platform with no `icon` are both expected,
 * unexceptional cases here — the caller falls back rather than branching on a
 * caught error at every call site.
 */
export function loadImage(src: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(undefined);
    img.src = src;
  });
}

/**
 * Stamps `icon` onto the canvas in `color` — the canvas equivalent of the CSS
 * `mask-image` the 2D band uses: draw the shape, then replace every opaque
 * pixel with a flat fill via `source-in`, so both views print the same flat,
 * single-colour mark regardless of what colours the source SVG carries.
 */
function drawTintedIcon(
  x: CanvasRenderingContext2D,
  icon: HTMLImageElement,
  dx: number,
  dy: number,
  size: number,
  color: string,
) {
  const stamp = document.createElement("canvas");
  stamp.width = size;
  stamp.height = size;
  const sx = stamp.getContext("2d")!;
  sx.drawImage(icon, 0, 0, size, size);
  sx.globalCompositeOperation = "source-in";
  sx.fillStyle = color;
  sx.fillRect(0, 0, size, size);
  x.drawImage(stamp, dx, dy);
}

/** Paints the sleeve — band across the top, art (real or generated) below it. */
export function paintSleeve(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  title: string,
  platform: Platform | undefined,
  art: HTMLImageElement | undefined,
  icon: HTMLImageElement | undefined,
) {
  canvas.width = w;
  canvas.height = h;
  const x = canvas.getContext("2d")!;
  const liv = livery(platform);
  const bandH = Math.round(h * 0.085);

  if (art) {
    drawCovering(x, art, bandH, w, h - bandH);
  } else {
    // Generated art still sits below the band — it is the same sleeve.
    x.save();
    x.translate(0, bandH);
    drawFallbackCover(x, w, h - bandH, title);
    x.restore();
  }

  x.fillStyle = liv.band;
  x.fillRect(0, 0, w, bandH);
  x.fillStyle = "rgba(0,0,0,0.22)";
  x.fillRect(0, bandH - 2, w, 2);

  // Falls back to the text label if the icon 404s — the same "missing asset
  // degrades, does not blank the band" contract the cover itself follows.
  if (icon) {
    const size = Math.round(bandH * 0.62);
    drawTintedIcon(x, icon, (w - size) / 2, (bandH - size) / 2, size, liv.ink);
  } else {
    x.fillStyle = liv.ink;
    x.font = `600 ${Math.round(bandH * 0.52)}px ui-sans-serif, system-ui, sans-serif`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(liv.label, w / 2, bandH / 2 + 1);
  }
}

/**
 * Capped at a few rows' worth of the 3D shelf's near-window, not the whole
 * collection. Every sleeve is a 600×900 canvas (~2MB of backing pixels); an
 * uncapped cache scrolled across a ~600-game library would hold onto all of
 * them at once — over a gigabyte — which is exactly the kind of pressure that
 * gets a tab silently killed and reloaded by the browser, which then looks
 * indistinguishable from the app "randomly" resetting to its default view.
 *
 * A `Map` iterates in insertion order, so re-inserting an entry on cache hit
 * (`touch`) moves it to the "most recently used" end for free — the standard
 * least-recently-used trick without a separate structure.
 */
const CACHE_LIMIT = 220;
const cache = new Map<string, HTMLCanvasElement>();
const pending = new Map<string, Promise<HTMLCanvasElement>>();

function touch(key: string, canvas: HTMLCanvasElement) {
  cache.delete(key);
  cache.set(key, canvas);
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function sleeveKey(
  coverPath: string | null | undefined,
  platform: Platform | undefined,
  title: string,
) {
  const liv = livery(platform);
  return `${coverPath ?? "generated"}|${liv.label}|${liv.icon ?? ""}|${title}`;
}

/**
 * Builds (or returns the cached) sleeve canvas for a game.
 *
 * Both image loads run in parallel and are deduped across concurrent callers —
 * a wall bringing a whole row into view at once must not fetch the same
 * platform icon dozens of times over.
 */
export function buildSleeve(
  coverPath: string | null | undefined,
  platform: Platform | undefined,
  title: string,
  w = 600,
  h = 900,
): Promise<HTMLCanvasElement> {
  const key = sleeveKey(coverPath, platform, title);
  const hit = cache.get(key);
  if (hit) {
    touch(key, hit);
    return Promise.resolve(hit);
  }

  const existing = pending.get(key);
  if (existing) return existing;

  const liv = livery(platform);
  const run = (async () => {
    const [art, icon] = await Promise.all([
      coverPath ? loadImage(coverPath) : Promise.resolve(undefined),
      liv.icon ? loadImage(liv.icon) : Promise.resolve(undefined),
    ]);

    const canvas = document.createElement("canvas");
    paintSleeve(canvas, w, h, title, platform, art, icon);
    touch(key, canvas);
    return canvas;
  })().finally(() => pending.delete(key));

  pending.set(key, run);
  return run;
}
