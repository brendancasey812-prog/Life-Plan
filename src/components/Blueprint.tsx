"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Printer, Ruler, Trash2, X } from "lucide-react";
import { MATERIALS, legendOf, materialOf, num, snap } from "@/lib/blueprint";
import { usePlan } from "@/lib/store";
import type { Blueprint } from "@/lib/types";

/** Units of clear space around the drawing, for the dimension lines. */
const MARGIN = 7;

/**
 * The drawing itself: graph paper, the parts to scale, and the dimensions
 * called out the way a plan calls them out. Everything is in the page's own
 * units and the SVG does the scaling, so the same drawing is right on a phone
 * and on a sheet of paper.
 */
export function Drawing({
  bp,
  selected,
  onSelect,
  onMove,
  interactive = true,
}: {
  bp: Blueprint;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  interactive?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const fs = Math.max(bp.width, bp.height) / 46;

  /** Pointer position in the drawing's own units. */
  const at = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${-MARGIN} ${-MARGIN} ${bp.width + MARGIN * 2} ${bp.height + MARGIN * 2}`}
      className="h-full w-full touch-none select-none"
      onPointerMove={(e) => {
        if (!drag.current || !onMove) return;
        const p = at(e);
        if (!p) return;
        onMove(
          drag.current.id,
          snap(p.x - drag.current.dx, bp.grid),
          snap(p.y - drag.current.dy, bp.grid),
        );
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      <defs>
        <pattern id="bp-grid" width={bp.grid} height={bp.grid} patternUnits="userSpaceOnUse">
          <path
            d={`M ${bp.grid} 0 L 0 0 0 ${bp.grid}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.06}
            className="text-fg/15"
          />
        </pattern>
        <pattern
          id="bp-grid-5"
          width={bp.grid * 5}
          height={bp.grid * 5}
          patternUnits="userSpaceOnUse"
        >
          <rect width={bp.grid * 5} height={bp.grid * 5} fill="url(#bp-grid)" />
          <path
            d={`M ${bp.grid * 5} 0 L 0 0 0 ${bp.grid * 5}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.14}
            className="text-fg/30"
          />
        </pattern>
      </defs>

      {/* The sheet. */}
      <rect
        x={0}
        y={0}
        width={bp.width}
        height={bp.height}
        className="fill-surface"
        stroke="currentColor"
        strokeWidth={0.12}
      />
      <rect x={0} y={0} width={bp.width} height={bp.height} fill="url(#bp-grid-5)" />

      {bp.parts.map((part) => {
        const m = materialOf(part.material);
        const on = selected === part.id;
        return (
          <g
            key={part.id}
            onPointerDown={(e) => {
              if (!interactive) return;
              onSelect?.(part.id);
              const p = at(e);
              if (!p) return;
              drag.current = { id: part.id, dx: p.x - part.x, dy: p.y - part.y };
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
            className={interactive ? "cursor-move" : undefined}
          >
            <rect
              x={part.x}
              y={part.y}
              width={part.w}
              height={part.h}
              fill={m.fill}
              stroke={on ? "currentColor" : m.stroke}
              strokeWidth={on ? 0.3 : 0.16}
              className={on ? "text-accent" : undefined}
              rx={0.2}
            />
            {part.w > fs * 3 && part.h > fs * 1.6 && (
              <text
                x={part.x + part.w / 2}
                y={part.y + part.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fs * 0.82}
                className="fill-fg/80"
              >
                {part.label}
              </text>
            )}
          </g>
        );
      })}

      {/* The dimensions of the piece itself, across the top and down the side. */}
      <Dimension
        from={{ x: 0, y: -MARGIN * 0.45 }}
        to={{ x: bp.width, y: -MARGIN * 0.45 }}
        label={`${num(bp.width)} ${bp.unit}`}
        fs={fs}
      />
      <Dimension
        from={{ x: -MARGIN * 0.45, y: 0 }}
        to={{ x: -MARGIN * 0.45, y: bp.height }}
        label={`${num(bp.height)} ${bp.unit}`}
        fs={fs}
        vertical
      />

      {/* The selected part, called out where it sits. */}
      {bp.parts
        .filter((p) => p.id === selected)
        .map((part) => (
          <g key={`${part.id}-dim`} className="text-accent">
            <Dimension
              from={{ x: part.x, y: part.y + part.h + fs * 1.1 }}
              to={{ x: part.x + part.w, y: part.y + part.h + fs * 1.1 }}
              label={`${num(part.w)} × ${num(part.h)}`}
              fs={fs}
              accent
            />
          </g>
        ))}
    </svg>
  );
}

/** One dimension line: ticks at the ends, the measurement over the middle. */
function Dimension({
  from,
  to,
  label,
  fs,
  vertical = false,
  accent = false,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
  fs: number;
  vertical?: boolean;
  accent?: boolean;
}) {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const tick = fs * 0.5;
  return (
    <g stroke="currentColor" strokeWidth={0.1} className={accent ? "text-accent" : "text-fg/55"}>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
      {[from, to].map((end, i) => (
        <line
          key={i}
          x1={end.x - (vertical ? tick : 0)}
          y1={end.y - (vertical ? 0 : tick)}
          x2={end.x + (vertical ? tick : 0)}
          y2={end.y + (vertical ? 0 : tick)}
        />
      ))}
      <text
        x={mid.x}
        y={mid.y - (vertical ? 0 : fs * 0.55)}
        textAnchor="middle"
        dominantBaseline={vertical ? "central" : "auto"}
        fontSize={fs * 0.8}
        stroke="none"
        className={accent ? "fill-accent" : "fill-fg/70"}
        transform={vertical ? `rotate(-90 ${mid.x} ${mid.y})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

/** The drawing at card size, for the panel that offers to open it. */
export function BlueprintThumb({ bp }: { bp: Blueprint }) {
  return (
    <div className="aspect-[3/2] w-full overflow-hidden rounded-xl border border-edge bg-surface2 p-2">
      <Drawing bp={bp} interactive={false} />
    </div>
  );
}

/**
 * The grid page, open: the drawing, what it is made of, and the figures behind
 * both. Parts are dragged on the paper or typed in the table, and the legend
 * is read off the materials rather than kept by hand.
 */
export function BlueprintSheet({ noteKey, onClose }: { noteKey: string; onClose: () => void }) {
  const bp = usePlan((s) => s.blueprints[noteKey]);
  const setBlueprint = usePlan((s) => s.setBlueprint);
  const addPart = usePlan((s) => s.addPart);
  const updatePart = usePlan((s) => s.updatePart);
  const deletePart = usePlan((s) => s.deletePart);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const legend = useMemo(() => (bp ? legendOf(bp) : []), [bp]);
  if (!bp) return null;

  const set = (patch: Partial<Blueprint>) => setBlueprint(noteKey, { ...bp, ...patch });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-scrim backdrop-blur-sm">
      <div className="pane mx-auto flex h-full w-full max-w-6xl flex-col border-x border-edge bg-sheet shadow-2xl">
        <header className="flex shrink-0 items-start gap-3 border-b border-edge px-5 py-3.5 sm:px-8">
          <div className="min-w-0 flex-1">
            <input
              value={bp.title}
              onChange={(e) => set({ title: e.target.value })}
              aria-label="Plan title"
              className="w-full truncate bg-transparent text-lg font-semibold tracking-tight outline-none"
            />
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
              <span className="flex items-center gap-1">
                <Ruler size={12} /> Sheet
              </span>
              <Figure label="W" value={bp.width} onChange={(width) => set({ width })} />
              <Figure label="D" value={bp.height} onChange={(height) => set({ height })} />
              <Figure label="Grid" value={bp.grid} onChange={(grid) => set({ grid: grid || 1 })} />
              <select
                value={bp.unit}
                onChange={(e) => set({ unit: e.target.value as Blueprint["unit"] })}
                aria-label="Units"
                className="rounded border border-edge bg-surface2 px-1 py-0.5 text-xs outline-none"
              >
                <option value="in">inches</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
              </select>
            </p>
          </div>
          <button
            onClick={() => window.print()}
            aria-label="Print the plan"
            title="Print"
            className="rounded-lg p-2 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <Printer size={17} />
          </button>
          <button
            onClick={onClose}
            aria-label="Close the plan"
            className="rounded-lg p-2 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-[14rem] flex-1 p-3 sm:p-5">
              <Drawing
                bp={bp}
                selected={selected}
                onSelect={setSelected}
                onMove={(id, x, y) => updatePart(noteKey, id, { x, y })}
              />
            </div>

            {/* The figures behind the drawing. */}
            <div className="max-h-[42%] shrink-0 overflow-auto border-t border-edge">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead className="sticky top-0 bg-sheet">
                  <tr className="border-b border-edge text-left text-xs tracking-wide text-faint uppercase">
                    <th className="px-3 py-2 font-medium">Part</th>
                    <th className="px-2 py-2 font-medium">Material</th>
                    <th className="px-2 py-2 text-right font-medium">X</th>
                    <th className="px-2 py-2 text-right font-medium">Y</th>
                    <th className="px-2 py-2 text-right font-medium">W</th>
                    <th className="px-2 py-2 text-right font-medium">D</th>
                    <th className="px-2 py-2 text-right font-medium">Thk</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {bp.parts.map((part) => (
                    <tr
                      key={part.id}
                      onFocus={() => setSelected(part.id)}
                      className={`border-b border-edge/60 last:border-0 ${
                        selected === part.id ? "bg-accentsoft/50" : ""
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        <Text
                          value={part.label}
                          onChange={(label) => updatePart(noteKey, part.id, { label })}
                          label="Part"
                          width="w-44"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          list="bp-materials"
                          value={part.material}
                          onChange={(e) =>
                            updatePart(noteKey, part.id, { material: e.target.value })
                          }
                          aria-label="Material"
                          className="w-32 rounded-lg border border-edge bg-surface2 px-2 py-1 outline-none focus:border-accent"
                        />
                      </td>
                      {(["x", "y", "w", "h", "thickness"] as const).map((field) => (
                        <td key={field} className="px-2 py-1.5 text-right">
                          <Num
                            value={part[field]}
                            onChange={(v) => updatePart(noteKey, part.id, { [field]: v })}
                            label={field}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={() => deletePart(noteKey, part.id)}
                          aria-label={`Delete ${part.label}`}
                          className="rounded-lg p-1.5 text-faint transition hover:bg-dangersoft hover:text-dangerink"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="bp-materials">
                {MATERIALS.map((m) => (
                  <option key={m.name} value={m.name} />
                ))}
              </datalist>

              <button
                onClick={() =>
                  addPart(noteKey, {
                    x: snap(bp.width / 3, bp.grid),
                    y: snap(bp.height / 3, bp.grid),
                  })
                }
                className="m-3 flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-1.5 text-sm text-muted transition hover:bg-surface2 hover:text-fg"
              >
                <Plus size={15} /> Add a part
              </button>
            </div>
          </div>

          {/* What it is made of, and anything worth saying about it. */}
          <aside className="shrink-0 overflow-y-auto border-t border-edge px-5 py-4 sm:px-6 lg:w-72 lg:border-t-0 lg:border-l">
            <h3 className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Legend</h3>
            {legend.length === 0 ? (
              <p className="mt-2 text-sm text-faint">Add a part and it lists itself here.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {legend.map((group) => (
                  <li key={group.material}>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0 rounded-[3px]"
                        style={{
                          background: group.colour.fill,
                          boxShadow: `inset 0 0 0 1px ${group.colour.stroke}`,
                        }}
                      />
                      {group.material}
                      <span className="ml-auto text-xs text-faint">{group.parts.length}</span>
                    </span>
                    <ul className="mt-1 space-y-0.5 pl-5.5 text-xs text-muted">
                      {group.parts.map((part) => (
                        <li key={part.id} className="flex justify-between gap-2">
                          <span className="truncate">{part.label}</span>
                          <span className="shrink-0 text-faint tabular-nums">
                            {num(part.w)} × {num(part.h)}
                            {part.thickness ? ` × ${num(part.thickness)}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-5 text-xs font-medium tracking-[0.14em] text-muted uppercase">
              Notes
            </h3>
            <textarea
              value={bp.notes}
              onChange={(e) => set({ notes: e.target.value })}
              rows={6}
              placeholder="Joinery, finish, glass thickness, anything the drawing does not say…"
              className="mt-2 w-full resize-y rounded-xl border border-edge bg-surface2 p-2.5 text-sm outline-none focus:border-accent"
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      {label}
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-14 rounded border border-edge bg-surface2 px-1 py-0.5 text-right tabular-nums outline-none focus:border-accent"
      />
    </label>
  );
}

function Num({
  value,
  onChange,
  label,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <input
      type="number"
      step="0.25"
      value={value ?? ""}
      placeholder="—"
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-20 rounded-lg border border-edge bg-surface2 px-2 py-1 text-right tabular-nums outline-none focus:border-accent"
    />
  );
}

function Text({
  value,
  onChange,
  label,
  width,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  width: string;
}) {
  return (
    <input
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className={`${width} rounded-lg border border-edge bg-surface2 px-2 py-1 outline-none focus:border-accent`}
    />
  );
}
