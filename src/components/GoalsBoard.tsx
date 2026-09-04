"use client";

import Link from "next/link";
import { ArrowUpRight, ImageIcon, Sparkles } from "lucide-react";
import { useGoalPage, type Scope } from "@/lib/useGoalPage";
import { NoteEditor } from "./NoteEditor";
import { NoteGallery } from "./NoteGallery";

export type { Scope };

/**
 * A notepad for this year's or this month's goals. It is not a separate copy:
 * the page it opens is the very one behind the matching `Age N` or month
 * bubble in My Life, so writing here shows up there and the other way round.
 */
export function GoalsBoard({ scope }: { scope: Scope }) {
  const { period, noteKey, trail } = useGoalPage(scope);

  if (!noteKey) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted">
            There is no {scope === "year" ? `Age ${period.age}` : period.title.split("—")[1]} bubble
            in My Life to attach this to — it looks like it was renamed or deleted.
          </p>
          <Link
            href="/life"
            className="mt-3 inline-block text-sm text-accentink underline underline-offset-4"
          >
            Open the bubbles
          </Link>
        </div>
      </div>
    );
  }

  const [eyebrow, heading] = period.title.split(" — ");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <header className="pane relative overflow-hidden rounded-2xl border border-edge px-5 py-5 sm:px-7">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 140% at 0% 0%, rgba(99,102,241,0.22), transparent 62%), radial-gradient(100% 160% at 100% 0%, rgba(45,212,191,0.14), transparent 60%)",
            }}
          />
          <p className="text-xs font-medium tracking-[0.14em] text-accentink uppercase">
            {eyebrow}
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1>
            <Link
              href="/life"
              className="flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1.5 text-xs text-muted transition hover:bg-surface2 hover:text-fg"
            >
              <Sparkles size={13} className="text-accentink" />
              {trail.join("  ›  ")}
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            The same page as that bubble in My Life — write in either place and both show it.
          </p>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <section className="pane flex min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-edge bg-surface lg:min-h-[34rem]">
            <NoteEditor
              noteKey={noteKey}
              placeholder={
                scope === "year"
                  ? "What does this year need to be? Write it down, break it into steps…"
                  : "What has to happen this month to keep the year on track?"
              }
            />
          </section>

          <section className="pane rounded-2xl border border-edge bg-surface p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-muted uppercase">
              <ImageIcon size={14} className="text-accentink" /> Pictures
            </h2>
            <p className="mt-1 mb-4 text-xs text-faint">
              Screenshots, photos, anything worth looking at.
            </p>
            <NoteGallery noteKey={noteKey} />
          </section>
        </div>
      </div>
    </div>
  );
}
