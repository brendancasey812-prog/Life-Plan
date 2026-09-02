"use client";

import { idbClear, idbDelete, idbEntries, idbGet, idbPutAll, idbSet } from "./idb";
import type { NoteBody, NoteMeta, TreeId } from "./types";

/** Note keys namespace what the page is attached to. */
export const bubbleNoteKey = (tree: TreeId, id: string) => `bubble:${tree}:${id}`;
export const weekNoteKey = (age: number, week: number) => `week:${age}:${week}`;
export const pageNoteKey = (id: string) => `page:${id}`;

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
  if (!body.text.trim() && pictures === 0) return null;
  return { excerpt: excerptOf(body.text), images: pictures, updatedAt: body.updatedAt };
}

export function excerptOf(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
