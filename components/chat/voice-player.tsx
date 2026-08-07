"use client";

import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const playbackRates = [1, 1.5, 2] as const;

function clock(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function fallbackWaveform(seed: string) {
  let value = 17;
  for (let index = 0; index < seed.length; index += 1) value = (value * 31 + seed.charCodeAt(index)) % 9973;
  return Array.from({ length: 36 }, (_, index) => {
    value = (value * 73 + index * 19) % 9973;
    return 18 + (value % 72);
  });
}

export function VoicePlayer({
  src,
  waveform,
  duration,
  label = "Voice message",
  className
}: {
  src: string;
  waveform?: number[] | null;
  duration?: number | null;
  label?: string;
  className?: string;
}) {
  const instanceId = useId();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [knownDuration, setKnownDuration] = useState(duration || 0);
  const [rate, setRate] = useState<(typeof playbackRates)[number]>(1);
  const peaks = useMemo(
    () => waveform?.length ? waveform.slice(0, 48) : fallbackWaveform(src),
    [src, waveform]
  );
  const progress = knownDuration > 0 ? Math.min(1, currentTime / knownDuration) : 0;

  useEffect(() => {
    const pauseOtherPlayers = (event: Event) => {
      const playingId = (event as CustomEvent<string>).detail;
      if (playingId === instanceId) return;
      audioRef.current?.pause();
    };
    window.addEventListener("hammer:voice-play", pauseOtherPlayers);
    return () => window.removeEventListener("hammer:voice-play", pauseOtherPlayers);
  }, [instanceId]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      window.dispatchEvent(new CustomEvent("hammer:voice-play", { detail: instanceId }));
      await audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || !knownDuration) return;
    audio.currentTime = value * knownDuration;
    setCurrentTime(audio.currentTime);
  }

  function changeRate() {
    const currentIndex = playbackRates.indexOf(rate);
    const next = playbackRates[(currentIndex + 1) % playbackRates.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  return (
    <div className={cn("min-w-0 rounded-2xl border border-current/15 bg-white/10 p-2.5", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setKnownDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : duration || 0)}
      />
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-950/15 transition hover:scale-105 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
          aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        >
          {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="translate-x-px" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase opacity-70">
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate"><Volume2 size={12} /> {label}</span>
            <span className="shrink-0 font-mono normal-case">{clock(currentTime)} / {clock(knownDuration)}</span>
          </div>
          <div className="relative h-8">
            <div className="absolute inset-0 flex items-center gap-[2px]" aria-hidden="true">
              {peaks.map((peak, index) => (
                <span
                  key={`${index}-${peak}`}
                  className={cn("min-w-[2px] flex-1 rounded-full transition-colors", index / peaks.length <= progress ? "bg-red-500" : "bg-current opacity-25")}
                  style={{ height: `${Math.max(16, Math.min(100, peak))}%` }}
                />
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(progress * 1000)}
              onChange={(event) => seek(Number(event.target.value) / 1000)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label={`Seek ${label}`}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={changeRate}
          className="grid h-9 min-w-9 shrink-0 place-items-center rounded-full border border-current/15 px-1.5 font-mono text-[10px] font-black transition hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          aria-label={`Playback speed ${rate} times`}
          title="Change playback speed"
        >
          {rate}x
        </button>
      </div>
      {!playing && currentTime > 0 ? (
        <button type="button" onClick={() => seek(0)} className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase opacity-60 transition hover:opacity-100">
          <RotateCcw size={11} /> Replay
        </button>
      ) : null}
    </div>
  );
}
