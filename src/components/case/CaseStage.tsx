"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";

import { CaseControls } from "./CaseControls";
import { GameCase, type GameCaseProps } from "./GameCase";
import { StudioEnvironment } from "./StudioEnvironment";

export type CaseStageProps = GameCaseProps & {
  /** Disables control-related easing/inertia when the OS asks for less motion. */
  reducedMotion?: boolean;
  /** Bump to snap the camera back to its default framing. */
  resetToken?: number;
  /** Fires once the canvas has painted a real frame (see gotcha 7). */
  onReady?: () => void;
};

/** Fires `onReady` once, on the first rendered frame — mounting the canvas
 * isn't enough (gotcha 7: it reports ready before it has actually painted). */
function FirstFrameNotifier({ onReady }: { onReady?: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  });
  return null;
}

/**
 * The WebGL surface for a single case.
 *
 * Only ever mounted on a game detail view — the library grid renders flat cover
 * images and no Canvas at all, so browsing 100+ games stays fast.
 */
export function CaseStage({
  reducedMotion = false,
  resetToken = 0,
  onReady,
  ...props
}: CaseStageProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.3, 7], fov: 32 }}
      gl={{ antialias: true }}
      // Drag-to-rotate misbehaves on touch devices without this, and
      // @use-gesture warns about it explicitly.
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={["#101113"]} />

      {/* Locally generated + PMREM-processed, so clearcoat is reliable and
          nothing is fetched from an external origin at runtime. */}
      <StudioEnvironment />

      <directionalLight
        position={[3.2, 5, 4.4]}
        intensity={2.2}
        color="#fff4e6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-4.5, 1, -2.2]} intensity={0.7} color="#9dc4ff" />
      <ambientLight intensity={0.35} color="#8e8d86" />

      <GameCase {...props} reducedMotion={reducedMotion} />

      <CaseControls reducedMotion={reducedMotion} resetToken={resetToken} />

      <FirstFrameNotifier onReady={onReady} />

      <ContactShadows
        position={[0, -1.62, 0]}
        opacity={0.5}
        scale={12}
        blur={2.6}
        far={4}
        color="#000000"
      />
    </Canvas>
  );
}
