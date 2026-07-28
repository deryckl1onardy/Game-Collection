"use client";

/**
 * The room's light rig, shared by every WebGL surface that shows a case — the
 * single-case detail stage and the 3D shelf. One rig means a case is lit
 * identically wherever it stands; two independently-tuned copies would drift
 * and a case would visibly relight when the detail page took over from the
 * shelf.
 */
export function StageLighting() {
  return (
    <>
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
    </>
  );
}
