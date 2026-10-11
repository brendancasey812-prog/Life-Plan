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
  const [expanded, setExpanded] = useState(false);

  const items = meta?.outline?.length
    ? meta.outline
    : // A page indexed before the outline existed still has its excerpt.
      meta?.excerpt
      ? [{ text: meta.excerpt, checkable: false }]
      : [];

  // An index written before `checkable` existed has the field missing, not
  // false. Only an explicit false means a line cannot take a box.
  const canCheck = (item: { checkable?: boolean }) => item.checkable !== false;

  // A page laid out under headings carries every heading, written under or
  // not. A card is a summary, so a heading with nothing under it yet is left
  // off — the page itself still has it. Each line keeps the place it holds on
  // the page, since that is what ticking it writes to.
  const shown = items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item, index }) => canCheck(item) || canCheck(items[index + 1] ?? { checkable: false }),
    );

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

  if (shown.length === 0) {
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
      {(expanded ? shown : shown.slice(0, limit)).map(({ item, index }) => (
        <li
          key={index}
          className={
            canCheck(item)
              ? `flex items-start gap-2.5 ${text}`
              : // A heading, which the goal pages are laid out under: it names
                // the lines beneath it rather than sitting among them.
                "pt-2 first:pt-0"
          }
        >
          {!canCheck(item) ? (
            <span
              className={`block font-semibold tracking-[0.1em] text-faint uppercase ${
                size === "sm" ? "text-[10px]" : "text-[11px]"
              }`}
            >
              {item.text}
            </span>
          ) : (
            <button
              onClick={(e) => {
                // These sit inside cards that are themselves links.
                e.preventDefault();
                e.stopPropagation();
                void toggle(index, item.text);
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
          )}
          {canCheck(item) && (
            <span
              className={`min-w-0 flex-1 ${expanded ? "break-words" : "truncate"} ${
                item.done ? "text-faint line-through" : "text-muted"
              }`}
            >
              {item.text}
            </span>
          )}
        </li>
      ))}
      {shown.length > limit && (
        <li className={`pl-[28px] ${size === "sm" ? "text-xs" : "text-sm"}`}>
          {/* These sit inside cards that are themselves links. */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="text-faint transition hover:text-fg"
          >
            {expanded ? "Show less" : `+${shown.length - limit} more`}
          </button>
        </li>
      )}
    </ul>
  );
}
