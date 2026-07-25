import * as THREE from "three";

/**
 * Case dimensions, validated in the v4 prototype. Do not tune these casually —
 * the layout offsets below depend on their exact relationships.
 */
export const W = 1.86; // panel width
export const H = 2.62; // panel height
export const THICK = 0.26; // closed case thickness (= spine width)
export const SHELL = 0.05; // panel thickness
export const BEV = 0.008; // bevel — adds to depth on BOTH faces

/**
 * True half-depth of a shell panel.
 *
 * ExtrudeGeometry with bevelThickness B and depth D spans D + 2B, not D. Art
 * planes placed at D/2 + epsilon end up buried inside the shell and render
 * invisibly (gotcha 1 in PROJECT_BRIEF.md — this cost a full debugging round).
 * Always offset art by HALF + a margin.
 */
export const HALF = SHELL / 2 + BEV;

/** Back shell sits flush with the inside of the closed case. */
export const Z_BACK = -THICK / 2 + SHELL / 2;

/**
 * A rounded slab, extruded with a bevel so edges catch light like moulded
 * plastic rather than reading as a hard-edged box.
 */
export function roundedSlab(w: number, h: number, d: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;

  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);

  const g = new THREE.ExtrudeGeometry(s, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: BEV,
    bevelSize: BEV,
    bevelSegments: 2,
    curveSegments: 10,
  });

  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return g;
}
