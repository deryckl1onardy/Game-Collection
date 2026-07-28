"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const DEFAULT_POSITION = new THREE.Vector3(0, 0.3, 7);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

const MIN_DISTANCE = 4.2;
const MAX_DISTANCE = 10.5;
// Offsets from the equator (Math.PI / 2) — same framing the old
// PresentationControls polar={[-0.7, 0.7]} clamp gave.
const MIN_POLAR = Math.PI / 2 - 0.7;
const MAX_POLAR = Math.PI / 2 + 0.7;

const ROTATE_STEP = 0.12; // radians per keypress
const ZOOM_STEP = 0.6; // world units per keypress

const ROTATE_KEYS: Record<string, number> = { ArrowLeft: 1, ArrowRight: -1 };
const TILT_KEYS: Record<string, number> = { ArrowUp: 1, ArrowDown: -1 };
const ZOOM_KEYS: Record<string, number> = { "+": 1, "=": 1, "-": -1, _: -1 };

/**
 * Orbit + pan + zoom for the case, replacing the drag-only
 * PresentationControls. Also wires up arrow-key rotation, +/- zoom, and an
 * "r"/"0" reset — three-stdlib's OrbitControls has no keyboard-orbit or
 * reset of its own, so that half is hand-rolled directly against the camera.
 */
export function CaseControls({
  reducedMotion,
  resetToken,
}: {
  reducedMotion: boolean;
  resetToken: number;
}) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);

  function resetView() {
    camera.position.copy(DEFAULT_POSITION);
    controls.current?.target.copy(DEFAULT_TARGET);
    controls.current?.update();
  }

  // Skip the initial mount so this only fires on an actual "reset view" click.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    resetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const c = controls.current;
      if (!c) return;

      if (e.key === "r" || e.key === "0") {
        e.preventDefault();
        resetView();
        return;
      }

      const rotate = ROTATE_KEYS[e.key];
      const tilt = TILT_KEYS[e.key];
      const zoom = ZOOM_KEYS[e.key];
      if (rotate === undefined && tilt === undefined && zoom === undefined) return;
      e.preventDefault();

      const offset = camera.position.clone().sub(c.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);

      if (rotate !== undefined) spherical.theta += rotate * ROTATE_STEP;
      if (tilt !== undefined) {
        spherical.phi = THREE.MathUtils.clamp(
          spherical.phi - tilt * ROTATE_STEP,
          MIN_POLAR,
          MAX_POLAR,
        );
      }
      if (zoom !== undefined) {
        spherical.radius = THREE.MathUtils.clamp(
          spherical.radius - zoom * ZOOM_STEP,
          MIN_DISTANCE,
          MAX_DISTANCE,
        );
      }

      camera.position.setFromSpherical(spherical).add(c.target);
      c.update();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // `camera` is stable for the life of the canvas; `controls` is a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  return (
    <OrbitControls
      ref={controls}
      target={DEFAULT_TARGET.toArray()}
      enableDamping={!reducedMotion}
      dampingFactor={0.12}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
      panSpeed={0.6}
    />
  );
}
