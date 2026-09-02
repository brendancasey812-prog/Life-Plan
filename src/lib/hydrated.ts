"use client";

import { useSyncExternalStore } from "react";

/**
 * False during SSR and the first client render, true afterwards. The plan is
 * restored from local storage, so anything that reads it has to wait for this
 * or the markup will not match.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
