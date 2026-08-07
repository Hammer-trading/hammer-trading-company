"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaControls() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    setPromptEvent(null);
  }

  if (!promptEvent || installed) return null;

  return (
    <button
      type="button"
      onClick={() => void install()}
      className="fixed bottom-24 left-4 z-40 hidden min-h-11 items-center gap-2 rounded-full border border-white/70 bg-white/[0.92] px-4 text-sm font-black text-slate-950 shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:border-red-200 sm:inline-flex"
      aria-label="Install Hammer Trading Company app"
    >
      <Download size={17} /> Install app
    </button>
  );
}
