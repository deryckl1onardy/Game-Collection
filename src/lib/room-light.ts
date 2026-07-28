"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Puts every case in the same room, under the same light.
 *
 * Each shelf row is lit by its own strip above it — the way archive and retail
 * shelving actually is — so the only thing that varies from case to case is
 * where it stands horizontally relative to the room's centre line. That single
 * number, written to `--lx` (-1 at the left wall, 0 directly under the light,
 * +1 at the right), then drives everything relational about the case: which way
 * the gloss rakes, which vertical edge catches light, which way the contact
 * shadow falls, and how far the case turns toward the viewer.
 *
 * This is the fix for the loudest problem on the shelf. Every case used to
 * carry one identical highlight — measured across a full page, 60 cases shared
 * exactly one gloss treatment — and a wall of identically lit objects reads as
 * a contact sheet no matter how much physical detail each one has. Physicality
 * is relational, not per-object.
 *
 * Measured once on layout and again on reflow rather than per frame: `--lx`
 * only changes when the grid actually moves.
 */
export function useRoomLight<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);

  const relight = useCallback(() => {
    const root = ref.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const half = rect.width / 2;
    // Mid-transition or display:none — measuring now would write nonsense.
    if (half <= 0) return;

    const centre = rect.left + half;

    for (const cell of root.querySelectorAll<HTMLElement>("[data-lit]")) {
      const box = cell.getBoundingClientRect();
      const lx = (box.left + box.width / 2 - centre) / half;
      cell.style.setProperty("--lx", Math.max(-1, Math.min(1, lx)).toFixed(3));
    }
  }, []);

  useLayoutEffect(() => {
    relight();

    const root = ref.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(relight);
    observer.observe(root);
    return () => observer.disconnect();
    // `key` re-runs the pass whenever the set of cells changes — a filter, a
    // sort, or another sixty drawn onto the shelf.
  }, [relight, key]);

  return ref;
}
