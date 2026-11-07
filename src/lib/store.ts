/**
 * The app data lives in localStorage (one key), shared by the dock and the overlay.
 * OBS docks and browser sources share one browser profile, so they see the same storage.
 * Changes reach other pages through the storage event, a BroadcastChannel, and a 1 s poll as a fallback.
 */
import { useSyncExternalStore } from "react";
import { activeExists, HOME, newPhotos, newCard, newResult, type AppData } from "./model";
import { sampleData } from "./sample";
import { HOME_BG, raceImageKey } from "./images";
import { horsePhotoKey, newHorseSettings, newHorseView, silksKey } from "./horses";

// own keys: this site shares the rikinozomu.github.io origin (and so its storage) with otamasing-broadcast
export const STORAGE_KEY = "otamasing-broadcast-compact/v1";
const CHANNEL = "otamasing-broadcast-compact";

let raw: string | null | undefined;
let cache: AppData | undefined;
const listeners = new Set<() => void>();

function safeGet(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function safeSet(v: string) {
  try { localStorage.setItem(STORAGE_KEY, v); } catch { /* private mode or quota: keep the in-memory copy */ }
}

function isAppData(d: unknown): d is AppData {
  const x = d as AppData;
  return !!x && x.version === 1 && Array.isArray(x.races) && typeof x.active === "string" && !!x.home;
}

/** Read storage, seeding the sample on first open (or when the stored value is unusable). */
export function getData(): AppData {
  const r = safeGet();
  if (cache && r === raw) return cache;
  let d: unknown = null;
  try { d = r ? JSON.parse(r) : null; } catch { d = null; }
  if (!isAppData(d)) {
    d = sampleData();
    raw = JSON.stringify(d);
    safeSet(raw);
  } else raw = r;
  const data = d as AppData;
  data.images ??= {};
  // data saved before the horse tab
  data.horses ??= [];
  data.horseSettings = { ...newHorseSettings(), ...data.horseSettings };
  for (const h of data.horses) {
    h.view = { ...newHorseView(), ...h.view };
    h.silks ??= null;
    h.sex ??= null;
    h.sireSire ??= ""; h.sireDam ??= ""; h.damDam ??= "";
    // one picture per horse before the slideshow
    if (!h.photos) h.photos = { keys: data.images[horsePhotoKey(h.id)] ? [horsePhotoKey(h.id)] : [], index: 0, auto: false, seconds: 5, since: 0 };
    // an uploaded silks picture used to win over the drawn one
    if (!h.silksMode && data.images[silksKey(h.id)]) h.silksMode = "upload";
    // the uploaded silks used to be found by the horse's id; now the horse names its picture
    if (h.silksImage === undefined) h.silksImage = data.images[silksKey(h.id)] ? silksKey(h.id) : null;
  }
  if (!activeExists(data.active, data.races, data.horses)) data.active = HOME;
  data.home.page ??= 0;
  // the home background used to be one fixed picture; now the home page names its picture
  if (data.home.background === undefined) data.home.background = data.images[HOME_BG] ? HOME_BG : null;
  // data saved before results existed
  for (const r of data.races) {
    // and before the result pages could turn by themselves
    r.result = { ...newResult(), ...r.result };
    r.card = { ...newCard(), ...r.card };
    // one picture per race before: it becomes the racecard's first picture
    r.photos ??= { ...newPhotos(), card: { ...newPhotos().card, keys: data.images[raceImageKey(r.id)] ? [raceImageKey(r.id)] : [] } };
    for (const h of r.runners) { h.finish ??= null; h.outcome ??= null; h.time ??= ""; h.margin ??= ""; }
  }
  cache = data;
  return cache;
}

let channel: BroadcastChannel | null = null;
function notify() { listeners.forEach((l) => l()); }

function check() {
  if (safeGet() !== raw) notify();
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  addEventListener("storage", (e) => { if (e.key === STORAGE_KEY) check(); });
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => check();
  } catch { channel = null; }
  setInterval(check, 1000);
}

export function setData(next: AppData) {
  raw = JSON.stringify(next);
  cache = next;
  safeSet(raw);
  channel?.postMessage("changed");
  notify();
}

export function update(fn: (d: AppData) => AppData) {
  setData(fn(getData()));
}

export function subscribe(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

export const useData = () => useSyncExternalStore(subscribe, getData, getData);

/** Immutable helper: replace one race by id. */
export function updateRace(id: string, fn: (r: AppData["races"][number]) => AppData["races"][number]) {
  update((d) => ({ ...d, races: d.races.map((r) => (r.id === id ? fn(r) : r)) }));
}

/** Pictures changed elsewhere (IndexedDB); bump the counter so every page reloads that picture. */
export function bumpImage(key: string) {
  update((d) => ({ ...d, images: { ...d.images, [key]: Date.now() } }));
}
