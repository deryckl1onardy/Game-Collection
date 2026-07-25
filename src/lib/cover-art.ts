/**
 * Generated cover art, shared by the 2D grid and the 3D case.
 *
 * Two properties matter more than the visuals:
 *
 * 1. **Deterministic.** A game's cover must be identical every render and
 *    identical in both views. The v4 prototype seeded its starfield with
 *    `Math.random()`, so the "same" box looked different each time — fatal to
 *    the illusion that this is a physical object you own.
 * 2. **Intentional-looking.** This is the floor for every manually-added game
 *    (ADR-0007). On a photo-real case, a lazy placeholder reads as a defect.
 */

export type Palette = readonly [string, string, string];

/** xorshift32 — small, fast, and stable across runs. */
function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES: Palette[] = [
  ["#f2b13c", "#7d3f1e", "#1a0f0a"],
  ["#8fd4e8", "#1c4b6e", "#050b12"],
  ["#d9a24b", "#6c3b2a", "#120c0a"],
  ["#e8534b", "#7a1f38", "#140409"],
  ["#8fc355", "#3d6b2a", "#0d1408"],
  ["#7fb6df", "#2b4a63", "#0a0f14"],
  ["#c9a0dc", "#4a2d5e", "#0f0813"],
];

/** Same title always yields the same palette. */
export function paletteFor(title: string): Palette {
  return PALETTES[hashString(title) % PALETTES.length];
}

/**
 * Draws the cover into any 2D context sized `w` x `h`.
 *
 * Used to build a THREE.CanvasTexture for the case and to paint an offscreen
 * canvas for the grid, so both surfaces show byte-identical art.
 */
export function drawFallbackCover(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
) {
  const p = paletteFor(title);
  const rand = makeRng(hashString(title));

  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, p[2]);
  grd.addColorStop(0.55, p[1]);
  grd.addColorStop(1, p[2]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 150; i++) {
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h * 0.72, rand() * (w / 400), 0, Math.PI * 2);
    ctx.fill();
  }

  // Composition varies with the title as well as colour. Palette alone left
  // different games looking like the same box in two shades.
  const cx = w * (0.34 + rand() * 0.32);
  const cy = h * (0.24 + rand() * 0.2);
  const r = w * (0.18 + rand() * 0.12);
  const motif = Math.floor(rand() * 3);

  ctx.fillStyle = p[0];

  if (motif === 0) {
    // Crescent — a disc with a second disc punched out at a varying angle.
    const a = rand() * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  } else if (motif === 1) {
    // Concentric arcs, struck through by the horizon.
    ctx.lineWidth = w * 0.012;
    ctx.strokeStyle = p[0];
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * (0.45 + i * 0.24), Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.fillRect(w * 0.08, cy, w * 0.84, w * 0.006);
  } else {
    // A solid disc sitting behind a hard horizon band.
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(0, cy + r * 0.35, w, r * 0.22);
    ctx.globalCompositeOperation = "source-over";
  }

  const words = title.toUpperCase().split(" ");
  const size = Math.round(w * 0.087);
  ctx.fillStyle = "#f4f1e8";
  ctx.font = `600 ${size}px Georgia, serif`;
  words.forEach((word, i) => {
    ctx.fillText(word, w * 0.08, h - h * 0.21 + i * size * 1.12);
  });

  ctx.fillStyle = p[0];
  ctx.fillRect(w * 0.08, h - h * 0.164 + (words.length - 1) * size * 1.12, w * 0.15, w * 0.0067);

  ctx.strokeStyle = "rgba(244,241,232,0.3)";
  ctx.lineWidth = Math.max(1, w * 0.0017);
  ctx.strokeRect(w * 0.04, h * 0.027, w - w * 0.08, h - h * 0.053);
}

/** Renders the cover to a detached canvas — used by the 2D grid. */
export function renderCoverCanvas(title: string, w = 300, h = 450) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  drawFallbackCover(c.getContext("2d")!, w, h, title);
  return c;
}
