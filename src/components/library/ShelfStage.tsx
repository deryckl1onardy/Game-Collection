"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PresentationControls } from "@react-three/drei";
import * as THREE from "three";

import { GameCase } from "@/components/case/GameCase";
import { StageLighting } from "@/components/case/StageLighting";
import { StudioEnvironment } from "@/components/case/StudioEnvironment";
import { BEV, H, roundedSlab, W } from "@/lib/case-geometry";
import { buildSleeve } from "@/lib/case-sleeve";
import { type Game, shelfState } from "@/lib/games";
import { livery } from "@/lib/platform-livery";
import { rememberShelfScroll } from "@/lib/shelf-history";
import {
  CAMERA_FOV,
  CAMERA_Z,
  DETAIL_CAMERA_GAP,
  DETAIL_CASE_PULL,
  packRows,
  type Placed,
  ROW_STEP,
  rowY,
} from "@/lib/shelf-layout";
import { useShelfScene, type SceneMode } from "@/lib/shelf-scene";
import { spineTextureFromSleeve } from "@/lib/spine-crop";
import { useThemeColor } from "@/lib/theme";

/* ── Shared texture loading ─────────────────────────────────────────────── */

/** The composited sleeve for a game, as a GPU texture, or null until built. */
function useSleeveTexture(game: Game, aniso: number) {
  const [sleeve, setSleeve] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    buildSleeve(game.coverPath, game.platform, game.title).then((c) => {
      if (alive) setSleeve(c);
    });
    return () => {
      alive = false;
    };
  }, [game.coverPath, game.platform, game.title]);

  const texture = useMemo(() => {
    if (!sleeve) return null;
    const t = new THREE.CanvasTexture(sleeve);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  }, [sleeve, aniso]);

  useEffect(() => () => texture?.dispose(), [texture]);
  return { sleeve, texture };
}

/* ── One case in the wall ───────────────────────────────────────────────── */

function RealCase({
  p,
  focused,
  entered,
  onFocus,
  onOpen,
}: {
  p: Placed;
  focused: boolean;
  entered: React.RefObject<Set<string>>;
  onFocus: () => void;
  onOpen: (p: Placed) => void;
}) {
  const { game, x, row, thickness } = p;
  const { gl } = useThree();
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const liv = livery(game.platform);
  const sealed = shelfState(game) === "unopened";

  const { sleeve, texture: frontTex } = useSleeveTexture(game, maxAniso);

  const spineTex = useMemo(
    () =>
      sleeve
        ? spineTextureFromSleeve(sleeve, game.title, game.platform, sealed, maxAniso)
        : null,
    [sleeve, game.title, game.platform, sealed, maxAniso],
  );
  useEffect(() => () => spineTex?.dispose(), [spineTex]);

  const geo = useMemo(() => roundedSlab(W - 0.02, H - 0.02, thickness, 0.035), [thickness]);
  useEffect(() => () => geo.dispose(), [geo]);

  const group = useRef<THREE.Group>(null);
  const target = useRef(0);
  const value = useRef(0);
  const velocity = useRef(0);
  const [hovered, setHovered] = useState(false);
  const bornAt = useRef<number | null>(-1);

  useEffect(() => {
    target.current = hovered || focused ? 1 : 0;
  }, [hovered, focused]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    const STIFFNESS = 180;
    const DAMPING = 21;
    const accel = (target.current - value.current) * STIFFNESS - velocity.current * DAMPING;
    velocity.current += accel * delta;
    value.current += velocity.current * delta;
    const o = Math.max(0, value.current);

    g.rotation.y = (Math.PI / 2) * (1 - o * 0.855);

    let eased = 1;
    if (bornAt.current !== null) {
      const seen = entered.current;
      if (bornAt.current === -1) {
        bornAt.current = seen.has(game.id) ? null : performance.now();
      }
      if (bornAt.current !== null) {
        const age = (performance.now() - bornAt.current) / 1000;
        const delay = Math.min(0.4, (Math.abs(x) + row * 0.05) * 0.01);
        const enterK = Math.min(1, Math.max(0, (age - delay) / 0.42));
        eased = 1 - (1 - enterK) ** 3;
        if (enterK >= 1) {
          seen.add(game.id);
          bornAt.current = null;
        }
      }
    }

    g.position.set(x, rowY(row) + o * 0.12 - (1 - eased) * 0.5, o * 1.15 - (1 - eased) * 0.6);
  });

  return (
    <group
      ref={group}
      position={[x, rowY(row), 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onFocus();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(p);
      }}
    >
      <mesh geometry={geo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={liv.shell}
          roughness={0.28}
          metalness={0}
          clearcoat={0.92}
          clearcoatRoughness={0.1}
          envMapIntensity={0.9}
        />
      </mesh>

      {/* Both art planes clear the shell's BEVEL, not just its nominal depth
          — `roundedSlab` spans `d + 2·BEV`, so a plane at `d/2 + ε` renders
          inside the plastic and vanishes (gotcha 1, case-geometry.ts). */}
      {frontTex && (
        <mesh position={[0, 0, thickness / 2 + BEV + 0.006]}>
          <planeGeometry args={[W - 0.09, H - 0.09]} />
          <meshPhysicalMaterial
            map={frontTex}
            roughness={0.4}
            clearcoat={1}
            clearcoatRoughness={0.06}
            envMapIntensity={0.5}
          />
        </mesh>
      )}

      {spineTex && (
        <mesh
          rotation={[0, -Math.PI / 2, 0]}
          position={[-(W - 0.02) / 2 - BEV - 0.006, 0, 0]}
        >
          <planeGeometry args={[thickness - 0.03, H - 0.09]} />
          <meshPhysicalMaterial
            map={spineTex}
            roughness={0.42}
            clearcoat={0.8}
            envMapIntensity={0.45}
          />
        </mesh>
      )}
    </group>
  );
}

/* ── The presented case ─────────────────────────────────────────────────── */

/**
 * The selected case, upgraded in place to the full openable object.
 *
 * It occupies the very slot its simplified twin stood in and animates out of
 * the row from exactly that transform, so nothing teleports: what you were
 * looking at on the wall is what turns to face you. The wall stays drawn
 * behind it, which is the whole point of the persistent scene — the case is
 * still visibly on its shelf rather than relocated to an empty studio.
 */
function PresentedCase({ p, open }: { p: Placed; open: boolean }) {
  const { game, x, row } = p;
  const { gl } = useThree();
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const { texture } = useSleeveTexture(game, maxAniso);

  const anim = useRef<THREE.Group>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    const g = anim.current;
    if (!g) return;
    // Eases from the slot's resting transform (spine out, flush in the row)
    // to presented (turned face-on, pulled clear).
    t.current += (1 - t.current) * (1 - Math.exp(-5 * delta));
    const k = t.current;
    g.rotation.y = (Math.PI / 2) * (1 - k);
    g.position.z = DETAIL_CASE_PULL * k;
    g.position.y = 0.1 * k;
  });

  return (
    <group position={[x, rowY(row), 0]}>
      <PresentationControls
        snap
        cursor
        speed={1.2}
        polar={[-0.55, 0.55]}
        azimuth={[-Math.PI / 2, Math.PI / 2]}
      >
        <group ref={anim}>
          <GameCase
            game={{
              title: game.title,
              playtime: game.playtime,
              note: game.note,
              acquired: game.acquired,
              stamps: game.stamps,
            }}
            open={open}
            coverTexture={texture}
          />
        </group>
      </PresentationControls>
    </group>
  );
}

/* ── The impostor wall ──────────────────────────────────────────────────── */

function ImpostorWall({
  placed,
  minRow,
  maxRow,
}: {
  placed: Placed[];
  minRow: number;
  maxRow: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const color = new THREE.Color();

    placed.forEach((p, i) => {
      // A slot with a real textured case in it collapses its impostor: the
      // two are near enough the same size at the same place that leaving
      // both z-fights, which reads as every near case flickering.
      const covered = p.row >= minRow && p.row < maxRow;
      pos.set(p.x, rowY(p.row), 0);
      if (covered) scale.set(0, 0, 0);
      else scale.set(p.thickness, H, W);
      m.compose(pos, quat, scale);
      mesh.setMatrixAt(i, m);
      color.set(livery(p.game.platform).shell);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [placed, minRow, maxRow]);

  if (!placed.length) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, placed.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.62} envMapIntensity={0.5} />
    </instancedMesh>
  );
}

/* ── Camera ─────────────────────────────────────────────────────────────── */

/**
 * One camera for both views. `wall` tracks the page scroll along the rows;
 * `detail` flies to the selected slot and frames it. Because it is the same
 * camera in the same scene, moving between the two is a move, not a cut.
 */
function CameraRig({
  scroll,
  mode,
  selected,
}: {
  scroll: React.RefObject<number>;
  mode: SceneMode;
  selected: Placed | null;
}) {
  const y = useRef(0);
  const look = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    const { camera } = state;
    const k = 1 - Math.exp(-5.5 * delta);

    let tx: number;
    let ty: number;
    let tz: number;
    let lx: number;
    let ly: number;

    if (mode === "detail" && selected) {
      tx = selected.x;
      ty = rowY(selected.row) + 0.1;
      tz = DETAIL_CASE_PULL + DETAIL_CAMERA_GAP;
      lx = selected.x;
      ly = rowY(selected.row) + 0.1;
    } else {
      y.current += (scroll.current - y.current) * k;
      tx = 0;
      ty = -y.current;
      tz = CAMERA_Z;
      lx = 0;
      ly = -y.current;
    }

    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;
    camera.position.z += (tz - camera.position.z) * k;

    look.current.x += (lx - look.current.x) * k;
    look.current.y += (ly - look.current.y) * k;
    camera.lookAt(look.current.x, look.current.y, 0);
  });

  return null;
}

/** Which rows are close enough to deserve real, textured meshes. */
function useRowWindow(
  scroll: React.RefObject<number>,
  totalRows: number,
  mode: SceneMode,
  selected: Placed | null,
) {
  const [range, setRange] = useState<[number, number]>([0, 3]);
  const last = useRef(-1);

  useFrame(() => {
    const centre =
      mode === "detail" && selected
        ? selected.row
        : Math.round(scroll.current / ROW_STEP);
    if (centre === last.current) return;
    last.current = centre;
    const margin = 2;
    setRange([Math.max(0, centre - margin), Math.min(totalRows, centre + margin + 1)]);
  });

  return range;
}

/* ── Scene ──────────────────────────────────────────────────────────────── */

function Scene({
  placed,
  rows,
  selected,
  mode,
  open,
  scroll,
  focusedIndex,
  setFocusedIndex,
  keyboardMode,
  onOpen,
  entered,
}: {
  placed: Placed[];
  rows: number;
  selected: Placed | null;
  mode: SceneMode;
  open: boolean;
  scroll: React.RefObject<number>;
  focusedIndex: number;
  setFocusedIndex: (i: number) => void;
  keyboardMode: boolean;
  onOpen: (p: Placed, i: number) => void;
  entered: React.RefObject<Set<string>>;
}) {
  const [minRow, maxRow] = useRowWindow(scroll, rows, mode, selected);

  return (
    <>
      <CameraRig scroll={scroll} mode={mode} selected={selected} />
      <ImpostorWall placed={placed} minRow={minRow} maxRow={maxRow} />

      {placed.map((p, i) => {
        if (p.row < minRow || p.row >= maxRow) return null;
        // The presented case replaces its own simplified twin, so the slot is
        // never occupied twice.
        if (selected && p.game.id === selected.game.id && mode === "detail") return null;
        return (
          <RealCase
            key={p.game.id}
            p={p}
            focused={keyboardMode && i === focusedIndex}
            entered={entered}
            onFocus={() => setFocusedIndex(i)}
            onOpen={(pp) => onOpen(pp, i)}
          />
        );
      })}

      {mode === "detail" && selected && <PresentedCase p={selected} open={open} />}
    </>
  );
}

/* ── The persistent stage ───────────────────────────────────────────────── */

export function ShelfStage() {
  const { games, mode, selectedId, open, scroll } = useShelfScene();
  const router = useRouter();
  const background = useThemeColor("--ink", "#100e0b");

  const [focusedIndex, setFocusedIndex] = useState(0);
  const [keyboardMode, setKeyboardMode] = useState(false);

  const { placed, rows } = useMemo(() => packRows(games), [games]);

  const entered = useRef(new Set<string>());
  useEffect(() => {
    entered.current = new Set();
  }, [placed]);

  const selected = useMemo(
    () => (selectedId ? (placed.find((p) => p.game.id === selectedId) ?? null) : null),
    [placed, selectedId],
  );

  const rowCounts = useMemo(() => {
    const counts: number[] = [];
    for (const p of placed) counts[p.row] = (counts[p.row] ?? 0) + 1;
    return counts;
  }, [placed]);

  if (!games.length) return null;

  const scrollToRow = (row: number) => {
    window.scrollTo({ top: row * ROW_STEP * 92, behavior: "smooth" });
  };

  const handleOpen = (p: Placed, i: number) => {
    setFocusedIndex(i);
    rememberShelfScroll();
    router.push(`/game/${p.game.id}`);
  };

  return (
    <div
      className="fixed inset-0 z-0"
      style={{ background }}
      tabIndex={0}
      role="group"
      aria-label="Game shelf — 3D view. Arrow keys move between cases, Enter opens one."
      onPointerMove={() => keyboardMode && setKeyboardMode(false)}
      onKeyDown={(e) => {
        if (!placed.length || mode === "detail") return;
        const current = placed[focusedIndex] ?? placed[0];
        let next = focusedIndex;

        if (e.key === "ArrowRight") next = Math.min(placed.length - 1, focusedIndex + 1);
        else if (e.key === "ArrowLeft") next = Math.max(0, focusedIndex - 1);
        else if (e.key === "ArrowDown")
          next = Math.min(placed.length - 1, focusedIndex + (rowCounts[current.row] ?? 1));
        else if (e.key === "ArrowUp")
          next = Math.max(
            0,
            focusedIndex - (rowCounts[current.row - 1] ?? rowCounts[current.row] ?? 1),
          );
        else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen(current, focusedIndex);
          return;
        } else return;

        e.preventDefault();
        setKeyboardMode(true);
        setFocusedIndex(next);
        scrollToRow(placed[next].row);
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
        gl={{ antialias: true }}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={[background]} />
        <StudioEnvironment />
        <StageLighting />
        <Scene
          placed={placed}
          rows={rows}
          selected={selected}
          mode={mode}
          open={open}
          scroll={scroll}
          focusedIndex={focusedIndex}
          setFocusedIndex={setFocusedIndex}
          keyboardMode={keyboardMode}
          onOpen={handleOpen}
          entered={entered}
        />
      </Canvas>
    </div>
  );
}
