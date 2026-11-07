/**
 * Pictures are Blobs in this browser's IndexedDB (localStorage only holds ~5 MB of text), under names like
 * `image/20261106031451123.png` (see imageRefs.ts); the data refers to them by name.
 */
import { useEffect, useState } from "react";

const DB = "otamasing-broadcast-compact", STORE = "images";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export const putImage = (key: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, key));
export const deleteImage = (key: string) => tx("readwrite", (s) => s.delete(key));
export const getImage = (key: string) => tx<Blob | undefined>("readonly", (s) => s.get(key));
export const clearImages = () => tx("readwrite", (s) => s.clear());

/** Whether a stored picture is there and opens as a picture (not missing, empty or damaged). */
export async function imageOk(key: string): Promise<boolean> {
  let b: Blob | undefined;
  try { b = await getImage(key); } catch { return false; }
  if (!b || !b.size) return false;
  const url = URL.createObjectURL(b);
  try {
    return await new Promise<boolean>((res) => {
      const img = new Image();
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

/** Old names, from before pictures were named image/<date-time>.<ext>; renamed on the dock's first open (imageStore.ts). */
/** Key of a race's one picture from before the slideshow (kept as the racecard's first picture). New pictures are `photo:<id>`. */
export const raceImageKey = (id: string) => `race:${id}`;
export const HOME_BG = "home";

/** Object URL of a stored picture; reloads when `rev` changes. */
export function useImage(key: string, rev: number | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true, made: string | null = null;
    if (!rev) { setUrl(null); return; }
    getImage(key).then((b) => {
      if (!alive) return;
      made = b ? URL.createObjectURL(b) : null;
      setUrl(made);
    }).catch(() => alive && setUrl(null));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [key, rev]);
  return url;
}
