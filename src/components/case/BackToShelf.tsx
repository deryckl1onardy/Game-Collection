"use client";

import Link from "next/link";

/**
 * Returns to the shelf.
 *
 * `scroll={false}` hands scroll control to the shelf itself, which restores
 * the position the case was picked from (see shelf-history.ts). Next's
 * default scroll-to-top would otherwise strand that case off-screen, and an
 * off-screen element cannot take part in the return morph (ADR-0014).
 */
export function BackToShelf({ className = "" }: { className?: string }) {
  return (
    <Link href="/library" scroll={false} className={className}>
      ← the shelf
    </Link>
  );
}
