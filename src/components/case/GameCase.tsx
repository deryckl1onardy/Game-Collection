"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { BEV, H, HALF, SHELL, THICK, W, Z_BACK, roundedSlab } from "@/lib/case-geometry";
import {
  type CaseGame,
  backTexture,
  discTexture,
  fallbackCover,
  manualTexture,
  spineTexture,
} from "@/lib/case-textures";

export type GameCaseProps = {
  game: CaseGame;
  /** Hinge open amount, 0–1. Ignored while wrapped. */
  open?: boolean;
  /**
   * Optional real cover art. When absent, a generated cover is used (ADR-0007).
   */
  coverTexture?: THREE.Texture | null;
  /** Inserts are optional by design so a cover-only game still looks intentional. */
  showDisc?: boolean;
  showManual?: boolean;
};

/**
 * One game case.
 *
 * The wrap is derived from playtime, never from interaction (ADR-0005) — there
 * is deliberately no way to tear it from here.
 */
export function GameCase({
  game,
  open = false,
  coverTexture,
  showDisc = true,
  showManual = true,
}: GameCaseProps) {
  const { gl } = useThree();
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const wrapped = game.playtime === 0;
  // A wrapped case cannot be opened — there is nothing the gesture could
  // truthfully do while the shrink wrap is still on.
  const effectiveOpen = open && !wrapped;

  const hinge = useRef<THREE.Group>(null);
  const wrapRef = useRef<THREE.Mesh>(null);
  const wrapMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const disc = useRef<THREE.Mesh>(null);
  const openT = useRef(0);
  const wrapT = useRef(wrapped ? 1 : 0);

  const geo = useMemo(
    () => ({
      shell: roundedSlab(W, H, SHELL, 0.05),
      spine: roundedSlab(SHELL, H, THICK, 0.018),
      tray: roundedSlab(W * 0.94, H * 0.94, 0.028, 0.04),
      wrap: roundedSlab(W + SHELL + 0.05, H + 0.05, THICK + 0.05, 0.06),
    }),
    [],
  );

  const tex = useMemo(
    () => ({
      back: backTexture(game, maxAniso),
      spine: spineTexture(game, maxAniso),
      manual: manualTexture(game, maxAniso),
      disc: discTexture(maxAniso),
      cover: coverTexture ?? fallbackCover(game, maxAniso),
    }),
    [game, coverTexture, maxAniso],
  );

  useFrame(() => {
    // Wrap fades rather than tears (see docs/deferred-ideas.md).
    wrapT.current += ((wrapped ? 1 : 0) - wrapT.current) * 0.1;
    if (wrapRef.current) {
      wrapRef.current.visible = wrapT.current > 0.02;
      wrapRef.current.scale.setScalar(1 + 0.02 * (1 - wrapT.current));
    }
    if (wrapMat.current) wrapMat.current.opacity = 0.16 * wrapT.current;

    openT.current += ((effectiveOpen ? Math.PI * 0.8 : 0) - openT.current) * 0.085;
    if (hinge.current) hinge.current.rotation.y = openT.current;
    if (disc.current) disc.current.rotation.z += 0.0025 * openT.current;
  });

  return (
    <group>
      {/* back shell */}
      <mesh geometry={geo.shell} position={[0, 0, Z_BACK]} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={0x0d0e11}
          roughness={0.28}
          metalness={0}
          clearcoat={0.92}
          clearcoatRoughness={0.1}
          envMapIntensity={0.9}
        />
      </mesh>

      {/* back art — offset by HALF, not SHELL/2, or it renders inside the shell */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, Z_BACK - HALF - 0.005]}>
        <planeGeometry args={[W - 0.05, H - 0.05]} />
        <meshPhysicalMaterial
          map={tex.back}
          roughness={0.48}
          clearcoat={0.85}
          clearcoatRoughness={0.12}
          envMapIntensity={0.4}
        />
      </mesh>

      {/* spine */}
      <mesh geometry={geo.spine} position={[-W / 2 - SHELL / 2, 0, 0]} castShadow>
        <meshPhysicalMaterial
          color={0x0d0e11}
          roughness={0.28}
          metalness={0}
          clearcoat={0.92}
          clearcoatRoughness={0.1}
          envMapIntensity={0.9}
        />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[-W / 2 - SHELL - 0.006, 0, 0]}>
        <planeGeometry args={[THICK - 0.03, H - 0.06]} />
        <meshPhysicalMaterial
          map={tex.spine}
          roughness={0.42}
          clearcoat={0.8}
          envMapIntensity={0.45}
        />
      </mesh>

      {/* inner tray + hub */}
      <mesh geometry={geo.tray} position={[0, 0, -0.035]}>
        <meshPhysicalMaterial
          color={0x14161a}
          roughness={0.55}
          metalness={0}
          clearcoat={0.3}
          envMapIntensity={0.4}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.115, 0.05, 28]} />
        <meshStandardMaterial color={0x23272c} roughness={0.55} />
      </mesh>

      {showDisc && (
        <mesh ref={disc} position={[0, 0, 0.016]}>
          <ringGeometry args={[0.1, 0.7, 96, 1]} />
          <meshStandardMaterial
            map={tex.disc}
            metalness={0.8}
            roughness={0.18}
            envMapIntensity={1.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* hinged front */}
      <group ref={hinge} position={[-W / 2, 0, THICK / 2 - SHELL / 2]}>
        <mesh geometry={geo.shell} position={[W / 2, 0, 0]} castShadow>
          <meshPhysicalMaterial
            color={0x0d0e11}
            roughness={0.28}
            metalness={0}
            clearcoat={0.92}
            clearcoatRoughness={0.1}
            envMapIntensity={0.9}
          />
        </mesh>

        <mesh position={[W / 2, 0, HALF + 0.005]}>
          <planeGeometry args={[W - 0.05, H - 0.05]} />
          <meshPhysicalMaterial
            map={tex.cover}
            color={0xffffff}
            roughness={0.4}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.06}
            envMapIntensity={0.5}
          />
        </mesh>

        <mesh rotation={[0, Math.PI, 0]} position={[W / 2, 0, -HALF - 0.005]}>
          <planeGeometry args={[W - 0.05, H - 0.05]} />
          <meshStandardMaterial color={0x101216} roughness={0.7} />
        </mesh>

        {showManual && (
          <mesh position={[W / 2 + 0.03, 0, -HALF - 0.022]} castShadow>
            <boxGeometry args={[W * 0.84, H * 0.88, 0.02]} />
            <meshStandardMaterial map={tex.manual} roughness={0.9} metalness={0} />
          </mesh>
        )}
      </group>

      {/* shrink wrap */}
      <mesh ref={wrapRef} geometry={geo.wrap} position={[-SHELL / 2, 0, 0]}>
        <meshPhysicalMaterial
          ref={wrapMat}
          color={0xe4ebf3}
          transparent
          opacity={0.15}
          roughness={0.18}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export { BEV };
