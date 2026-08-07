"use client";

import { AdaptiveDpr, Grid } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import type { SpatialStorefrontTheme } from "@/components/storefront/use-spatial-storefront";

const palettes: Record<SpatialStorefrontTheme, { accent: string; cool: string; metal: string; dark: string }> = {
  foundry3d: { accent: "#ef3024", cool: "#d7e0e4", metal: "#66737a", dark: "#12191d" },
  axonometric: { accent: "#f0612a", cool: "#3b96d4", metal: "#75838b", dark: "#0c1820" },
  prism3d: { accent: "#36c0b5", cool: "#de5b54", metal: "#8b9b9c", dark: "#0b1718" }
};

function HexNut({ position, rotation, scale = 1, color }: { position: [number, number, number]; rotation: [number, number, number]; scale?: number; color: string }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.32, 6]} />
        <meshStandardMaterial color={color} metalness={0.88} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.29, 0.09, 12, 28]} />
        <meshStandardMaterial color="#090d0f" metalness={0.55} roughness={0.35} />
      </mesh>
    </group>
  );
}

function HardwareAssembly({ theme }: { theme: SpatialStorefrontTheme }) {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const palette = palettes[theme];

  useFrame((state, delta) => {
    if (!group.current || !ring.current) return;
    const targetX = state.pointer.y * 0.22;
    const targetY = state.pointer.x * 0.34;
    group.current.rotation.x += (targetX - group.current.rotation.x) * Math.min(1, delta * 3.2);
    group.current.rotation.y += (targetY - group.current.rotation.y) * Math.min(1, delta * 3.2);
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.11;
    ring.current.rotation.z += delta * 0.16;
  });

  return (
    <group ref={group} position={[1.65, -0.05, 0]} rotation={[0.04, -0.22, -0.08]}>
      <mesh ref={ring} rotation={[Math.PI / 2.2, 0.08, 0]}>
        <torusGeometry args={[1.62, 0.055, 10, 72]} />
        <meshStandardMaterial color={palette.cool} emissive={palette.cool} emissiveIntensity={0.18} metalness={0.72} roughness={0.2} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.34, 0.42, 3.2, 12]} />
        <meshStandardMaterial color={palette.dark} metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.84, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <boxGeometry args={[2.15, 0.62, 0.72]} />
        <meshStandardMaterial color={palette.accent} metalness={0.66} roughness={0.27} />
      </mesh>
      <mesh position={[0, 0.84, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.23, 0.045, 10, 28]} />
        <meshStandardMaterial color={palette.cool} emissive={palette.cool} emissiveIntensity={0.38} />
      </mesh>
      <HexNut position={[-1.65, 0.5, -0.35]} rotation={[1.1, 0.25, 0.4]} scale={0.52} color={palette.metal} />
      <HexNut position={[1.72, -0.86, -0.7]} rotation={[0.7, -0.4, 0.1]} scale={0.38} color={palette.accent} />
      <HexNut position={[2.15, 1.2, -1.35]} rotation={[1.25, 0.2, 0.55]} scale={0.23} color={palette.cool} />
      <mesh position={[-1.5, -1.1, -0.8]} rotation={[0.25, 0.2, -0.65]}>
        <cylinderGeometry args={[0.13, 0.13, 1.5, 10]} />
        <meshStandardMaterial color={palette.metal} metalness={0.92} roughness={0.18} />
      </mesh>
    </group>
  );
}

function Fasteners({ theme }: { theme: SpatialStorefrontTheme }) {
  const group = useRef<Group>(null);
  const palette = palettes[theme];
  const positions = useMemo(() => [
    [-3.8, 1.75, -2.4], [-2.5, -1.85, -2.8], [3.7, 1.9, -3.2], [4.2, -1.6, -2.1], [0.1, 2.35, -3.8]
  ] as [number, number, number][], []);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.18) * 0.04;
    group.current.rotation.y += delta * 0.018;
  });

  return (
    <group ref={group}>
      {positions.map((position, index) => (
        <HexNut
          key={position.join("-")}
          position={position}
          rotation={[0.75 + index * 0.13, index * 0.34, index * 0.18]}
          scale={0.14 + (index % 3) * 0.045}
          color={index % 2 ? palette.metal : palette.accent}
        />
      ))}
    </group>
  );
}

function AxonometricAssembly() {
  const group = useRef<Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += ((state.pointer.x * 0.18) - group.current.rotation.y) * Math.min(1, delta * 2.8);
    group.current.rotation.x += ((-0.42 + state.pointer.y * 0.08) - group.current.rotation.x) * Math.min(1, delta * 2.8);
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.42) * 0.08;
  });
  const blocks = useMemo(() => [
    [-1.4, -0.8, 0, 1.5, 0.8, 1.5, "#176fa6"], [0.15, -0.55, -0.3, 1.35, 1.3, 1.35, "#f0612a"],
    [1.6, -0.9, 0.2, 1.2, 0.65, 1.2, "#dbe7ec"], [-0.65, 0.35, -0.65, 1.05, 1.05, 1.05, "#70818a"],
    [0.75, 0.65, -0.75, 0.82, 1.65, 0.82, "#1e3542"]
  ] as const, []);
  return <group ref={group} position={[1.5, 0.15, 0]} rotation={[-0.42, 0.55, 0.1]}>{blocks.map((block, index) => <mesh key={index} position={[block[0], block[1], block[2]]}><boxGeometry args={[block[3], block[4], block[5]]}/><meshStandardMaterial color={block[6]} metalness={0.52} roughness={0.3}/></mesh>)}</group>;
}

function PrismAssembly() {
  const group = useRef<Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.x += ((state.pointer.y * 0.12) - group.current.rotation.x) * Math.min(1, delta * 2.5);
    group.current.rotation.y += ((state.pointer.x * 0.2) - group.current.rotation.y) * Math.min(1, delta * 2.5);
    group.current.rotation.z += delta * 0.045;
  });
  return <group ref={group} position={[1.6, 0, 0]} rotation={[0.1, -0.2, 0]}>
    {[1.7, 1.25, 0.82].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2 + index * 0.25, index * 0.35, 0]}><torusGeometry args={[radius, 0.045 + index * 0.018, 12, 80]}/><meshStandardMaterial color={index === 1 ? "#de5b54" : "#36c0b5"} emissive={index === 1 ? "#de5b54" : "#36c0b5"} emissiveIntensity={0.3} metalness={0.75} roughness={0.15}/></mesh>)}
    <mesh rotation={[0.4, 0.6, 0.15]}><icosahedronGeometry args={[0.68, 1]}/><meshPhysicalMaterial color="#dce8e6" metalness={0.15} roughness={0.08} transmission={0.45} thickness={0.7}/></mesh>
  </group>;
}

export function ThreeHeroStage({ theme }: { theme: SpatialStorefrontTheme }) {
  const palette = palettes[theme];

  return (
    <div className="store-hero-webgl" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.2, 7.4], fov: 40, near: 0.1, far: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        shadows={false}
      >
        <ambientLight intensity={0.72} />
        <directionalLight position={[4, 6, 5]} intensity={2.5} color="#ffffff" />
        <pointLight position={[-4, 1, 4]} intensity={18} distance={12} color={palette.accent} />
        <pointLight position={[4, -2, 3]} intensity={14} distance={10} color={palette.cool} />
        {theme === "foundry3d" ? <><HardwareAssembly theme={theme}/><Fasteners theme={theme}/></> : null}
        {theme === "axonometric" ? <AxonometricAssembly/> : null}
        {theme === "prism3d" ? <PrismAssembly/> : null}
        <Grid
          position={[0, -2.5, -1.4]}
          args={[14, 10]}
          cellColor={palette.metal}
          sectionColor={palette.accent}
          cellSize={0.55}
          sectionSize={2.2}
          cellThickness={0.35}
          sectionThickness={0.65}
          fadeDistance={9}
          fadeStrength={1.8}
          infiniteGrid
        />
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}
