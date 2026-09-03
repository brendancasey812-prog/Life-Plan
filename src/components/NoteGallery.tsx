"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { imageFilesFrom, toStoredImage } from "@/lib/image";
import { EMPTY_NOTE, metaOf, readNote, updateNote } from "@/lib/notes";
import { usePlan } from "@/lib/store";

/**
 * The picture boxes on a page. They hang off the same page as the writing, so
 * a photo pinned here shows up wherever that page is opened.
 */
export function NoteGallery({
  noteKey,
  cols = 2,
  className = "",
}: {
  noteKey: string;
  /** 1 in a narrow rail, 2 in a full column. */
  cols?: 1 | 2;
  className?: string;
}) {
  const setNoteMeta = usePlan((s) => s.setNoteMeta);
  const [state, setState] = useState<{ key: string; pictures: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    readNote(noteKey)
      .then((body) => live && setState({ key: noteKey, pictures: (body ?? EMPTY_NOTE).gallery }))
      .catch(() => live && setState({ key: noteKey, pictures: [] }));
    return () => {
      live = false;
    };
  }, [noteKey]);

  const commit = useCallback(
    async (pictures: string[]) => {
      setState({ key: noteKey, pictures });
      const body = await updateNote(noteKey, { gallery: pictures });
      setNoteMeta(noteKey, metaOf(body));
    },
    [noteKey, setNoteMeta],
  );

  const add = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setBusy(true);
      try {
        const added: string[] = [];
        for (const file of files) {
          try {
            added.push(await toStoredImage(file));
          } catch {
            // A file the browser cannot decode is simply skipped.
          }
        }
        const current = (await readNote(noteKey))?.gallery ?? [];
        if (added.length) await commit([...current, ...added]);
      } finally {
        setBusy(false);
      }
    },
    [commit, noteKey],
  );

  const pictures = state?.key === noteKey ? state.pictures : null;

  if (!pictures) {
    return (
      <div className={`flex items-center justify-center py-10 text-faint ${className}`}>
        <Loader2 className="animate-spin" size={16} />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={`grid gap-3 ${cols === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {pictures.map((src, i) => (
          <figure
            key={`${i}-${src.slice(24, 40)}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-edge bg-surface"
          >
            {/* Pictures are user files with no meaningful alt text to give. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => void commit(pictures.filter((_, k) => k !== i))}
              aria-label={`Remove picture ${i + 1}`}
              className="absolute top-1.5 right-1.5 rounded-full bg-scrim p-1.5 text-muted opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-danger hover:text-white"
            >
              <X size={13} />
            </button>
          </figure>
        ))}

        <button
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void add(imageFilesFrom(e.dataTransfer));
          }}
          onPaste={(e) => void add(imageFilesFrom(e.clipboardData))}
          className={`flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-xs transition ${
            dragging
              ? "border-accent bg-accentsoft text-accentink"
              : "border-edge2 text-faint hover:border-edge2 hover:text-muted"
          }`}
        >
          {busy ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <ImagePlus size={20} />
              <span>Add a picture</span>
              <span className="text-[11px] text-faint">click, drop or paste</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void add([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
