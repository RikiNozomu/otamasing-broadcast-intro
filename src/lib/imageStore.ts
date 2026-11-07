/** Adding, removing and renaming stored pictures, keeping the data's list of pictures (`images`) in step. */
import { clearImages, deleteImage, getImage, imageOk, putImage } from "./images";
import { imageName, imageRefs, isImageName, mapImageRefs } from "./imageRefs";
import { getData, update } from "./store";
import type { FileOutput } from "./model";

/** Store a picture under a new image/<date-time>.<ext> name and return the name (the caller puts it in the data). */
export async function storeImage(f: File): Promise<string> {
  const name = imageName(f);
  await putImage(name, f);
  return name;
}

/** Delete these pictures from the browser unless the data still refers to them (after the change that let go of them). */
export async function dropUnused(keys: (string | null | undefined)[]) {
  const used = new Set(imageRefs(getData()));
  const gone = [...new Set(keys)].filter((k): k is string => !!k && !used.has(k));
  if (!gone.length) return;
  update((x) => ({ ...x, images: Object.fromEntries(Object.entries(x.images).filter(([k]) => !gone.includes(k))) }));
  await Promise.all(gone.map((k) => deleteImage(k).catch(() => {})));
}

/**
 * Check the pictures a file to import refers to. Names not in this browser, or whose file is damaged,
 * are taken out of the file; `missing` lists them for the toast. Pictures found are (re)listed in `images`.
 */
export async function checkImportImages(file: FileOutput): Promise<{ file: FileOutput; found: string[]; missing: string[] }> {
  const refs = imageRefs(file);
  const ok = await Promise.all(refs.map(imageOk));
  const missing = refs.filter((_, i) => !ok[i]);
  const found = refs.filter((_, i) => ok[i]);
  return { file: missing.length ? mapImageRefs(file, (k) => (missing.includes(k) ? null : k)) : file, found, missing };
}

let migrating = false;
/** Pictures stored under the old names (photo:…, silks:…, home, …) get an image/<date-time>.<ext> name; runs once in the dock. */
export async function renameOldImages() {
  if (migrating) return;
  migrating = true;
  try {
    const old = Object.keys(getData().images).filter((k) => !isImageName(k));
    const map = new Map<string, string>();
    for (const k of old) {
      const b = await getImage(k).catch(() => undefined);
      if (!b) continue;
      const name = imageName(b as Blob & { name?: string });
      await putImage(name, b);
      map.set(k, name);
    }
    if (!map.size) return;
    const now = Date.now();
    update((x) => {
      const images = { ...x.images };
      for (const [o, n] of map) { delete images[o]; images[n] = now; }
      return mapImageRefs({ ...x, images }, (k) => map.get(k) ?? k);
    });
    await Promise.all([...map.keys()].map((k) => deleteImage(k).catch(() => {})));
  } finally { migrating = false; }
}

/** Delete every picture stored in this browser and take all picture names out of the data (cannot be undone). */
export async function clearAllImages() {
  await clearImages();
  update((x) => mapImageRefs({ ...x, images: {} }, () => null));
}
