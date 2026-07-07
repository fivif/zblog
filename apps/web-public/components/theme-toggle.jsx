"use client";

import { useEffect, useState } from "react";

const MODES = ["system", "light", "dark"];
const LABELS = {
  system: "跟随系统",
  light: "浅色",
  dark: "深色",
};

function resolveTheme(mode) {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function ThemeToggle() {
  const [mode, setMode] = useState("system");

  useEffect(() => {
    const current = document.documentElement.dataset.themeMode || "system";
    setMode(current);
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    function handleSystemChange() {
      const stored = window.localStorage.getItem("blog-theme-mode") || "system";
      if (stored === "system") {
        document.documentElement.dataset.theme = query.matches ? "dark" : "light";
      }
    }
    query.addEventListener?.("change", handleSystemChange);
    return () => query.removeEventListener?.("change", handleSystemChange);
  }, []);

  function cycleTheme() {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    window.localStorage.setItem("blog-theme-mode", next);
    document.documentElement.dataset.themeMode = next;
    document.documentElement.dataset.theme = resolveTheme(next);
    setMode(next);
  }

  return (
    <button type="button" className="theme-toggle" onClick={cycleTheme}>
      {LABELS[mode] || "跟随系统"}
    </button>
  );
}
