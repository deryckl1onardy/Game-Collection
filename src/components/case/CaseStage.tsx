"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, PresentationControls } from "@react-three/drei";

import { GameCase, type GameCaseProps } from "./GameCase";
import { StudioEnvironment } from "./StudioEnvironment";

/**
 * The WebGL surface for a single case.
 *
 * Only ever mounted on a game detail view — the library grid renders flat cover
 * images and no Canvas at all, so browsing 100+ games stays fast.
 */
export function CaseStage(props: GameCaseProps) {
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
      {/* Must track --ink in globals.css, or the WebGL surface reads as a
          slightly different, cooler black than the page around it. */}
      <color attach="background" args={["#100e0b"]} />

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
