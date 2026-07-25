"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { drawFallbackCover } from "@/lib/cover-art";

/**
 * A single cover in the grid.
 *
 * Deliberately a 2D canvas, not a WebGL surface — the library must render a
 * hundred of these without mounting a single Canvas. When real art exists it
 * is served from our own origin and this falls away entirely.
 */
export function Cover({
  title,
  coverPath,
  className = "",
}: {
  title: string;
  coverPath?: string | null;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Not every Steam app has portrait art; a 404 drops us to generated art.
  const [failed, setFailed] = useState(false);
  const useReal = Boolean(coverPath) && !failed;

  useEffect(() => {
    if (useReal) return;
    const c = ref.current;
    if (!c) return;
    drawFallbackCover(c.getContext("2d")!, c.width, c.height, title);
  }, [title, useReal]);

  if (useReal) {
    return (
      <Image
        src={coverPath!}
        alt={title}
        fill
        unoptimized
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <canvas
      ref={ref}
      width={300}
      height={450}
      aria-label={title}
      role="img"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
