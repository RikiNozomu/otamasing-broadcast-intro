/**
 * Horses (the "ม้า" tab): the intro shows a horse's pedigree and the owner's silks. A horse's other facts and past races stay in the
 * data so files move between this site and broadcast compact unchanged. Pictures (the owner's silks) live in IndexedDB.
 */
export * from "./horseSchema.ts";
import { type SilksMode, type Horse } from "./horseSchema.ts";

/** Picture keys in IndexedDB. `horsePhotoKey` is the one picture of a horse from before the slideshow; new pictures are `photo:<id>`. */
export const horsePhotoKey = (id: string) => `horse:${id}`;
export const silksKey = (id: string) => `silks:${id}`;

/** The silks shown: "upload", "pattern" or "none" (see Horse.silksMode). */
export const silksModeOf = (h: Pick<Horse, "silks" | "silksMode">): SilksMode => h.silksMode ?? (h.silks ? "pattern" : "none");
