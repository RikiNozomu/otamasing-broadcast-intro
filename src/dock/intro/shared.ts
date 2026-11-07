/** Small helpers for the dock's intro panels: change one race's intro. */
import type { Intro } from "../../lib/introSchema";
import { updateRace } from "../../lib/store";

export function setIntro(raceId: string, fn: (i: Intro) => Intro) {
  updateRace(raceId, (r) => ({ ...r, intro: fn(r.intro) }));
}

export const INTRO_LABEL = { course: "สนาม", runner: "แนะนำ", grid: "Gate" } as const;
