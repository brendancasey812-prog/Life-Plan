"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { metaOf, readNote, updateNote } from "@/lib/notes";
import { toggleOutlineItem } from "@/lib/outline";
import { usePlan } from "@/lib/store";
import type { NoteMeta } from "@/lib/types";

/**
 * A page's lines, each with a box, wherever that page is referenced — the
 * Overview cards, the notebook, a bubble's strip, a week's panel. Ticking one
 * writes into the page itself, so every view of it agrees and the editor shows
 * the same tick when it is next opened.
 */
export function OutlineList({
  meta,
  noteKey,
  limit = 5,
  empty,
  size = "base",
  className = "",
}: {
  meta?: NoteMeta;
  noteKey: string | null;
  limit?: number;
  /** Shown when the page has nothing on it; omitted renders nothing. */
  empty?: string;
  size?: "sm" | "base";
  className?: string;
}) {
  const setNoteMeta = usePlan((s) => s.setNoteMeta);
  const [busy, setBusy] = useState(false);

  const items = meta?.outline?.length
    ? meta.outline
    : // A page indexed before the outline existed still has its excerpt.
      meta?.excerpt
      ? [{ text: meta.excerpt, checkable: false }]
      : [];

  // An index written before `checkable` existed has the field missing, not
  // false. Only an explicit false means a line cannot take a box.
  const canCheck = (item: { checkable?: boolean }) => item.checkable !== false;

  async function toggle(index: number, text: string) {
    if (!noteKey || busy) return;
    setBusy(true);
    try {
      const body = await readNote(noteKey);
      const html = body && toggleOutlineItem(body.html, index, text);
      if (!html) return;
      setNoteMeta(noteKey, metaOf(await updateNote(noteKey, { html })));
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return empty ? (
      <p className={`${size === "sm" ? "text-sm" : "text-base"} text-faint ${className}`}>
        {empty}
      </p>
    ) : null;
  }

  const text = size === "sm" ? "text-sm" : "text-base";
  const box = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <ul className={`${size === "sm" ? "space-y-1" : "space-y-1.5"} ${className}`}>
      {items.slice(0, limit).map((item, i) => (
        <li key={i} className={`flex items-start gap-2.5 ${text}`}>
          {canCheck(item) ? (
            <button
              onClick={(e) => {
                // These sit inside cards that are themselves links.
                e.preventDefault();
                e.stopPropagation();
                void toggle(i, item.text);
              }}
              disabled={busy}
              aria-pressed={!!item.done}
              aria-label={`${item.done ? "Untick" : "Tick"} ${item.text}`}
              className={`mt-0.5 flex ${box} shrink-0 items-center justify-center rounded-[5px] border transition ${
                item.done
                  ? "border-transparent bg-done text-white"
                  : "border-edge2 text-transparent hover:border-accent"
              }`}
            >
              <Check size={size === "sm" ? 11 : 12} />
            </button>
          ) : (
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
          )}
          <span
            className={`min-w-0 flex-1 truncate ${item.done ? "text-faint line-through" : "text-muted"}`}
          >
            {item.text}
          </span>
        </li>
      ))}
      {items.length > limit && (
        <li className={`pl-[28px] text-faint ${size === "sm" ? "text-xs" : "text-sm"}`}>
          +{items.length - limit} more
        </li>
      )}
    </ul>
  );
}
