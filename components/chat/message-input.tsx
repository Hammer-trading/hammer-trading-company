"use client";

import { upload } from "@vercel/blob/client";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { FileText, LoaderCircle, Lock, Mic, Paperclip, Pause, Play, Reply, Send, ShoppingBag, Square, Trash2, UploadCloud, Volume2, X } from "lucide-react";
import Image from "next/image";
import { ProductSelector, type SelectedSharedProduct } from "@/components/chat/product-selector";
import type { ChatMessage, ChatMessageDraft } from "@/components/chat/types";
import { VoicePlayer } from "@/components/chat/voice-player";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

const maxAttachmentBytes = 700 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const maxVoiceBytes = 10_000_000;
const maxVoiceSeconds = 180;
const voiceMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"] as const;

type VoiceDraft = {
  blob: Blob;
  mimeType: string;
  duration: number;
  waveform: number[];
  previewUrl: string;
};

function normalizedAudioType(value: string) {
  const type = value.split(";")[0].toLowerCase();
  return ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"].includes(type) ? type : "audio/webm";
}

function audioExtension(type: string) {
  if (type === "audio/mp4") return "m4a";
  if (type === "audio/mpeg") return "mp3";
  if (type === "audio/ogg") return "ogg";
  return "webm";
}

function durationLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function normalizeWaveform(samples: number[], barCount = 36) {
  if (!samples.length) return Array.from({ length: barCount }, () => 24);
  const bucketSize = Math.max(1, Math.ceil(samples.length / barCount));
  return Array.from({ length: barCount }, (_, index) => {
    const bucket = samples.slice(index * bucketSize, (index + 1) * bucketSize);
    const peak = bucket.length ? Math.max(...bucket) : samples[samples.length - 1] || 0;
    return Math.max(8, Math.min(100, Math.round(8 + peak * 92)));
  });
}

export function MessageInput({
  disabled,
  loading,
  placeholder = "Write a message...",
  replyTo,
  onCancelReply,
  onSend
}: {
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  onSend: (draft: ChatMessageDraft) => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Omit<ChatMessageDraft, "messageText"> | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SelectedSharedProduct | null>(null);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [fileError, setFileError] = useState("");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "uploading">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingLocked, setRecordingLocked] = useState(false);
  const [liveWaveform, setLiveWaveform] = useState<number[]>(() => Array.from({ length: 36 }, () => 12));
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingSecondsRef = useRef(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);
  const waveformPaintedAtRef = useRef(0);
  const recordingCancelledRef = useRef(false);
  const recordingLockedRef = useRef(false);
  const pointerHoldingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const uploadAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (waveformFrameRef.current !== null) cancelAnimationFrame(waveformFrameRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      uploadAbortRef.current?.abort();
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const previewUrl = voiceDraft?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [voiceDraft?.previewUrl]);

  function releaseRecordingResources() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (waveformFrameRef.current !== null) {
      cancelAnimationFrame(waveformFrameRef.current);
      waveformFrameRef.current = null;
    }
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  async function uploadVoiceRecording(draft: VoiceDraft) {
    const contentType = normalizedAudioType(draft.mimeType);
    const blob = draft.blob;
    if (!blob.size) throw new Error("The recording is empty. Please record again.");
    if (blob.size > maxVoiceBytes) throw new Error("Voice message is larger than 10 MB.");

    const extension = audioExtension(contentType);
    const name = `voice-message-${Date.now()}.${extension}`;
    const file = new File([blob], name, { type: contentType });
    const uploadController = new AbortController();
    uploadAbortRef.current = uploadController;
    setUploadProgress(0);
    const uploaded = await upload(`htc/chat/voice/${name}`, file, {
        access: "public",
        handleUploadUrl: "/api/chat/media/upload",
        contentType,
        abortSignal: uploadController.signal,
        onUploadProgress: ({ percentage }) => {
          if (mountedRef.current) setUploadProgress(Math.round(percentage));
        },
        clientPayload: JSON.stringify({
          name: "Voice message",
          mimeType: contentType,
          sizeBytes: file.size,
          durationSeconds: draft.duration
        })
      })
      .finally(() => {
        if (uploadAbortRef.current === uploadController) uploadAbortRef.current = null;
      });

    return {
      messageType: "VOICE",
      attachmentUrl: uploaded.url,
      attachmentName: "Voice message",
      attachmentType: contentType,
      voiceDuration: draft.duration,
      voiceWaveform: draft.waveform
    } satisfies Omit<ChatMessageDraft, "messageText">;
  }

  function finishRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (recorder.state === "paused") recorder.resume();
    setVoiceNotice("Preparing your voice message...");
    recorder.stop();
  }

  function cancelRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recordingCancelledRef.current = true;
    recorder.ondataavailable = null;
    recorder.stop();
    releaseRecordingResources();
    setVoiceState("idle");
    setRecordingPaused(false);
    setRecordingLocked(false);
    recordingLockedRef.current = false;
    setRecordingSeconds(0);
    setVoiceNotice("Voice recording cancelled.");
    navigator.vibrate?.(35);
  }

  function toggleRecordingPause() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (recorder.state === "paused") {
      recorder.resume();
      setRecordingPaused(false);
      setVoiceNotice("Recording resumed.");
    } else {
      recorder.pause();
      setRecordingPaused(true);
      setVoiceNotice("Recording paused.");
    }
    navigator.vibrate?.(20);
  }

  function lockRecording() {
    recordingLockedRef.current = true;
    setRecordingLocked(true);
    setVoiceNotice("Recording locked. You can release the microphone.");
    navigator.vibrate?.([25, 25, 25]);
  }

  function startWaveform(stream: MediaStream) {
    const AudioContextConstructor = window.AudioContext;
    const context = new AudioContextConstructor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    context.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = context;
    analyserRef.current = analyser;
    const values = new Uint8Array(analyser.frequencyBinCount);
    const paint = (timestamp: number) => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(values);
      let peak = 0;
      for (const value of values) peak = Math.max(peak, Math.abs(value - 128) / 128);
      waveformSamplesRef.current.push(peak);
      if (waveformSamplesRef.current.length > 900) waveformSamplesRef.current.shift();
      if (timestamp - waveformPaintedAtRef.current > 90) {
        waveformPaintedAtRef.current = timestamp;
        setLiveWaveform(normalizeWaveform(waveformSamplesRef.current.slice(-180)));
      }
      waveformFrameRef.current = requestAnimationFrame(paint);
    };
    waveformFrameRef.current = requestAnimationFrame(paint);
  }

  async function startRecording() {
    if (voiceState !== "idle" || attachment || selectedProduct || voiceDraft) return;
    setVoiceNotice("");
    setFileError("");

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceNotice("Voice recording is not supported by this browser.");
      return;
    }
    if (!window.isSecureContext) {
      setVoiceNotice("Microphone access requires a secure HTTPS connection.");
      return;
    }

    try {
      // Keep this request directly inside the click handler so mobile browsers show
      // their native microphone permission prompt.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        }
      });
      const selectedMimeType = voiceMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      waveformSamplesRef.current = [];
      recordingSecondsRef.current = 0;
      recordingCancelledRef.current = false;
      recordingLockedRef.current = false;
      setRecordingSeconds(0);
      setRecordingPaused(false);
      setRecordingLocked(false);
      setLiveWaveform(Array.from({ length: 36 }, () => 12));
      setVoiceState("recording");
      setVoiceNotice(pointerHoldingRef.current ? "Hold to record. Swipe left to cancel or up to lock." : "Recording locked. Tap stop when finished.");
      startWaveform(stream);
      navigator.vibrate?.(30);
      if (!pointerHoldingRef.current) lockRecording();

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
        releaseRecordingResources();
        if (!mountedRef.current) return;
        setVoiceState("idle");
        setVoiceNotice("Recording failed. Please check microphone access and try again.");
      };
      recorder.onstop = () => {
        const chunks = [...chunksRef.current];
        const durationSeconds = Math.max(1, Math.min(maxVoiceSeconds, recordingSecondsRef.current || 1));
        const recordedMimeType = recorder.mimeType || selectedMimeType || "audio/webm";
        const cancelled = recordingCancelledRef.current;
        const waveform = normalizeWaveform(waveformSamplesRef.current);
        releaseRecordingResources();
        if (!mountedRef.current || cancelled) return;
        const contentType = normalizedAudioType(recordedMimeType);
        const blob = new Blob(chunks, { type: contentType });
        if (!blob.size) {
          setVoiceNotice("The recording is empty. Please record again.");
          setVoiceState("idle");
          return;
        }
        setVoiceDraft({
          blob,
          mimeType: contentType,
          duration: durationSeconds,
          waveform,
          previewUrl: URL.createObjectURL(blob)
        });
        setVoiceState("idle");
        setRecordingPaused(false);
        setRecordingLocked(false);
        recordingLockedRef.current = false;
        setVoiceNotice("Preview your recording, then select Send.");
      };

      recorder.start(1_000);
      recordingTimerRef.current = setInterval(() => {
        if (recorder.state === "recording") recordingSecondsRef.current += 1;
        const seconds = Math.min(maxVoiceSeconds, recordingSecondsRef.current);
        if (mountedRef.current) setRecordingSeconds(seconds);
        if (seconds >= maxVoiceSeconds && recorder.state !== "inactive") {
          if (mountedRef.current) setVoiceNotice("Maximum recording length reached. Preparing preview...");
          recorder.stop();
        }
      }, 1_000);
    } catch (error) {
      releaseRecordingResources();
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
      setVoiceState("idle");
      setVoiceNotice(denied
        ? "Microphone access was denied. Open this site's browser permissions, allow Microphone, then tap the mic again."
        : "Microphone could not be opened. Check that it is connected and not used by another app.");
    }
  }

  async function selectAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileError("");
    if (!allowedTypes.includes(file.type)) {
      setFileError("Use JPG, PNG, WebP, or PDF files only.");
      return;
    }
    if (file.size > maxAttachmentBytes) {
      setFileError("Attachment must be smaller than 700 KB.");
      return;
    }
    const attachmentUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Attachment could not be read"));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!attachmentUrl) {
      setFileError("Attachment could not be prepared. Please try another file.");
      return;
    }
    setAttachment({ attachmentUrl, attachmentName: file.name.slice(0, 180), attachmentType: file.type });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if ((!value && !attachment && !selectedProduct && !voiceDraft) || disabled || loading || submitting || voiceState !== "idle") return;
    setSubmitting(true);
    let preparedAttachment = attachment;
    try {
      if (voiceDraft) {
        setVoiceState("uploading");
        setVoiceNotice("Uploading voice message...");
        preparedAttachment = await uploadVoiceRecording(voiceDraft);
      }
      await onSend({
        clientMessageId: crypto.randomUUID(),
        messageText: value,
        replyToId: replyTo?.id,
        ...preparedAttachment,
        ...(selectedProduct ? {
          messageType: "PRODUCT" as const,
          productId: selectedProduct.product.id,
          productVariantId: selectedProduct.variant.id
        } : {})
      });
      setText("");
      setAttachment(null);
      setVoiceDraft(null);
      setSelectedProduct(null);
      setFileError("");
      onCancelReply?.();
      setVoiceNotice("");
      setUploadProgress(0);
      navigator.vibrate?.(25);
    } catch (error) {
      if (preparedAttachment && voiceDraft) {
        setAttachment(preparedAttachment);
        setVoiceDraft(null);
        setVoiceNotice("Voice upload completed. Select Send to retry the message.");
      } else if (error instanceof DOMException && error.name === "AbortError") {
        setVoiceNotice("Voice upload cancelled. Your preview is still available.");
      } else if (voiceDraft) {
        setVoiceNotice("Voice upload failed. Check your connection and select Send to retry.");
      }
      // Keep the drafted message in place so the admin/customer can retry.
    } finally {
      setVoiceState("idle");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:p-4">
      {replyTo ? (
        <div className="mb-2 flex items-center gap-3 border-l-2 border-red-600 bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
          <Reply size={16} className="shrink-0 text-red-600" />
          <span className="min-w-0 flex-1">
            <strong className="block text-[10px] uppercase text-red-700 dark:text-red-300">Replying to {replyTo.senderRole === "ADMIN" ? "Admin" : replyTo.sender?.name || "Customer"}</strong>
            <span className="block truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
              {replyTo.messageText || (replyTo.messageType === "VOICE" ? "Voice message" : replyTo.messageType === "PRODUCT" ? "Shared product" : replyTo.attachmentName || "Attachment")}
            </span>
          </span>
          <button type="button" onClick={onCancelReply} className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-red-700 dark:hover:bg-slate-950" aria-label="Cancel reply"><X size={15} /></button>
        </div>
      ) : null}
      {attachment ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="inline-flex min-w-0 items-center gap-2 font-bold">
            {attachment.messageType === "VOICE" ? <Volume2 size={16} className="shrink-0 text-red-700" /> : <FileText size={16} className="shrink-0 text-red-700" />}
            <span className="truncate">{attachment.attachmentName}</span>
            {attachment.voiceDuration ? <span className="shrink-0 font-mono text-xs text-slate-500">{durationLabel(attachment.voiceDuration)}</span> : null}
          </span>
          <button type="button" onClick={() => { setAttachment(null); setVoiceNotice(""); }} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-red-700 dark:hover:bg-slate-950" aria-label="Remove attachment"><X size={16} /></button>
        </div>
      ) : null}
      {fileError ? <p className="mb-2 text-xs font-bold text-red-700" role="alert">{fileError}</p> : null}
      {voiceNotice ? <p className="mb-2 text-xs font-bold text-amber-700 dark:text-amber-300" role="status" aria-live="polite">{voiceNotice}</p> : null}
      {voiceState === "recording" ? (
        <div className="mb-2 overflow-hidden rounded-2xl border border-red-200 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.16),transparent_45%),linear-gradient(135deg,#fff7f7,#fff)] p-3 text-red-950 shadow-sm dark:border-red-950 dark:bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.18),transparent_45%),linear-gradient(135deg,#1e1014,#0f172a)] dark:text-red-100">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/25">
              {recordingPaused ? <Pause size={17} fill="currentColor" /> : <Mic size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`size-2 rounded-full bg-red-600 ${recordingPaused ? "" : "animate-pulse"}`} />
                  {recordingPaused ? "Paused" : recordingLocked ? "Hands-free recording" : "Recording"}
                </span>
                <span className="font-mono text-xs normal-case">{durationLabel(recordingSeconds)} / {durationLabel(maxVoiceSeconds)}</span>
              </div>
              <div className="flex h-8 items-center gap-[2px]" aria-label="Live voice waveform">
                {liveWaveform.map((peak, index) => (
                  <span key={index} className="h-full min-w-[2px] flex-1 origin-center rounded-full bg-red-500 transition-transform duration-100" style={{ transform: `scaleY(${peak / 100})` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" onClick={cancelRecording} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white/80 px-2 text-xs font-black text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-950/60 dark:text-red-300">
              <Trash2 size={15} /> Cancel
            </button>
            <button type="button" onClick={toggleRecordingPause} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white/80 px-2 text-xs font-black text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-950/60 dark:text-red-300">
              {recordingPaused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />} {recordingPaused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={finishRecording} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-2 text-xs font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700">
              <Square size={13} fill="currentColor" /> Preview
            </button>
          </div>
          {!recordingLocked ? <p className="mt-2 text-center text-[10px] font-black uppercase text-red-700/70 dark:text-red-300/70">Swipe left to cancel / swipe up to lock</p> : null}
        </div>
      ) : null}
      {voiceState === "uploading" ? (
        <div className="mb-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-900 dark:border-red-950 dark:bg-red-950/30 dark:text-red-100">
          <div className="flex items-center justify-between gap-3 text-xs font-black">
            <span className="inline-flex items-center gap-2"><UploadCloud size={16} /> Uploading voice message</span>
            <span className="inline-flex items-center gap-2">
              <span className="font-mono">{uploadProgress}%</span>
              <button type="button" onClick={() => uploadAbortRef.current?.abort()} className="grid size-7 place-items-center rounded-full bg-white/80 text-red-700 transition hover:bg-white dark:bg-slate-950" aria-label="Cancel voice upload"><X size={13} /></button>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-red-100 dark:bg-red-950">
            <div className="h-full origin-left rounded-full bg-red-600 transition-transform duration-200" style={{ transform: `scaleX(${uploadProgress / 100})` }} />
          </div>
        </div>
      ) : null}
      {voiceDraft ? (
        <div className="mb-2 rounded-2xl border border-red-200 bg-red-50/70 p-2.5 text-slate-900 dark:border-red-950 dark:bg-red-950/20 dark:text-white">
          <VoicePlayer src={voiceDraft.previewUrl} waveform={voiceDraft.waveform} duration={voiceDraft.duration} label="Voice preview" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase text-red-700 dark:text-red-300">Ready to send / add an optional caption</p>
            <button type="button" onClick={() => { setVoiceDraft(null); setVoiceNotice("Voice preview deleted."); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2 text-xs font-black text-red-700 transition hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950/50">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      ) : null}
      {selectedProduct ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm dark:border-red-950 dark:bg-red-950/25">
          <span className="flex min-w-0 items-center gap-3">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-slate-900">
              <Image src={selectedProduct.variant.imageUrl || selectedProduct.product.image} alt={selectedProduct.product.name} fill unoptimized className="object-cover" sizes="48px" />
            </span>
            <span className="min-w-0">
              <strong className="block truncate">{selectedProduct.product.name}</strong>
              <span className="block truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{selectedProduct.variant.title} / {money(selectedProduct.variant.price)}</span>
            </span>
          </span>
          <button type="button" onClick={() => setSelectedProduct(null)} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-red-700 dark:hover:bg-slate-950" aria-label="Remove selected product"><X size={16} /></button>
        </div>
      ) : null}
      <div className="grid grid-cols-[repeat(3,2.75rem)_minmax(0,1fr)] gap-2 sm:flex">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => void selectAttachment(event)} className="sr-only" />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || loading || voiceState !== "idle" || Boolean(voiceDraft)} className="grid size-11 shrink-0 place-items-center self-end rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-label="Attach image or PDF" title="Attach image or PDF"><Paperclip size={18} /></button>
        <button type="button" onClick={() => setProductSelectorOpen(true)} disabled={disabled || loading || voiceState !== "idle" || Boolean(voiceDraft)} className="grid size-11 shrink-0 place-items-center self-end rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-label="Share product" title="Share product"><ShoppingBag size={18} /></button>
        <button
          type="button"
          onPointerDown={(event) => {
            if (voiceState === "recording" && recordingLockedRef.current) {
              finishRecording();
              return;
            }
            if (voiceState !== "idle") return;
            pointerHoldingRef.current = true;
            pointerStartRef.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
            void startRecording();
          }}
          onPointerMove={(event) => {
            if (!pointerHoldingRef.current || voiceState !== "recording" || recordingLockedRef.current) return;
            const deltaX = event.clientX - pointerStartRef.current.x;
            const deltaY = event.clientY - pointerStartRef.current.y;
            if (deltaX < -72) {
              pointerHoldingRef.current = false;
              cancelRecording();
            } else if (deltaY < -72) {
              pointerHoldingRef.current = false;
              lockRecording();
            }
          }}
          onPointerUp={() => {
            pointerHoldingRef.current = false;
            if (voiceState === "recording" && !recordingLockedRef.current) finishRecording();
          }}
          onPointerCancel={() => {
            pointerHoldingRef.current = false;
            if (voiceState === "recording" && !recordingLockedRef.current) lockRecording();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            if (voiceState === "recording") finishRecording();
            else void startRecording();
          }}
          disabled={disabled || loading || submitting || voiceState === "uploading" || Boolean(attachment) || Boolean(selectedProduct) || Boolean(voiceDraft)}
          className={`grid size-11 shrink-0 place-items-center self-end rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-50 ${voiceState === "recording" ? "border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/20" : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
          aria-label={voiceState === "recording" ? "Stop voice recording" : "Record voice message"}
          title={voiceState === "recording" ? "Stop recording" : "Record voice message"}
        >
          {voiceState === "uploading" ? <LoaderCircle size={18} className="animate-spin" /> : voiceState === "recording" ? recordingLocked ? <Lock size={17} /> : <Square size={16} fill="currentColor" /> : <Mic size={18} />}
        </button>
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          disabled={disabled || loading || voiceState === "recording" || voiceState === "uploading"}
          placeholder={placeholder}
          aria-label={placeholder}
          className="order-first col-span-4 min-h-12 min-w-0 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-600 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 sm:order-none sm:col-span-1 sm:flex-1"
        />
        <Button
          type="submit"
          variant="accent"
          disabled={disabled || loading || submitting || voiceState !== "idle" || (!text.trim() && !attachment && !selectedProduct && !voiceDraft)}
          className="min-w-0 self-end gap-2 px-3 sm:px-4"
          aria-label="Send message"
        >
          <Send size={17} />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
      <ProductSelector open={productSelectorOpen} selected={selectedProduct} onSelect={setSelectedProduct} onClose={() => setProductSelectorOpen(false)} />
    </form>
  );
}
