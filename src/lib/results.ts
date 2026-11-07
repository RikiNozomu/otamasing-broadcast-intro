/**
 * What the result page lists and how it pages. Finishers come first in finishing order, then the horses
 * with a mark instead of a position: DNF (did not finish), DQ (disqualified), SCR (scratched).
 * At most RESULT_ROWS rows are on screen. Locked horses stay at the top of every page; the other rows
 * fill the remaining rows, page by page.
 * e.g. 17 finishers with 1st–3rd locked: page 1 = 1–3 + 4–10, page 2 = 1–3 + 11–17.
 * With `result.auto` the pages take turns every `result.seconds`, worked out from the clock.
 */
import { cycleAt, cycleSet, cycleTo, useCycle } from "./cycle";
import type { Race, ResultView, Runner } from "./model";

export const RESULT_ROWS = 10;
/** At least one row is left for the horses that change with the page. */
export const MAX_LOCKS = RESULT_ROWS - 1;

export type ResultMark = "DNF" | "DQ" | "SCR";
const MARK_ORDER: ResultMark[] = ["DNF", "DQ", "SCR"];

/** The mark shown instead of a position, or null for a horse that finished (or has no result yet). */
export function resultMark(h: Pick<Runner, "scratched" | "outcome">): ResultMark | null {
  if (h.scratched) return "SCR";
  return h.outcome === "dnf" ? "DNF" : h.outcome === "dq" ? "DQ" : null;
}

/** Horses with a finishing position, in finishing order (dead heats by number). */
export function finishers(race: Pick<Race, "runners">): Runner[] {
  return race.runners
    .filter((h) => h.finish != null && !resultMark(h))
    .sort((a, b) => a.finish! - b.finish! || a.number - b.number);
}

/** Every horse on the result page: finishers, then DNF, DQ and SCR (each by number). Horses with no result are left out. */
export function resultEntries(race: Pick<Race, "runners">): Runner[] {
  const marked = MARK_ORDER.flatMap((m) => race.runners.filter((h) => resultMark(h) === m).sort((a, b) => a.number - b.number));
  return [...finishers(race), ...marked];
}

export interface ResultPage {
  /** Rows to draw, locked first. */
  rows: Runner[];
  locked: Set<number>;
  /** The page shown (0-based, clamped) and how many pages there are. */
  page: number;
  pageCount: number;
}

export function resultPage(race: Pick<Race, "runners" | "result">, page = race.result.page): ResultPage {
  const all = resultEntries(race);
  const want = new Set(race.result.locked);
  const lockedRows = all.filter((h) => want.has(h.number)).slice(0, MAX_LOCKS);
  const locked = new Set(lockedRows.map((h) => h.number));
  const rest = all.filter((h) => !locked.has(h.number));
  const slots = RESULT_ROWS - lockedRows.length;
  const pageCount = Math.max(1, Math.ceil(rest.length / slots));
  const p = Math.min(Math.max(0, page), pageCount - 1);
  return { rows: [...lockedRows, ...rest.slice(p * slots, (p + 1) * slots)], locked, page: p, pageCount };
}

type Paged = Pick<Race, "runners" | "result">;
const pages = (race: Paged) => resultPage(race, 0).pageCount;

/** The page on screen at `now`, taking turns when auto is on. */
export const shownPage = (race: Paged, now = Date.now()) => cycleAt({ ...race.result, index: race.result.page }, pages(race), now);

/** Show page `i` from now on (auto carries on from it). */
export function showPage(race: Paged, i: number, now = Date.now()): ResultView {
  const c = cycleTo({ ...race.result, index: race.result.page }, i, pages(race), now);
  return { ...race.result, page: c.index, since: c.since };
}

/** Turn the page turning on or off, or change its speed, staying on the page on screen. */
export function setPageAuto(race: Paged, patch: Partial<Pick<ResultView, "auto" | "seconds">>, now = Date.now()): ResultView {
  const { index, auto, seconds, since } = cycleSet({ ...race.result, index: race.result.page }, patch, pages(race), now);
  return { ...race.result, page: index, auto, seconds, since };
}

/** The page on screen, re-rendering when auto turns it. */
export function useResultPage(race: Paged): ResultPage {
  const i = useCycle({ ...race.result, index: race.result.page }, pages(race));
  return resultPage(race, Math.max(0, i));
}
