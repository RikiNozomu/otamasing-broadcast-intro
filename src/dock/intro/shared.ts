/** Small helpers for the dock's intro panels: change one race's intro, pick and play its history. */
import { useEffect, useState } from "react";
import type { Focus, Intro } from "../../lib/introSchema";
import { updateRace } from "../../lib/store";

export function setIntro(raceId: string, fn: (i: Intro) => Intro) {
  updateRace(raceId, (r) => ({ ...r, intro: fn(r.intro) }));
}

export const INTRO_LABEL = { course: "สนาม", runner: "แนะนำ", grid: "Gate" } as const;

export const FOCUS_LABEL: Record<Focus, string> = {
  none: "ไม่ไฮไลต์", straights: "ทางตรงทั้งหมด", corners: "ทางโค้งทั้งหมด", home: "ทางตรงหน้าอัฒจันทร์ (Home)", back: "ทางตรงฝั่งตรงข้าม (Back)",
  c1: "โค้ง 1", c2: "โค้ง 2", c3: "โค้ง 3", c4: "โค้ง 4",
};

const setHistory = (raceId: string, fn: (h: Intro["history"]) => Intro["history"]) => setIntro(raceId, (x) => ({ ...x, history: fn(x.history) }));
/** Pick a card out in the history modal (again: let it go); opens the modal. */
export const pickHistory = (raceId: string, id: string) => setHistory(raceId, (h) => ({ ...h, open: true, selected: h.selected === id ? null : id }));
/** Play a card's video (from the start, also when it already plays); opens the modal and picks the card. */
export const playHistory = (raceId: string, id: string) => setHistory(raceId, (h) => ({ ...h, open: true, selected: id, play: { id, at: Date.now() } }));
export const stopHistory = (raceId: string) => setHistory(raceId, (h) => ({ ...h, play: null }));
export const toggleHistory = (raceId: string) => setHistory(raceId, (h) => ({ ...h, open: !h.open, play: h.open ? null : h.play }));

/** Re-render every second while `on`, so "กำลังเล่น" ends when the video does and the screen's word stays fresh. */
export function useTick(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => set((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [on]);
}
