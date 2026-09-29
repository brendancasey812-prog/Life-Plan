"use client";

import { idbClear, idbDelete, idbEntries, idbGet, idbPutAll, idbSet } from "./idb";
import { outlineOf } from "./outline";
import type { NoteBody, NoteMeta, TreeId } from "./types";

/** Note keys namespace what the page is attached to. */
export const bubbleNoteKey = (tree: TreeId, id: string) => `bubble:${tree}:${id}`;
export const weekNoteKey = (age: number, week: number) => `week:${age}:${week}`;
export const pageNoteKey = (id: string) => `page:${id}`;

/**
 * The standing weekly goals. The only page attached to nothing: one list of
 * what every week should hold, rather than a page per week, so the Overview
 * card and every week of the grid are looking at the same one.
 */
export const WEEKLY_GOALS_KEY = "weekly";

export const EMPTY_NOTE: NoteBody = {
  html: "",
  text: "",
  images: 0,
  gallery: [],
  updatedAt: 0,
};

/** Fills in anything a page saved by an older version is missing. */
function normalise(body: NoteBody | undefined): NoteBody | undefined {
  return body && { ...EMPTY_NOTE, ...body, gallery: body.gallery ?? [] };
}

export function readNote(key: string): Promise<NoteBody | undefined> {
  return idbGet<NoteBody>(key).then(normalise);
}

export function writeNote(key: string, body: NoteBody): Promise<unknown> {
  return idbSet(key, body);
}

/**
 * Merges a change into a page. The written text and the picture boxes are
 * edited from different places — sometimes on screen at the same time — so
 * each saves only its own part rather than the whole record.
 */
export async function updateNote(key: string, patch: Partial<NoteBody>): Promise<NoteBody> {
  const current = (await readNote(key)) ?? EMPTY_NOTE;
  const next: NoteBody = { ...current, ...patch, updatedAt: Date.now() };
  await writeNote(key, next);
  return next;
}

/**
 * Adds lines to a page as unticked checklist items, skipping any the page
 * already carries. They join the page's last checklist if it has one, so a
 * list that is added to stays one list.
 */
export async function appendTasks(key: string, lines: string[]): Promise<NoteBody | null> {
  const current = (await readNote(key)) ?? EMPTY_NOTE;
  const have = current.text.toLowerCase();
  const missing = lines.filter((line) => !have.includes(line.toLowerCase()));
  if (!missing.length) return null;

  const items = missing
    .map(
      (line) =>
        `<li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>${line}</p></div></li>`,
    )
    .join("");

  let html: string;
  const doc =
    typeof DOMParser === "undefined"
      ? null
      : new DOMParser().parseFromString(current.html, "text/html");
  const lists = doc?.querySelectorAll('ul[data-type="taskList"]');
  const last = lists?.length ? lists[lists.length - 1] : null;
  if (doc && last) {
    last.insertAdjacentHTML("beforeend", items);
    html = doc.body.innerHTML;
  } else {
    html = `${current.html}<ul data-type="taskList">${items}</ul>`;
  }

  const text = [current.text.trimEnd(), ...missing].filter(Boolean).join("\n");
  return updateNote(key, { html, text });
}

export function deleteNotes(keys: string[]): Promise<void> {
  return idbDelete(keys);
}

export function allNotes(): Promise<Record<string, NoteBody>> {
  return idbEntries<NoteBody>();
}

export function restoreNotes(notes: Record<string, NoteBody>): Promise<void> {
  return idbPutAll(notes);
}

export function clearAllNotes(): Promise<unknown> {
  return idbClear();
}

/** Every picture on the page, inline ones and pinned ones together. */
export function pictureCount(body: NoteBody): number {
  return body.images + (body.gallery?.length ?? 0);
}

/** What the main store keeps about a page — null once nothing is left on it. */
export function metaOf(body: NoteBody): NoteMeta | null {
  const pictures = pictureCount(body);
  const text = body.text ?? "";
  if (!text.trim() && pictures === 0) return null;
  return {
    excerpt: excerptOf(text),
    outline: outlineOf(body.html ?? "", text),
    images: pictures,
    updatedAt: body.updatedAt,
  };
}

export function excerptOf(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
