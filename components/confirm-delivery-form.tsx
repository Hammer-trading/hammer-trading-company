"use client";

import { useEffect, useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";

type BrowserBarcodeDetector = {
  detect(video: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

type BrowserBarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BrowserBarcodeDetector;

function extractToken(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.searchParams.get("token") || raw;
  } catch {
    return raw;
  }
}

export function ConfirmDeliveryForm({ token }: { token?: string }) {
  const [scannedToken, setScannedToken] = useState(token || "");
  const [scannerMessage, setScannerMessage] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const effectiveToken = scannedToken || token || "";

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startScanner() {
    setScannerMessage("");
    const Detector = (window as unknown as { BarcodeDetector?: BrowserBarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) {
      setScannerMessage("Camera scanner is not supported in this browser. Use the manual scan code field.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new Detector({ formats: ["qr_code", "code_128", "code_39", "ean_13"] });
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        const codes = await detector.detect(videoRef.current).catch(() => []);
        const rawValue = codes[0]?.rawValue;
        if (rawValue) {
          setScannedToken(extractToken(rawValue));
          setScannerMessage("Barcode scanned. Enter OTP to confirm delivery.");
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setScanning(false);
          return;
        }
        window.setTimeout(scan, 500);
      };
      window.setTimeout(scan, 500);
    } catch {
      setScannerMessage("Unable to open camera. Use the manual scan code field.");
      setScanning(false);
    }
  }

  async function submit(formData: FormData) {
    const tokenToSubmit = extractToken(String(formData.get("scanCode") || effectiveToken));
    if (!tokenToSubmit) {
      setMessage("Scan the parcel barcode or paste the scan code before confirming.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/confirm-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenToSubmit,
          otp: formData.get("otp"),
          rating: formData.get("rating"),
          review: formData.get("review"),
          issue: formData.get("issue"),
          gps: formData.get("gps"),
          photoUrl: formData.get("photoUrl")
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "Confirmation failed");
        return;
      }
      setDone(true);
      setMessage(`Delivery confirmed for ${result.orderNumber}.`);
    } catch {
      setMessage("Delivery confirmation could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={submit} className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-black">Scan delivery barcode</h1>
      <p className="mt-2 text-slate-600">Scan the parcel barcode or paste the scan code, then enter the customer OTP.</p>
      <div className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="rounded-lg border border-dashed border-slate-300 p-3">
          <video ref={videoRef} className={scanning ? "aspect-video w-full rounded-md bg-slate-950 object-cover" : "hidden"} muted playsInline />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void startScanner()} disabled={done || scanning}>{scanning ? "Scanning..." : "Use camera scanner"}</Button>
            {scanning ? <Button type="button" variant="outline" onClick={() => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setScanning(false); }}>Stop scanner</Button> : null}
          </div>
          {scannerMessage ? <p className="mt-2 text-sm text-slate-600">{scannerMessage}</p> : null}
        </div>
        <label className="text-sm font-semibold">Scan code / QR token<input name="scanCode" value={effectiveToken} onChange={(event) => setScannedToken(extractToken(event.target.value))} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" placeholder="Scan barcode or paste confirmation link" /></label>
        <label className="text-sm font-semibold">OTP<input name="otp" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm font-semibold">Rating<select name="rating" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>
        <label className="text-sm font-semibold">Review<textarea name="review" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm font-semibold">Report issue<textarea name="issue" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm font-semibold">GPS proof<input name="gps" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional lat,lng from courier app" /></label>
        <label className="text-sm font-semibold">Photo proof URL<input name="photoUrl" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Optional secure uploaded image URL" /></label>
        <Button disabled={done || submitting}>{done ? "Confirmed" : submitting ? "Confirming..." : "Confirm receipt"}</Button>
        {message ? <p className="rounded-md bg-slate-50 p-3 text-sm">{message}</p> : null}
        {done ? <LinkButton href="/products" variant="accent">Buy again</LinkButton> : null}
      </div>
    </form>
  );
}
