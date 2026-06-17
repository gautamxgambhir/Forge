"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") return getSystemTheme();
  return mode;
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("forge-theme") as ThemeMode | null;
    if (saved === "dark" || saved === "light" || saved === "system") {
      setMode(saved);
    }
  }, []);

  // Apply data-theme attribute + listen for system changes
  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(mode);
      document.documentElement.setAttribute("data-theme", resolved);
    };

    apply();

    // Listen for OS preference changes when in system mode
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => { if (mode === "system") apply(); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setTheme = (next: ThemeMode) => {
    setMode(next);
    localStorage.setItem("forge-theme", next);
  };

  const resolved = resolveTheme(mode);

  return { mode, resolved, setTheme };
}
