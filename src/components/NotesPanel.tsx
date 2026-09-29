"use client";

import { useState } from "react";
import { ChevronLeft, ImageIcon, Maximize2, NotebookPen } from "lucide-react";
import { NoteEditor } from "./NoteEditor";
import { NoteSheet } from "./NoteSheet";
import type { NoteMeta } from "@/lib/types";

/**
 * The writing panel every screen with a page behind it uses. It sits down the
 * left rather than under the screen, so opening it takes width — of which
 * there is usually some to spare — instead of height, which is what made the
 * bubbles shrink. Closed it is a rail; open it is the page itself, edited in
 * place, with the full sheet and its pictures one button further.
 */
export function NotesPanel({
  noteKey,
  title,
  subtitle,
  placeholder = "Write, paste a screenshot, drop in a picture…",
  meta,
  open,
  onOpenChange,
  hint = "Pick something to write about.",
}: {
  /** Null when the screen has nothing selected to write about yet. */
  noteKey: string | null;
  title: string;
  subtitle?: string;
  placeholder?: string;
  meta?: NoteMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hint?: string;
}) {
  const [sheet, setSheet] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        title={`Notes — ${title}`}
        aria-label={`Open the notes for ${title}`}
        className="flex w-10 shrink-0 flex-col items-center gap-2 border-r border-edge py-3 text-muted transition hover:bg-surface hover:text-fg"
      >
        <NotebookPen size={16} className="shrink-0" />
        <span className="text-xs tracking-wide [writing-mode:vertical-rl]">Notes</span>
        {!!meta && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
      </button>
    );
  }

  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col border-r border-edge bg-surface lg:w-[26rem]">
      <div className="flex shrink-0 items-center gap-2 border-b border-edge px-3 py-2">
        <NotebookPen size={15} className="shrink-0 text-accentink" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          {subtitle && <span className="block truncate text-xs text-faint">{subtitle}</span>}
        </span>
        {!!meta?.images && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-faint">
            <ImageIcon size={13} /> {meta.images}
          </span>
        )}
        {noteKey && (
          <button
            onClick={() => setSheet(true)}
            aria-label="Open the full page"
            title="Open the full page, with pictures"
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <Maximize2 size={15} />
          </button>
        )}
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close the notes"
          className="rounded-lg p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {noteKey ? (
        <NoteEditor noteKey={noteKey} placeholder={placeholder} />
      ) : (
        <p className="px-4 py-5 text-sm text-faint">{hint}</p>
      )}

      {noteKey && sheet && (
        <NoteSheet
          noteKey={noteKey}
          title={title}
          subtitle={subtitle}
          placeholder={placeholder}
          onClose={() => setSheet(false)}
        />
      )}
    </aside>
  );
}
