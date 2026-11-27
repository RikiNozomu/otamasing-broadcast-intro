/**
 * Horses (the "ม้า" tab): the intro shows a horse's pedigree and the owner's silks. A horse's other facts and past races stay in the
 * data so files move between this site and broadcast compact unchanged. The silks pictures come from the shared package.
 */
export * from "./horseSchema.ts";

/** Picture keys in IndexedDB. `horsePhotoKey` is the one picture of a horse from before the slideshow; new pictures are `photo:<id>`. */
export const horsePhotoKey = (id: string) => `horse:${id}`;

