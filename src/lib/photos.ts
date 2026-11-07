/** The slideshow of a scene's left-hand pictures: which one is on screen, and the dock's changes to it. */
import { cycleAt, cycleSet, cycleTo, useCycle } from "./cycle";
import type { PhotoSet } from "./model";

/** Index of the picture on screen at `now` (-1 when there is none). Pictures not in this browser are skipped by the caller. */
export const shownIndex = (set: PhotoSet, now = Date.now()) => cycleAt(set, set.keys.length, now);

/** Show picture `i` from now on (an auto slideshow carries on from it). */
export const showPhoto = (set: PhotoSet, i: number, now = Date.now()) => cycleTo(set, i, set.keys.length, now);

/** Turn the slideshow on or off, or change its speed, without jumping to another picture. */
export const setAuto = (set: PhotoSet, patch: Partial<Pick<PhotoSet, "auto" | "seconds">>, now = Date.now()) => cycleSet(set, patch, set.keys.length, now);

/** The index on screen, re-rendering when an auto slideshow moves on. */
export const useShownIndex = (set: PhotoSet) => useCycle(set, set.keys.length);
