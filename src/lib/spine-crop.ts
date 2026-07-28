import * as THREE from "three";

import type { Platform } from "./games";
import { livery } from "./platform-livery";

/**
 * The 3D shelf's spine texture, cropped from the game's own sleeve.
 *
 * `case-textures.ts`'s `spineTexture()` — used by the single-case detail
 * stage — draws generated placeholder text; `spine-ink.ts` — used by the old
 * CSS spine wall — sampled the cover down to one averaged colour. Neither
 * shows the game's actual artwork. This instead crops the real left-edge
 * strip of the same sleeve canvas `case-sleeve.ts` builds for the front face
 * — literal pixels, stretched across the spine the way a printed sleeve wraps
 * the corner of a real case — so a spine is recognisably that game's box, not
 * a swatch or a label.
 *
 * The platform band and a vertical title are printed over the top: a thin
 * strip of any cover reads as a colour blur on its own, and those two are
 * what make a real spine legible at a glance, same as `SpineMark` did before.
 */
export function paintSpineFromSleeve(
  canvas: HTMLCanvasElement,
  sleeve: HTMLCanvasElement,
  w: number,
  h: number,
  title: string,
  platform: Platform | undefined,
  sealed: boolean,
) {
  canvas.width = w;
  canvas.height = h;
  const x = canvas.getContext("2d")!;
  const liv = livery(platform);

  // The leftmost slice of the sleeve — the part of a real sleeve that turns
  // the corner onto the spine — stretched to fill it. Sampled below the band
  // (`sleeve`'s own top ~8.5%) so this is the art's edge, not the platform
  // band repeated.
  const bandH = Math.round(sleeve.height * 0.085);
  const stripW = Math.max(1, Math.round(sleeve.width * 0.1));
  x.drawImage(
    sleeve,
    0,
    bandH,
    stripW,
    sleeve.height - bandH,
    0,
    0,
    w,
    h,
  );

  // Darken slightly so the printed band and title sit legibly on top of it,
  // the way ink prints over a photo on a real sleeve.
  x.fillStyle = "rgba(0,0,0,0.22)";
  x.fillRect(0, 0, w, h);

  // The band, wrapping round from the front.
  const spineBandH = Math.round(h * 0.055);
  x.fillStyle = liv.band;
  x.fillRect(0, 0, w, spineBandH);
  x.fillStyle = "rgba(0,0,0,0.24)";
  x.fillRect(0, spineBandH - 1, w, 1);

  // Title, printed top-to-bottom, the way a real spine reads.
  x.save();
  x.translate(w * 0.66, h * 0.985);
  x.rotate(-Math.PI / 2);
  x.fillStyle = "#f4f1e8";
  x.font = `600 ${Math.round(w * 0.34)}px Georgia, serif`;
  x.textBaseline = "alphabetic";
  const maxLen = h - spineBandH - h * 0.03;
  let printed = title.toLowerCase();
  while (x.measureText(printed).width > maxLen && printed.length > 3) {
    printed = printed.slice(0, -2) + "…";
  }
  x.fillText(printed, 0, 0);
  x.restore();

  if (sealed) {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(226,239,250,0.28)");
    g.addColorStop(0.4, "rgba(226,239,250,0.06)");
    g.addColorStop(0.7, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(124,154,184,0.18)");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  }
}

export function spineTextureFromSleeve(
  sleeve: HTMLCanvasElement,
  title: string,
  platform: Platform | undefined,
  sealed: boolean,
  maxAnisotropy = 1,
) {
  const canvas = document.createElement("canvas");
  paintSpineFromSleeve(canvas, sleeve, 130, 900, title, platform, sealed);

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  // Gotcha 5: angled spine text shimmers badly without this.
  t.anisotropy = maxAnisotropy;
  return t;
}
