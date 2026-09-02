"use client";

/**
 * Note bodies hold pasted screenshots, which would blow through local
 * storage's few megabytes in a couple of pages — so they live in IndexedDB
 * instead, and only a short excerpt of each is kept in the main store.
 */
const DB_NAME = "life-plan-notes";
const STORE = "notes";
const VERSION = 1;

let cached: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("no IndexedDB"));
  cached ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return cached;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = work(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function idbGet<T>(key: string): Promise<T | undefined> {
  return run<T | undefined>("readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function idbSet(key: string, value: unknown): Promise<unknown> {
  return run("readwrite", (s) => s.put(value, key));
}

export function idbDelete(keys: string[]): Promise<void> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        for (const key of keys) store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function idbEntries<T>(): Promise<Record<string, T>> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const keys = store.getAllKeys();
    const values = store.getAll();
    tx.oncomplete = () => {
      const out: Record<string, T> = {};
      (keys.result as IDBValidKey[]).forEach((k, i) => {
        out[String(k)] = (values.result as T[])[i];
      });
      resolve(out);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export function idbPutAll(entries: Record<string, unknown>): Promise<void> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        store.clear();
        for (const [key, value] of Object.entries(entries)) store.put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export function idbClear(): Promise<unknown> {
  return run("readwrite", (s) => s.clear());
}
