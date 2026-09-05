"use client";

import { useEffect, useRef } from "react";

/**
 * Clicking the tab you are already on should take that screen back to its
 * home — out of a bubble you drilled into, out of a search, back to today.
 * Navigating to the route you are on is a no-op, so the header announces the
 * click here and each screen decides what its own home means.
 */
const listeners = new Set<(path: string) => void>();

/** Routes arrive with a trailing slash from the router but not from `href`. */
function normalise(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

export function goHome(path: string): void {
  const at = normalise(path);
  for (const listener of listeners) listener(at);
}

export function useGoHome(path: string, onHome: () => void): void {
  // Kept in a ref so a fresh callback each render does not resubscribe.
  const latest = useRef(onHome);
  useEffect(() => {
    latest.current = onHome;
  });

  useEffect(() => {
    const at = normalise(path);
    const listener = (fired: string) => {
      if (fired === at) latest.current();
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [path]);
}
