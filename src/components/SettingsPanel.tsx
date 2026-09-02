"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw, Upload, X } from "lucide-react";
import { exportPlan, parsePlan, usePlan } from "@/lib/store";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = usePlan((s) => s.settings);
  const updateSettings = usePlan((s) => s.updateSettings);
  const replaceAll = usePlan((s) => s.replaceAll);
  const resetAll = usePlan((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  function download() {
    const state = usePlan.getState();
    const blob = new Blob([exportPlan(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "life-plan.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function upload(file: File) {
    const parsed = parsePlan(await file.text());
    if (!parsed) {
      setError("That file isn't a Life Plan export.");
      return;
    }
    setError("");
    replaceAll(parsed);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <aside className="relative flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto border-l border-white/10 bg-[#0c0e15] p-6 shadow-2xl">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </header>

        <Field label="Name">
          <input
            value={settings.name}
            onChange={(e) => updateSettings({ name: e.target.value })}
            placeholder="Your name"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
          />
        </Field>

        <Field
          label="Date of birth"
          hint="Anchors the week grid and the calendar years on each bubble."
        >
          <input
            type="date"
            value={settings.birthDate}
            onChange={(e) => updateSettings({ birthDate: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
          />
        </Field>

        <Field label="Plan through age" hint="How far the decades and the week grid run.">
          <input
            type="number"
            min={10}
            max={120}
            value={settings.lifespan}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) updateSettings({ lifespan: Math.min(120, Math.max(10, n)) });
            }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
          />
        </Field>

        <div className="space-y-3 border-t border-white/10 pt-5">
          <p className="text-xs text-zinc-500">
            Everything is stored in this browser only. Export a copy to move it somewhere else.
          </p>
          <div className="flex gap-2">
            <button
              onClick={download}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
            >
              <Download size={15} /> Export
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
            >
              <Upload size={15} /> Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <div className="mt-auto border-t border-white/10 pt-5">
          {confirmReset ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-300">
                Delete every bubble, note and week you have filled in?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    resetAll();
                    setConfirmReset(false);
                  }}
                  className="flex-1 rounded-lg bg-rose-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-500"
                >
                  Yes, start over
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-rose-300"
            >
              <RotateCcw size={15} /> Reset everything
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{label}</span>
      {children}
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
