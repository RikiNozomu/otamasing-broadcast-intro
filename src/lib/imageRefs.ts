/**
 * Picture names. Every picture added in the dock is stored in this browser under a name like
 * `image/20261106031451123.png` (local date and time to the millisecond, then the file's extension),
 * and the data (and so the exported JSON) refers to it by that name.
 */

/** What holds picture names: races' slideshows, horses' slideshows and uploaded silks, the home page background. */
type Holder = {
  races?: { photos: { card: { keys: string[] }; result: { keys: string[] } } }[];
  horses?: { photos: { keys: string[] }; silksImage?: string | null }[];
  home?: { background?: string | null };
};

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg", "image/avif": "avif", "image/bmp": "bmp",
};

/** Type of a picture from its name's extension (svg needs the right type to show). */
export function mimeOf(name: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
  if (ext === "jpeg") return "image/jpeg";
  return Object.entries(MIME_EXT).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
}

/** Extension of a picture file: from its name, else from its type, else png. */
export function extOf(f: { name?: string; type?: string }): string {
  const m = /\.([a-z0-9]{1,5})$/i.exec(f.name ?? "");
  return (m?.[1] ?? MIME_EXT[f.type ?? ""] ?? "png").toLowerCase();
}

const p = (n: number, w = 2) => String(n).padStart(w, "0");
/** `YYYYMMDDHHmmssSSS` in local time. */
export const stamp = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${p(d.getMilliseconds(), 3)}`;
};

let last = 0;
/** A new picture name; two pictures added in the same millisecond get the next millisecond, so names never clash. */
export function imageName(f: { name?: string; type?: string }, now = Date.now()): string {
  last = Math.max(now, last + 1);
  return `image/${stamp(last)}.${extOf(f)}`;
}

export const isImageName = (k: string) => /^image\/\d{17}\.[a-z0-9]+$/.test(k);

/** Every picture name the data refers to (each once). */
export function imageRefs(d: Holder): string[] {
  const out = new Set<string>();
  for (const r of d.races ?? []) for (const k of [...r.photos.card.keys, ...r.photos.result.keys]) out.add(k);
  for (const h of d.horses ?? []) {
    for (const k of h.photos.keys) out.add(k);
    if (h.silksImage) out.add(h.silksImage);
  }
  if (d.home?.background) out.add(d.home.background);
  return [...out];
}

/** The same data with every picture name passed through `fn`: a new name renames it, null takes it out. */
export function mapImageRefs<T extends Holder>(d: T, fn: (k: string) => string | null): T {
  const keys = (ks: string[]) => ks.map(fn).filter((k): k is string => !!k);
  const one = (k: string | null | undefined) => (k ? fn(k) : k ?? null);
  return {
    ...d,
    ...(d.races && { races: d.races.map((r) => ({ ...r, photos: { ...r.photos, card: { ...r.photos.card, keys: keys(r.photos.card.keys) }, result: { ...r.photos.result, keys: keys(r.photos.result.keys) } } })) }),
    ...(d.horses && { horses: d.horses.map((h) => ({ ...h, photos: { ...h.photos, keys: keys(h.photos.keys) }, ...("silksImage" in h && { silksImage: one(h.silksImage) }) })) }),
    ...(d.home && { home: { ...d.home, ...("background" in d.home && { background: one(d.home.background) }) } }),
  };
}
