/**
 * A .zip with the JSON and the pictures it names, so pictures can move to another browser (e.g. from Chrome
 * into OBS): `data.json` plus `image/<date-time>.<ext>` files, under the same names the JSON uses.
 */
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { getImage } from "./images";
import { imageRefs, mimeOf } from "./imageRefs";

export const BUNDLE_JSON = "data.json";

/** True when the bytes start like a .zip file. */
export const isZip = (b: Uint8Array) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

/** Pack the JSON text and every stored picture it names; `missing` lists names not stored in this browser. */
export async function makeBundle(text: string): Promise<{ blob: Blob; images: number; missing: string[] }> {
  const files: Zippable = { [BUNDLE_JSON]: [strToU8(text), { level: 6 }] };
  const missing: string[] = [];
  let images = 0;
  for (const k of imageRefs(JSON.parse(text))) {
    const b = await getImage(k).catch(() => undefined);
    if (!b) { missing.push(k); continue; }
    // pictures are compressed already: store them as they are
    files[k] = [new Uint8Array(await b.arrayBuffer()), { level: 0 }];
    images++;
  }
  return { blob: new Blob([zipSync(files)], { type: "application/zip" }), images, missing };
}

/** Unpack a .zip from `makeBundle`: the JSON text and the pictures under image/. */
export function readBundle(bytes: Uint8Array): { ok: true; text: string; images: Record<string, Blob> } | { ok: false; error: string } {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { return { ok: false, error: "ไฟล์ .zip เสียหรือเปิดไม่ได้" }; }
  const json = files[BUNDLE_JSON] ? BUNDLE_JSON : Object.keys(files).find((k) => k.toLowerCase().endsWith(".json"));
  if (!json) return { ok: false, error: "ในไฟล์ .zip ไม่มีไฟล์ JSON" };
  const images: Record<string, Blob> = {};
  for (const [k, v] of Object.entries(files)) if (k.startsWith("image/") && v.length) images[k] = new Blob([v], { type: mimeOf(k) });
  return { ok: true, text: strFromU8(files[json]), images };
}
