"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";

import { shelfTexture } from "@/lib/case-textures";

/** Case half-height (H 2.62 / 2) — where the underside of a closed case sits. */
const CASE_BASE = -1.31;

const THICKNESS = 0.24;
/** A hair of clearance, so the contact shadow has somewhere to land. */
const TOP = CASE_BASE - 0.01;

/**
 * The shelf the case stands on.
 *
 * Before this the detail hero rendered the case floating in an empty field,
 * with its contact shadow falling on nothing 0.31 units below its base. A
 * visible surface is most of what makes an object read as an object: it gives
 * the key light something to cast onto, and it ties the detail view back to
 * the same timber the library grid stands on.
 *
 * Sits outside `PresentationControls`, so dragging turns the case on the shelf
 * rather than tipping the room with it. Wider than the frame at every aspect
 * ratio the hero uses, so it reads as a shelf continuing past both edges
 * instead of a plinth the case was set on for the photograph.
 */
export function Shelf({ color }: { color: string }) {
  const { gl } = useThree();
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const map = useMemo(() => shelfTexture(maxAniso), [maxAniso]);
  useEffect(() => () => map.dispose(), [map]);

  return (
    <mesh position={[0, TOP - THICKNESS / 2, 0]} receiveShadow>
      <boxGeometry args={[7.2, THICKNESS, 2.4]} />
      {/* The map is white with transparent brown grain, so `color` is what
          actually decides the timber — passed down from `--plank-1` and
          therefore following the theme. */}
      <meshStandardMaterial
        map={map}
        color={color}
        roughness={0.82}
        metalness={0}
        envMapIntensity={0.35}
      />
    </mesh>
  );
}

export { CASE_BASE };
