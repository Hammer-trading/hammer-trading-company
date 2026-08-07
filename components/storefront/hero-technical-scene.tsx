"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";

function TechnicalAssembly() {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.09;
    group.current.rotation.z += delta * 0.025;
  });

  return (
    <group ref={group} rotation={[0.35, -0.45, 0]}>
      <mesh rotation={[1.1, 0, 0]}>
        <torusGeometry args={[2.35, 0.026, 12, 96]} />
        <meshBasicMaterial color="#b91c1c" transparent opacity={0.65} />
      </mesh>
      <mesh rotation={[0.35, 0.75, 0.25]}>
        <torusGeometry args={[1.55, 0.018, 12, 72]} />
        <meshBasicMaterial color="#f8fafc" transparent opacity={0.34} />
      </mesh>
      <mesh rotation={[1.25, -0.3, 0.75]}>
        <torusGeometry args={[0.95, 0.045, 12, 64]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.82} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.44, 0]} />
        <meshBasicMaterial color="#e2e8f0" wireframe transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

export default function HeroTechnicalScene() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
      <Canvas dpr={[1, 1.25]} gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }} camera={{ position: [0, 0, 6], fov: 42 }}>
        <TechnicalAssembly />
      </Canvas>
    </div>
  );
}
