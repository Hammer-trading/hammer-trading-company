"use client";

import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { AlertCircle, Box, RotateCcw } from "lucide-react";
import Image from "next/image";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

function LoadedModel({ url }: { url: string }) {
  const asset = useGLTF(url);
  const scene = useMemo(() => asset.scene.clone(), [asset.scene]);
  return <primitive object={scene} />;
}

class ModelErrorBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function ModelScene({ url, resetKey }: { url: string; resetKey: number }) {
  const controls = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    controls.current?.reset();
  }, [resetKey]);

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[5, 6, 5]} intensity={2.4} />
      <directionalLight position={[-4, 2, -2]} intensity={1.1} color="#ef4444" />
      <Bounds fit clip observe margin={1.2}>
        <Center><LoadedModel url={url} /></Center>
      </Bounds>
      <OrbitControls ref={controls} enablePan={false} minDistance={2.4} maxDistance={8} autoRotate autoRotateSpeed={0.55} />
    </>
  );
}

export default function ProductModelViewer({ modelUrl, posterUrl, productName }: { modelUrl: string; posterUrl?: string; productName: string }) {
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = host.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "180px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={host} className="relative aspect-square overflow-hidden bg-[#0b1016]" aria-label={`${productName} interactive 3D model`}>
      {visible && !failed ? (
        <ModelErrorBoundary onFailure={() => setFailed(true)}>
          <Suspense fallback={<div className="grid h-full place-items-center text-sm font-bold text-slate-400">Loading 3D model...</div>}>
            <Canvas dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ position: [0, 0.1, 5], fov: 36 }}>
              <ModelScene url={modelUrl} resetKey={resetKey} />
            </Canvas>
          </Suspense>
        </ModelErrorBoundary>
      ) : null}
      {failed ? <div className="grid h-full place-items-center gap-2 p-6 text-center text-sm font-semibold text-slate-400"><AlertCircle size={22} className="text-red-400" />3D model could not be loaded.</div> : null}
      {!visible ? posterUrl ? <Image src={posterUrl} alt="" fill className="object-cover opacity-75" sizes="(max-width: 1024px) 100vw, 50vw" unoptimized={posterUrl.startsWith("data:")} /> : <div className="grid h-full place-items-center text-slate-500"><Box size={38} strokeWidth={1.2} /></div> : null}
      <button type="button" onClick={() => setResetKey((value) => value + 1)} className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-white backdrop-blur transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Reset 3D model view" title="Reset 3D model view">
        <RotateCcw size={17} />
      </button>
    </div>
  );
}
