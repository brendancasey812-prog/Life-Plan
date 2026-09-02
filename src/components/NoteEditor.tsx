"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import {
  Bold,
  Check,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { imageFilesFrom, toStoredImage } from "@/lib/image";
import { EMPTY_NOTE, excerptOf, isEmptyNote, readNote, writeNote } from "@/lib/notes";
import { usePlan } from "@/lib/store";
import type { NoteBody } from "@/lib/types";

/** How long to wait after the last keystroke before writing the page. */
const SAVE_DELAY = 700;

/** Adds a width to the stock image node, so pictures can be sized in place. */
const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.style.width || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.width ? { style: `width:${attrs.width}` } : {},
      },
    };
  },
});

type SaveState = "idle" | "saving" | "saved";

export function NoteEditor({ noteKey, placeholder }: { noteKey: string; placeholder: string }) {
  const setNoteMeta = usePlan((s) => s.setNoteMeta);
  const [loaded, setLoaded] = useState<{ key: string; body: NoteBody } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [imageSelected, setImageSelected] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    readNote(noteKey)
      .then((body) => live && setLoaded({ key: noteKey, body: body ?? EMPTY_NOTE }))
      .catch(() => live && setLoaded({ key: noteKey, body: EMPTY_NOTE }));
    return () => {
      live = false;
    };
  }, [noteKey]);

  // Keying off the note means switching pages shows the spinner again rather
  // than a flash of the previous page's content.
  const body = loaded?.key === noteKey ? loaded.body : null;

  if (!body) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }

  return (
    <Surface
      // Remount on a different page so the editor starts from that page's
      // content rather than being fed into an existing document.
      key={noteKey}
      noteKey={noteKey}
      initial={body}
      placeholder={placeholder}
      setNoteMeta={setNoteMeta}
      saveState={saveState}
      setSaveState={setSaveState}
      imageSelected={imageSelected}
      setImageSelected={setImageSelected}
      fileRef={fileRef}
    />
  );
}

function Surface({
  noteKey,
  initial,
  placeholder,
  setNoteMeta,
  saveState,
  setSaveState,
  imageSelected,
  setImageSelected,
  fileRef,
}: {
  noteKey: string;
  initial: NoteBody;
  placeholder: string;
  setNoteMeta: ReturnType<typeof usePlan.getState>["setNoteMeta"];
  saveState: SaveState;
  setSaveState: (s: SaveState) => void;
  imageSelected: boolean;
  setImageSelected: (v: boolean) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const editorRef = useRef<Editor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (editor: Editor) => {
      let images = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "image") images++;
      });
      const body: NoteBody = {
        html: editor.getHTML(),
        text: editor.getText(),
        images,
        updatedAt: Date.now(),
      };
      const empty = isEmptyNote(body);
      setNoteMeta(
        noteKey,
        empty ? null : { excerpt: excerptOf(body.text), images, updatedAt: body.updatedAt },
      );
      void writeNote(noteKey, body)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("idle"));
    },
    [noteKey, setNoteMeta, setSaveState],
  );

  const insertImages = useCallback(async (files: File[]) => {
    for (const file of files) {
      try {
        const src = await toStoredImage(file);
        editorRef.current?.chain().focus().setImage({ src }).run();
      } catch {
        // A file the browser cannot decode is simply skipped.
      }
    }
  }, []);

  const editor = useEditor({
    // Next renders this page on the server first; the editor is client-only.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      SizedImage.configure({ allowBase64: true }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: initial.html,
    editorProps: {
      attributes: { class: "note-body outline-none" },
      handlePaste: (_view, event) => {
        const files = imageFilesFrom(event.clipboardData);
        if (!files.length) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = imageFilesFrom((event as DragEvent).dataTransfer);
        if (!files.length) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => save(ed), SAVE_DELAY);
    },
    onSelectionUpdate: ({ editor: ed }) => setImageSelected(ed.isActive("image")),
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Leaving the page mid-edit must not drop the last few keystrokes.
  useEffect(() => {
    return () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      if (editorRef.current) save(editorRef.current);
    };
  }, [save]);

  if (!editor) return null;

  const setWidth = (width: string | null) =>
    editor.chain().focus().updateAttributes("image", { width }).run();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.07] px-3 py-2">
        <Tool
          on={editor.isActive("bold")}
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </Tool>
        <Tool
          on={editor.isActive("italic")}
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </Tool>
        <Tool
          on={editor.isActive("underline")}
          label="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </Tool>
        <Tool
          on={editor.isActive("strike")}
          label="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={15} />
        </Tool>
        <Tool
          on={editor.isActive("highlight")}
          label="Highlight"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter size={15} />
        </Tool>

        <Divider />

        <Tool
          on={editor.isActive("heading", { level: 1 })}
          label="Heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={15} />
        </Tool>
        <Tool
          on={editor.isActive("heading", { level: 2 })}
          label="Subheading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={15} />
        </Tool>

        <Divider />

        <Tool
          on={editor.isActive("bulletList")}
          label="Bulleted list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </Tool>
        <Tool
          on={editor.isActive("orderedList")}
          label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </Tool>
        <Tool
          on={editor.isActive("taskList")}
          label="Checklist"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <CheckSquare size={15} />
        </Tool>
        <Tool
          on={editor.isActive("blockquote")}
          label="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </Tool>
        <Tool
          on={editor.isActive("codeBlock")}
          label="Code"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code size={15} />
        </Tool>
        <Tool label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={15} />
        </Tool>

        <Divider />

        <Tool
          on={editor.isActive("link")}
          label="Link"
          onClick={() => {
            const previous = editor.getAttributes("link").href as string | undefined;
            const href = window.prompt("Link address", previous ?? "https://");
            if (href === null) return;
            if (!href.trim()) editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: href.trim() }).run();
          }}
        >
          <Link2 size={15} />
        </Tool>
        <Tool label="Add a picture" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={15} />
        </Tool>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void insertImages([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />

        <Divider />

        <Tool label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </Tool>
        <Tool label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </Tool>

        {imageSelected && (
          <>
            <Divider />
            <span className="pl-1 text-xs text-zinc-500">Picture</span>
            <Tool label="Small picture" onClick={() => setWidth("40%")}>
              <span className="text-xs">S</span>
            </Tool>
            <Tool label="Medium picture" onClick={() => setWidth("70%")}>
              <span className="text-xs">M</span>
            </Tool>
            <Tool label="Full-width picture" onClick={() => setWidth(null)}>
              <Maximize2 size={14} />
            </Tool>
            <Tool
              label="Remove picture"
              onClick={() => editor.chain().focus().deleteSelection().run()}
            >
              <Trash2 size={14} />
            </Tool>
          </>
        )}

        <span className="ml-auto flex items-center gap-1.5 pl-2 text-xs text-zinc-500">
          {saveState === "saving" && <Loader2 className="animate-spin" size={13} />}
          {saveState === "saved" && <Check size={13} />}
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
        </span>
      </div>

      <div
        className="min-h-0 flex-1 cursor-text overflow-y-auto px-5 py-5 sm:px-8"
        onClick={(e) => {
          // Clicking the empty space below the text should put the caret at
          // the end, the way a page of paper behaves.
          if (e.target === e.currentTarget) editor.chain().focus("end").run();
        }}
      >
        <EditorContent editor={editor} className="mx-auto max-w-3xl" />
      </div>
    </div>
  );
}

function Tool({
  on,
  label,
  onClick,
  children,
}: {
  on?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      // Without this the button takes focus on press and the editor loses its
      // selection, so the next thing typed lands nowhere.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 transition ${
        on ? "bg-indigo-500/25 text-indigo-200" : "text-zinc-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" />;
}
