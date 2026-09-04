"use client";

import { useRef, useState } from "react";
import { Check, GripVertical, LayoutGrid, Plus, RotateCcw, Trash2 } from "lucide-react";
import { usePlan } from "@/lib/store";
import type { Widget, WidgetKind } from "@/lib/types";
import { WIDGETS, WidgetBody } from "./widgets";

const SPANS: Record<1 | 2 | 3, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
};

/** The entry tab: a board of cards you arrange yourself. */
export function Dashboard() {
  const widgets = usePlan((s) => s.widgets);
  const addWidget = usePlan((s) => s.addWidget);
  const removeWidget = usePlan((s) => s.removeWidget);
  const resizeWidget = usePlan((s) => s.resizeWidget);
  const moveWidget = usePlan((s) => s.moveWidget);
  const resetWidgets = usePlan((s) => s.resetWidgets);

  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const dragged = useRef<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <header className="mb-4 flex items-center gap-3">
          <h1 className="flex-1 text-lg font-semibold tracking-tight">My Life</h1>
          {editing && (
            <button
              onClick={resetWidgets}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted transition hover:bg-surface2 hover:text-fg"
            >
              <RotateCcw size={13} /> Reset layout
            </button>
          )}
          <button
            onClick={() => {
              setEditing((v) => !v);
              setAdding(false);
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition ${
              editing
                ? "border-transparent bg-accent text-white hover:brightness-110"
                : "border-edge bg-surface pane text-muted hover:bg-surface2 hover:text-fg"
            }`}
          >
            {editing ? <Check size={15} /> : <LayoutGrid size={15} />}
            {editing ? "Done" : "Customise"}
          </button>
        </header>

        {editing && (
          <div className="mb-4 rounded-2xl border border-edge bg-surface pane p-3">
            <button
              onClick={() => setAdding((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-accentink"
            >
              <Plus size={15} /> Add a widget
            </button>
            {adding && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(WIDGETS) as WidgetKind[]).map((kind) => {
                  const { label, hint, icon: Icon } = WIDGETS[kind];
                  return (
                    <li key={kind}>
                      <button
                        onClick={() => {
                          addWidget(kind);
                          setAdding(false);
                        }}
                        className="flex w-full items-start gap-2.5 rounded-xl border border-edge bg-surface2 p-3 text-left transition hover:border-edge2"
                      >
                        <Icon size={15} className="mt-0.5 shrink-0 text-accentink" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{label}</span>
                          <span className="block text-xs text-faint">{hint}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-faint">
              Drag a card to reorder it, or use the size buttons. The same widget can appear more
              than once.
            </p>
          </div>
        )}

        {widgets.length === 0 ? (
          <p className="py-20 text-center text-sm text-faint">
            No widgets. Hit <span className="text-muted">Customise</span> to add some.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {widgets.map((w) => (
              <li
                key={w.id}
                className={`${SPANS[w.span]} ${over === w.id ? "opacity-60" : ""}`}
                draggable={editing}
                onDragStart={(e) => {
                  dragged.current = w.id;
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  dragged.current = null;
                  setOver(null);
                }}
                onDragOver={(e) => {
                  if (!editing || !dragged.current || dragged.current === w.id) return;
                  e.preventDefault();
                  setOver(w.id);
                }}
                onDragLeave={() => setOver((id) => (id === w.id ? null : id))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragged.current) moveWidget(dragged.current, w.id);
                  dragged.current = null;
                  setOver(null);
                }}
              >
                <WidgetCard
                  widget={w}
                  editing={editing}
                  onRemove={() => removeWidget(w.id)}
                  onResize={(span) => resizeWidget(w.id, span)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function WidgetCard({
  widget,
  editing,
  onRemove,
  onResize,
}: {
  widget: Widget;
  editing: boolean;
  onRemove: () => void;
  onResize: (span: 1 | 2 | 3) => void;
}) {
  const { label } = WIDGETS[widget.kind];
  return (
    <div
      className={`relative h-full min-h-[8.5rem] rounded-2xl border border-edge bg-surface pane p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_28px_-20px_rgb(0_0_0/0.35)] transition sm:p-5 ${
        editing ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      {/* Pointer events are off in edit mode so a drag never fires a link. */}
      <div className={editing ? "pointer-events-none" : undefined}>
        <WidgetBody kind={widget.kind} />
      </div>

      {editing && (
        <div className="absolute inset-x-0 -top-3 flex items-center justify-center gap-1">
          <span className="flex items-center gap-1 rounded-full border border-edge bg-sheet px-2 py-1 text-[11px] text-faint shadow-sm">
            <GripVertical size={12} /> {label}
          </span>
          <span className="flex items-center gap-0.5 rounded-full border border-edge bg-sheet p-0.5 shadow-sm">
            {([1, 2, 3] as const).map((span) => (
              <button
                key={span}
                onClick={() => onResize(span)}
                aria-label={`${span} column${span > 1 ? "s" : ""}`}
                aria-pressed={widget.span === span}
                className={`h-6 w-6 rounded-full text-[11px] transition ${
                  widget.span === span
                    ? "bg-accentsoft font-medium text-accentink"
                    : "text-faint hover:bg-surface2 hover:text-fg"
                }`}
              >
                {span}
              </button>
            ))}
            <button
              onClick={onRemove}
              aria-label={`Remove ${label}`}
              className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full text-faint transition hover:bg-dangersoft hover:text-dangerink"
            >
              <Trash2 size={12} />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
