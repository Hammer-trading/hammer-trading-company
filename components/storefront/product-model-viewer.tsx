"use client";

import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { AlertCircle, Box, Expand, RotateCcw, RotateCw } from "lucide-react";
import Image from "next/image";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
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

function ModelScene({ url, resetKey, autoRotate }: { url: string; resetKey: number; autoRotate: boolean }) {
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
      <OrbitControls ref={controls} enablePan={false} minDistance={2.4} maxDistance={8} autoRotate={autoRotate} autoRotateSpeed={0.55} />
    </>
  );
}

export default function ProductModelViewer({ modelUrl, posterUrl, productName }: { modelUrl: string; posterUrl?: string; productName: string }) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  // Auto-rotate disabled by default when reduced-motion is preferred
  const [autoRotate, setAutoRotate] = useState(!reduceMotion);
  const [fullscreen, setFullscreen] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = host.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "180px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [fullscreen]);

  const toggleFullscreen = () => {
    if (!host.current) return;
    if (!document.fullscreenElement) {
      host.current.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  return (
    <div ref={host} className={`relative aspect-square overflow-hidden bg-[#0b1016] ${fullscreen ? "fixed inset-0 z-50 aspect-auto" : ""}`} aria-label={`${productName} interactive 3D model`}>
      {visible && !failed ? (
        <ModelErrorBoundary onFailure={() => setFailed(true)}>
          <Suspense fallback={<div className="grid h-full place-items-center text-sm font-bold text-slate-400">Loading 3D model...</div>}>
            <Canvas dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ position: [0, 0.1, 5], fov: 36 }} canvasRef={canvasRef} performance={{ min: 0.2 }}>
              <ModelScene url={modelUrl} resetKey={resetKey} autoRotate={autoRotate} />
            </Canvas>
          </Suspense>
        </ModelErrorBoundary>
      ) : null}
      {failed ? <div className="grid h-full place-items-center gap-2 p-6 text-center text-sm font-semibold text-slate-400"><AlertCircle size={22} className="text-red-400" />3D model could not be loaded.</div> : null}
      {!visible ? posterUrl ? <Image src={posterUrl} alt="" fill className="object-cover opacity-75" sizes="(max-width: 1024px) 100vw, 50vw" unoptimized={posterUrl.startsWith("data:") || posterUrl.startsWith("/api/product-images/")} /> : <div className="grid h-full place-items-center text-slate-500"><Box size={38} strokeWidth={1.2} /></div> : null}
      <div className="absolute bottom-3 right-3 flex gap-2">
        <button type="button" onClick={() => setAutoRotate((v) => !v)} className="grid size-10 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-white backdrop-blur transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label={autoRotate ? "Disable auto-rotate" : "Enable auto-rotate"} title={autoRotate ? "Disable auto-rotate" : "Enable auto-rotate"}>
          {autoRotate ? <RotateCw size={17} /> : <RotateCcw size={17} />}
        </button>
        <button type="button" onClick={() => setResetKey((value) => value + 1)} className="grid size-10 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-white backdrop-blur transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Reset 3D model view" title="Reset 3D model view">
          <RotateCcw size={17} />
        </button>
        <button type="button" onClick={toggleFullscreen} className="grid size-10 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-white backdrop-blur transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Toggle fullscreen" title="Toggle fullscreen">
          <Expand size={17} />
        </button>
      </div>
    </div>
  );
}
