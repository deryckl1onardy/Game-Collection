import * as THREE from "three";

import { drawFallbackCover } from "./cover-art";

/** The shape a case needs in order to render itself. */
export type CaseGame = {
  title: string;
  /** Hours played. Zero means unopened — the wrap stays on. */
  playtime: number;
  /** Free-text note shown on the back art, e.g. "stopped at the quantum moon". */
  note: string;
  /** Human-readable acquisition date, e.g. "mar 2023". */
  acquired: string;
  /** Session dates for the library card stamps, oldest first. */
  stamps?: string[];
};

/**
 * Deterministic PRNG.
 *
 * Grain has to look random and be identical on every mount — `Math.random()`
 * would redraw a different board each time the texture memo re-ran, and the
 * shelf would visibly change figure mid-session.
 */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w: number,
  h: number,
  maxAnisotropy = 1,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // Gotcha 5: angled spine text shimmers badly without this.
  t.anisotropy = maxAnisotropy;
  return t;
}

/** Back of the case: screenshot placeholders, title, and a stat block. */
export function backTexture(g: CaseGame, maxAnisotropy = 1) {
  return canvasTexture(
    (x, w, h) => {
      x.fillStyle = "#101216";
      x.fillRect(0, 0, w, h);

      x.fillStyle = "#1b1f25";
      for (let i = 0; i < 3; i++) x.fillRect(52, 92 + i * 152, w - 104, 124);

      x.fillStyle = "#4e555f";
      x.font = "500 20px Georgia";
      for (let i = 0; i < 3; i++) x.fillText("screenshot", 68, 162 + i * 152);

      x.fillStyle = "#ccc9be";
      x.font = "500 32px Georgia";
      x.fillText(g.title.toLowerCase(), 52, 606);

      x.fillStyle = "#7d858f";
      x.font = "18px ui-monospace, monospace";
      [
        `playtime   ${g.playtime} hrs`,
        `status     ${g.playtime > 0 ? "unfinished" : "unopened"}`,
        `acquired   ${g.acquired}`,
        `note       ${g.note}`,
      ].forEach((r, i) => x.fillText(r, 52, 656 + i * 31));

      x.strokeStyle = "rgba(232,230,223,0.13)";
      x.strokeRect(28, 28, w - 56, h - 56);
    },
    600,
    900,
    maxAnisotropy,
  );
}

/** Spine: rotated title. Anisotropy matters most here (gotcha 5). */
export function spineTexture(g: CaseGame, maxAnisotropy = 1) {
  return canvasTexture(
    (x, w, h) => {
      x.fillStyle = "#151b24";
      x.fillRect(0, 0, w, h);

      x.save();
      x.translate(w * 0.72, h * 0.92);
      x.rotate(-Math.PI / 2);
      x.fillStyle = "#dad7cd";
      x.font = "500 42px Georgia";
      x.fillText(g.title.toLowerCase(), 0, 0);
      x.restore();

      x.fillStyle = "#404a57";
      x.fillRect(0, h - 95, w, 3);
    },
    130,
    900,
    maxAnisotropy,
  );
}

/**
 * The manual, carrying the library card — the diegetic alternative to a
 * playtime chart. Stamps come from session rows (playtime deltas between syncs).
 */
export function manualTexture(g: CaseGame, maxAnisotropy = 1) {
  return canvasTexture(
    (x, w, h) => {
      x.fillStyle = "#e9e5d9";
      x.fillRect(0, 0, w, h);
      x.fillStyle = "#d5d0c1";
      x.fillRect(0, 0, 28, h);

      x.fillStyle = "#3a3934";
      x.font = "500 32px Georgia";
      x.fillText(g.title.toLowerCase(), 64, 96);

      x.fillStyle = "#8b887d";
      x.font = "17px ui-monospace, monospace";
      x.fillText("instruction booklet", 64, 130);

      x.strokeStyle = "#b8b3a4";
      x.lineWidth = 1.5;
      x.strokeRect(64, 200, w - 128, 330);

      x.fillStyle = "#6e6b61";
      x.font = "16px ui-monospace, monospace";
      x.fillText("DATE  STAMPED", 84, 234);

      const stamps = g.stamps ?? [];
      stamps.forEach((s, i) => {
        x.fillStyle = "#a5a194";
        x.fillRect(84, 252 + i * 46, w - 192, 1);
        x.fillStyle = i === stamps.length - 1 ? "#3a3934" : "#7d7a6f";
        x.font = "18px ui-monospace, monospace";
        x.fillText(s, 84, 282 + i * 46);
      });

      if (!stamps.length) {
        x.fillStyle = "#a9a597";
        x.font = "italic 18px Georgia";
        x.fillText("no stamps yet", 84, 282);
      }
    },
    600,
    700,
    maxAnisotropy,
  );
}

/** Iridescent disc face. RingGeometry gives a real centre hole with usable UVs. */
export function discTexture(maxAnisotropy = 1) {
  return canvasTexture(
    (x) => {
      x.fillStyle = "#0c0d0f";
      x.fillRect(0, 0, 640, 640);

      const g = x.createRadialGradient(320, 320, 70, 320, 320, 320);
      ["#d4dbe2", "#a9cad9", "#cbb8de", "#a2d5c3", "#ded2b4", "#bcc6d2"].forEach(
        (c, i) => g.addColorStop(i / 5, c),
      );
      x.fillStyle = g;
      x.beginPath();
      x.arc(320, 320, 318, 0, Math.PI * 2);
      x.fill();

      x.strokeStyle = "rgba(255,255,255,0.08)";
      x.lineWidth = 1;
      for (let r = 76; r < 318; r += 3) {
        x.beginPath();
        x.arc(320, 320, r, 0, Math.PI * 2);
        x.stroke();
      }

      x.fillStyle = "#e6e3da";
      x.beginPath();
      x.arc(320, 320, 112, 0, Math.PI * 2);
      x.fill();
    },
    640,
    640,
    maxAnisotropy,
  );
}

/**
 * The shelf the case stands on.
 *
 * Sawn timber seen from slightly above: fine lengthwise grain plus a few
 * darker rays for the figure in the board. Drawn white-based with the grain in
 * transparent browns, so the material's own `color` tints the whole thing to
 * whichever timber the room is currently lit for — the same trick the 2D
 * plank uses with `--plank-1`.
 */
export function shelfTexture(maxAnisotropy = 1) {
  return canvasTexture(
    (x, w, h) => {
      const rnd = seeded(0x5e1f);

      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, w, h);

      // Lengthwise grain. Each line wavers slightly so none of them reads as
      // a ruled edge across the board.
      for (let i = 0; i < 340; i++) {
        const y = rnd() * h;
        x.strokeStyle = `rgba(58,40,22,${0.03 + rnd() * 0.075})`;
        x.lineWidth = 0.5 + rnd() * 1.7;
        x.beginPath();
        x.moveTo(0, y);
        for (let sx = 0; sx <= w; sx += 48) {
          x.lineTo(sx, y + Math.sin(sx / 150 + i) * 2.2);
        }
        x.stroke();
      }

      // A handful of heavier rays — without these the grain reads as noise
      // rather than as a cut through a log.
      for (let i = 0; i < 7; i++) {
        const y = rnd() * h;
        x.strokeStyle = `rgba(44,29,14,${0.1 + rnd() * 0.09})`;
        x.lineWidth = 3 + rnd() * 7;
        x.beginPath();
        x.moveTo(0, y);
        for (let sx = 0; sx <= w; sx += 48) {
          x.lineTo(sx, y + Math.sin(sx / 260 + i * 2) * 6);
        }
        x.stroke();
      }
    },
    1024,
    256,
    maxAnisotropy,
  );
}

/**
 * Generated cover, used when no real art is available.
 *
 * This is the floor for every manually-added game (ADR-0007), so it has to look
 * deliberate rather than broken — a missing cover on a photo-real object reads
 * as a defect, not a placeholder.
 */
export function fallbackCover(g: CaseGame, maxAnisotropy = 1) {
  return canvasTexture(
    (x, w, h) => drawFallbackCover(x, w, h, g.title),
    600,
    900,
    maxAnisotropy,
  );
}
