"use client";

import { upload } from "@vercel/blob/client";
import { FileUp, ImageIcon, Loader2, RotateCcw, Video, X } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";

type MediaKind = "IMAGE" | "VIDEO" | "PDF" | "DOCUMENT" | "MODEL";

type RegisteredMedia = {
  id: string;
  kind: MediaKind;
  name: string;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  altText?: string | null;
};

type Props = {
  label?: string;
  value?: string | null;
  altText?: string | null;
  accept?: string;
  preferredKind?: "IMAGE" | "VIDEO";
  onChange: (url: string, asset?: RegisteredMedia) => void;
};

const maximumSize: Record<MediaKind, number> = {
  IMAGE: 12_000_000,
  VIDEO: 250_000_000,
  PDF: 25_000_000,
  DOCUMENT: 25_000_000,
  MODEL: 20_000_000
};

function kindFor(file: File): MediaKind {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  if (file.type === "application/pdf") return "PDF";
  if (/\.(glb|gltf)$/i.test(file.name)) return "MODEL";
  return "DOCUMENT";
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "media";
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return body.error || "Upload failed";
}

export function AdminMediaUpload({
  label = "Upload media",
  value,
  altText,
  accept = "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,application/pdf",
  preferredKind,
  onChange
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const retryFileRef = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function uploadFile(file: File) {
    const kind = kindFor(file);
    if (preferredKind && kind !== preferredKind) {
      setError(`Choose a ${preferredKind.toLowerCase()} file.`);
      return;
    }
    if (file.size > maximumSize[kind]) {
      setError(`${kind.toLowerCase()} exceeds the ${Math.round(maximumSize[kind] / 1_000_000)} MB limit.`);
      return;
    }

    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const pathname = `htc/media/${Date.now()}-${safeName(file.name)}`;
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/admin/media/upload",
        contentType: file.type,
        multipart: file.size > 5_000_000,
        clientPayload: JSON.stringify({
          kind,
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          altText: altText || file.name.replace(/\.[^.]+$/, "")
        }),
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage))
      });
      const response = await fetch("/api/admin/media/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name: file.name,
          url: blob.url,
          mimeType: blob.contentType || file.type,
          sizeBytes: file.size,
          altText: altText || file.name.replace(/\.[^.]+$/, ""),
          metadata: { pathname: blob.pathname, source: "vercel-blob" }
        })
      });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json();
      onChange(blob.url, data.item);
      setProgress(100);
      retryFileRef.current = null;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    retryFileRef.current = file;
    await uploadFile(file);
  }

  const isVideo = Boolean(value && /\.(mp4|webm)(?:$|\?)/i.test(value));

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black">{label}</p>
          <p className="text-xs text-slate-500">Images 12 MB, videos 250 MB</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-50 dark:bg-white dark:text-slate-950"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : value ? <RotateCcw size={16} /> : <FileUp size={16} />}
          {busy ? `${progress}%` : value ? "Replace" : "Choose file"}
        </button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => void select(event)} />
      </div>

      {busy ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full bg-red-600 transition-transform" style={{ transform: `scaleX(${progress / 100})`, transformOrigin: "left" }} /></div> : null}
      {error ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <span>{error}</span>
          {retryFileRef.current ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const file = retryFileRef.current;
                if (file) void uploadFile(file);
              }}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 transition hover:border-red-400 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/60"
            >
              <RotateCcw size={13} />
              Retry upload
            </button>
          ) : null}
        </div>
      ) : null}

      {value ? (
        <div className="relative mt-3 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-900">
          {isVideo ? (
            <video src={value} controls preload="metadata" className="aspect-video w-full object-cover" />
          ) : (
            // Admin-selected URLs can point to the configured Blob store or an existing external CDN.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={altText || "Uploaded media"} className="aspect-video w-full object-cover" />
          )}
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] font-black uppercase text-white">
            {isVideo ? <Video size={12} /> : <ImageIcon size={12} />} {isVideo ? "Video" : "Image"}
          </span>
          <button type="button" onClick={() => onChange("")} className="absolute right-2 top-2 grid size-8 place-items-center rounded-md bg-white/90 text-slate-950 shadow" aria-label="Remove selected media"><X size={15} /></button>
        </div>
      ) : null}
    </div>
  );
}
