"use client";

import { Moon, Sun } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const storageKey = "hammer-store-theme";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.storeTheme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function CustomerThemeToggle() {
  const reduceMotion = useReducedMotion();
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey);
    const nextDark = storedTheme === "dark";
    applyTheme(nextDark);
    setDark(nextDark);
    setReady(true);

    const syncTheme = (event: Event) => {
      const theme = (event as CustomEvent<{ theme?: "dark" | "light" }>).detail?.theme;
      const syncedDark = theme ? theme === "dark" : document.documentElement.classList.contains("dark");
      setDark(syncedDark);
    };
    const syncStoredTheme = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const syncedDark = event.newValue === "dark";
      applyTheme(syncedDark);
      setDark(syncedDark);
    };
    window.addEventListener("hammer:store-theme", syncTheme);
    window.addEventListener("storage", syncStoredTheme);
    return () => {
      window.removeEventListener("hammer:store-theme", syncTheme);
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    applyTheme(nextDark);
    window.localStorage.setItem(storageKey, nextDark ? "dark" : "light");
    setDark(nextDark);
    window.dispatchEvent(new CustomEvent("hammer:store-theme", { detail: { theme: nextDark ? "dark" : "light" } }));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="store-theme-toggle grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-200 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:bg-slate-800 dark:text-slate-100"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      title={dark ? "Light theme" : "Dark theme"}
    >
      <motion.span
        className="grid place-items-center"
        initial={false}
        animate={{ rotate: ready && dark ? 180 : 0, scale: ready ? 1 : 0.9 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </motion.span>
    </button>
  );
}
