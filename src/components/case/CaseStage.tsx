"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, PresentationControls } from "@react-three/drei";

import { GameCase, type GameCaseProps } from "./GameCase";
import { CASE_BASE, Shelf } from "./Shelf";
import { StageLighting } from "./StageLighting";
import { StudioEnvironment } from "./StudioEnvironment";

/**
 * The WebGL surface for a single case.
 *
 * Only ever mounted on a game detail view — the library grid renders flat cover
 * images and no Canvas at all, so browsing 100+ games stays fast.
 */
export function CaseStage({
  onReady,
  background,
  surface,
  ...props
}: GameCaseProps & {
  onReady?: () => void;
  background: string;
  /** Timber tone for the shelf, from `--plank-1`. */
  surface: string;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.3, 7], fov: 32 }}
      gl={{ antialias: true }}
      // Fires once the renderer exists, which is the cue to crossfade this
      // over the flat stand-in the view transition landed on (ADR-0014).
      onCreated={() => onReady?.()}
      // Drag-to-rotate misbehaves on touch devices without this, and
      // @use-gesture warns about it explicitly.
      style={{ touchAction: "none" }}
    >
      {/* Passed in from the live value of --ink: WebGL cannot reference a CSS
          variable, and a hardcoded colour would keep the canvas dark after a
          switch to the light theme. */}
      <color attach="background" args={[background]} />

      {/* Locally generated + PMREM-processed, so clearcoat is reliable and
          nothing is fetched from an external origin at runtime. */}
      <StudioEnvironment />
      <StageLighting />

      <Shelf color={surface} />

      <PresentationControls
        global
        snap
        cursor
        speed={1.2}
        polar={[-0.7, 0.7]}
        azimuth={[-Math.PI, Math.PI]}
      >
        <GameCase {...props} />
      </PresentationControls>

      {/*
        Contact darkening at the joint, not a general blob.

        This used to sit at y -1.62 — 0.31 below the case's own base, on a plane
        with nothing on it — so it read as a smudge floating under a floating
        object. Pulled up to the shelf surface and tightened (scale 12 → 7,
        far 4 → 2.4) so it darkens where the two actually meet and lets the key
        light's cast shadow do the directional work.
      */}
      <ContactShadows
        position={[0, CASE_BASE - 0.008, 0]}
        opacity={0.62}
        scale={7}
        blur={2.1}
        far={2.4}
        color="#0b0805"
      />
    </Canvas>
  );
}
