"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Trash2, X } from "lucide-react";
import { NoteEditor } from "./NoteEditor";
import { NoteGallery } from "./NoteGallery";

/**
 * A note page opened over whatever you were looking at — a bubble, a week or
 * a page from the notebook.
 */
export function NoteSheet({
  noteKey,
  title,
  subtitle,
  placeholder = "Write, paste a screenshot, drop in a picture…",
  onRename,
  onDelete,
  onClose,
}: {
  noteKey: string;
  title: string;
  subtitle?: string;
  placeholder?: string;
  /** Given for pages whose title is the user's to change. */
  onRename?: (title: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-scrim backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col border-x border-edge bg-sheet shadow-2xl">
        <header className="flex shrink-0 items-start gap-3 border-b border-edge px-5 py-3.5 sm:px-8">
          <div className="min-w-0 flex-1">
            {onRename ? (
              <input
                value={title}
                onChange={(e) => onRename(e.target.value)}
                aria-label="Page title"
                className="w-full truncate bg-transparent text-lg font-semibold tracking-tight outline-none placeholder:text-faint"
                placeholder="Untitled page"
              />
            ) : (
              <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
            )}
            {subtitle && <p className="truncate text-xs text-faint">{subtitle}</p>}
          </div>

          {onDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete this page"
              className="rounded-lg p-2 text-faint transition hover:bg-dangersoft hover:text-dangerink"
            >
              <Trash2 size={17} />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close notes"
            className="rounded-lg p-2 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <NoteEditor noteKey={noteKey} placeholder={placeholder} />

          {/* The same picture boxes the goal tabs show, on the same page. */}
          <aside className="shrink-0 overflow-y-auto border-t border-edge px-5 py-4 sm:px-8 lg:w-72 lg:border-t-0 lg:border-l lg:px-5">
            <h3 className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-muted uppercase">
              <ImageIcon size={13} className="text-accentink" /> Pictures
            </h3>
            <NoteGallery noteKey={noteKey} cols={1} className="mt-3" />
          </aside>
        </div>

        {confirmDelete && onDelete && (
          <div className="absolute inset-x-0 bottom-6 mx-auto w-[min(26rem,90%)] rounded-xl border border-edge bg-sheet p-4 shadow-2xl">
            <p className="text-sm text-fg">Delete this page and everything on it?</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-edge px-3 py-1.5 text-sm transition hover:bg-surface2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
