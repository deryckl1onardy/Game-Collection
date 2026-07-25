"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Builds the six faces of a small studio cubemap on canvases.
 *
 * A bright softbox above, a dark floor below, and gradient walls with a
 * highlight strip — enough to give clearcoat plastic something to reflect.
 */
function studioCubeFaces() {
  const faces: HTMLCanvasElement[] = [];

  for (let i = 0; i < 6; i++) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d")!;

    if (i === 2) {
      // +Y — the softbox overhead
      x.fillStyle = "#dfe6ee";
      x.fillRect(0, 0, 256, 256);
      x.fillStyle = "#ffffff";
      x.fillRect(44, 34, 104, 184);
    } else if (i === 3) {
      // -Y — floor, kept near-black so it does not wash the case out
      x.fillStyle = "#08090b";
      x.fillRect(0, 0, 256, 256);
    } else {
      const g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "#8e98a4");
      g.addColorStop(0.5, "#2f343a");
      g.addColorStop(1, "#0d0f11");
      x.fillStyle = g;
      x.fillRect(0, 0, 256, 256);
      x.fillStyle = "rgba(255,255,255,0.55)";
      x.fillRect(30, 40, 40, 116);
    }

    faces.push(c);
  }

  return faces;
}

/**
 * Self-contained image-based lighting.
 *
 * Deliberately *not* drei's `<Environment preset>`: that fetches an HDR from an
 * external CDN at runtime, which both crashed the WebGL context here and
 * violates the project's rule that assets are served from our own origin.
 *
 * Physical materials need a PMREM-processed environment — assigning a raw
 * CubeTexture gives unreliable clearcoat (gotcha 3 in PROJECT_BRIEF.md).
 */
export function StudioEnvironment() {
  const gl = useThree((s) => s.gl);

  const env = useMemo(() => {
    const cube = new THREE.CubeTexture(studioCubeFaces());
    cube.needsUpdate = true;
    cube.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileCubemapShader();
    const texture = pmrem.fromCubemap(cube).texture;

    pmrem.dispose();
    cube.dispose();
    return texture;
  }, [gl]);

  useEffect(() => () => env.dispose(), [env]);

  // Attached declaratively rather than assigning scene.environment, so R3F
  // owns the lifecycle and the per-material envMapIntensity values carried
  // over from the prototype stay correctly calibrated.
  return <primitive attach="environment" object={env} />;
}
