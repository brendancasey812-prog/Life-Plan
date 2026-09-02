"use client";

import { idbClear, idbDelete, idbEntries, idbGet, idbPutAll, idbSet } from "./idb";
import type { NoteBody, TreeId } from "./types";

/** Note keys namespace what the page is attached to. */
export const bubbleNoteKey = (tree: TreeId, id: string) => `bubble:${tree}:${id}`;
export const weekNoteKey = (age: number, week: number) => `week:${age}:${week}`;
export const pageNoteKey = (id: string) => `page:${id}`;

export const EMPTY_NOTE: NoteBody = { html: "", text: "", images: 0, updatedAt: 0 };

export function readNote(key: string): Promise<NoteBody | undefined> {
  return idbGet<NoteBody>(key);
}

export function writeNote(key: string, body: NoteBody): Promise<unknown> {
  return idbSet(key, body);
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

/** A page counts as empty once its text and its pictures are both gone. */
export function isEmptyNote(body: NoteBody): boolean {
  return !body.text.trim() && body.images === 0;
}

export function excerptOf(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
