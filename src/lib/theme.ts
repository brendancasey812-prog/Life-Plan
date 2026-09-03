"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

/**
 * The theme is a property of this device, not of the plan — so it lives in its
 * own key rather than in the plan store. That also lets the tiny script in the
 * layout read it before the first paint, which is what stops the page flashing
 * the wrong colours on load.
 */
export const THEME_KEY = "life-plan-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function stored(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return isTheme(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

/**
 * Records the choice on <html>. Neither class means "follow the device",
 * which the stylesheet already does on its own — so `system` is the absence
 * of a class rather than a computed value.
 */
export function applyTheme(theme: Theme, animate = false): void {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-shift");
    window.setTimeout(() => root.classList.remove("theme-shift"), 320);
  }
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
}

let current: Theme | null = null;
const listeners = new Set<() => void>();

function snapshot(): Theme {
  current ??= stored();
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: Theme): void {
  current = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // A browser with storage blocked still themes for this session.
  }
  applyTheme(theme, true);
  for (const listener of listeners) listener();
}

export function useTheme(): Theme {
  // The server has no device to ask, so it renders the neutral choice.
  return useSyncExternalStore(subscribe, snapshot, () => "system" as Theme);
}
