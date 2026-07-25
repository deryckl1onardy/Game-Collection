"use client";

/**
 * Where the shelf was scrolled to when a case was picked off it.
 *
 * Returning to `/library` is a push, not a history pop, for a specific
 * reason: `router.back()` restores scroll but runs no view transition at all,
 * so the case would not morph back into its slot. A push does transition —
 * but resets scroll to the top, which strands the case off-screen, and an
 * element outside the viewport cannot take part in a view transition either.
 *
 * Recording the position here and restoring it ourselves keeps both: the
 * transition runs, and the case is on screen to receive it (ADR-0014).
 *
 * Module scope is the right lifetime — it survives client-side navigation,
 * and a hard load resets it, which is exactly when there is no shelf position
 * to return to.
 */
let shelfScrollY: number | null = null;

export function rememberShelfScroll() {
  shelfScrollY = window.scrollY;
}

/** Returns the saved position once, then forgets it. */
export function takeShelfScroll() {
  const y = shelfScrollY;
  shelfScrollY = null;
  return y;
}
