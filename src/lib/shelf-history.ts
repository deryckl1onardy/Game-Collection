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

/**
 * Which view (cases / 3D shelf) was showing when a case was picked off it.
 *
 * Same lifetime as the scroll position above and for the same reason: a push
 * to `/game/[id]` and back remounts `LibraryBrowser` from scratch, so without
 * this the view resets to its default every time — which reads as the 3D
 * shelf randomly "kicking you back" to the flat grid rather than as the
 * ordinary behaviour of a fresh component instance.
 *
 * Read once and kept, not taken — unlike scroll position, which is only
 * meaningful for the one return trip, the chosen view is a standing
 * preference for the session.
 */
let shelfView: string | null = null;

export function rememberShelfView(view: string) {
  shelfView = view;
}

export function lastShelfView(): string | null {
  return shelfView;
}
