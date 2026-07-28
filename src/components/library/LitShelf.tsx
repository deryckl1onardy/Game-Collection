"use client";

import { useRoomLight } from "@/lib/room-light";

/**
 * A row of cases lit from one place.
 *
 * Exists because the home page is a server component and the measuring pass
 * has to run in the browser. The library grid is already a client component and
 * calls `useRoomLight` directly on its own `<ul>`.
 */
export function LitShelf({
  count,
  className,
  children,
}: {
  /** Re-measures when the set of cases changes. */
  count: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRoomLight<HTMLDivElement>(count);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
