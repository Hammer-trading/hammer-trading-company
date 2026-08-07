"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";

const fasteners = Array.from({ length: 10 }, (_, index) => ({
  angle: (index / 10) * Math.PI * 2,
  key: `fastener-${index}`
}));

function Assembly({ progress }: { progress: number }) {
  const invalidate = useThree((state) => state.invalidate);
  const turn = progress * Math.PI * 1.55;
  const spread = Math.sin(progress * Math.PI) * 0.72;
  const lift = (progress - 0.5) * 0.7;

  useEffect(() => invalidate(), [invalidate, progress]);

  return (
    <group position={[Math.cos(progress * Math.PI * 2) * 1.15, lift, 0]} rotation={[0.28 + progress * 0.34, turn, -0.18 + progress * 0.3]} scale={1 + progress * 0.08}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.18, 1.18, 0.5, 48, 1, true]} />
        <meshStandardMaterial color="#20272b" metalness={0.82} roughness={0.28} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.23, 0.13, 16, 80]} />
        <meshStandardMaterial color="#d51f2c" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, spread]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.72, 8]} />
        <meshStandardMaterial color="#d5d9d6" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, -spread]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.58, 1.1, 8]} />
        <meshStandardMaterial color="#927d46" metalness={0.75} roughness={0.32} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[2.85, 0.09, 0.17]} />
        <meshStandardMaterial color="#3d8b91" metalness={0.5} roughness={0.38} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[2.85, 0.09, 0.17]} />
        <meshStandardMaterial color="#3d8b91" metalness={0.5} roughness={0.38} />
      </mesh>
      {fasteners.map(({ angle, key }) => (
        <mesh key={key} position={[Math.cos(angle) * 1.78, Math.sin(angle) * 1.78, Math.cos(progress * Math.PI) * 0.34]} rotation={[Math.PI / 2, 0, -angle]}>
          <cylinderGeometry args={[0.08, 0.08, 0.32, 8]} />
          <meshStandardMaterial color={angle > Math.PI ? "#d51f2c" : "#c7cbc8"} metalness={0.8} roughness={0.24} />
        </mesh>
      ))}
      <mesh rotation={[1.05, progress * 0.9, 0.4]}>
        <torusGeometry args={[2.18, 0.018, 8, 96]} />
        <meshBasicMaterial color="#6d7d83" transparent opacity={0.48} />
      </mesh>
      <mesh rotation={[0.2, 1.2, progress * 0.65]}>
        <torusGeometry args={[2.52, 0.012, 8, 96]} />
        <meshBasicMaterial color="#d51f2c" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

export default function ScrollAssemblyCanvas({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.25]}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 7], fov: 40 }}
      >
        <fog attach="fog" args={["#090c0f", 6, 12]} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[4, 5, 5]} intensity={3.2} color="#ffffff" />
        <directionalLight position={[-4, -1, 3]} intensity={2.2} color="#d51f2c" />
        <pointLight position={[1, -3, 3]} intensity={25} color="#3d8b91" distance={8} />
        <Assembly progress={progress} />
      </Canvas>
    </div>
  );
}
