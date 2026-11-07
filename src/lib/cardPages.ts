/**
 * How the racecard pages: CARD_ROWS horses a page in number order (scratched horses keep their place).
 * With `card.auto` the pages take turns every `card.seconds`, worked out from the clock like the result page.
 */
import { cycleAt, cycleSet, cycleTo, useCycle } from "./cycle";
import type { CardView, Race } from "./model";
import { paginate } from "./paging";

export const CARD_ROWS = 10;

type Paged = Pick<Race, "runners" | "card">;
const pages = (race: Paged) => Math.max(1, Math.ceil(race.runners.length / CARD_ROWS));
const asCycle = (race: Paged) => ({ ...race.card, index: race.card.page });

export const cardPage = (race: Paged, page = race.card.page) => paginate(race.runners, CARD_ROWS, page);

/** The page on screen at `now`. */
export const shownCardPage = (race: Paged, now = Date.now()) => cycleAt(asCycle(race), pages(race), now);

/** Show page `i` from now on (auto carries on from it). */
export function showCardPage(race: Paged, i: number, now = Date.now()): CardView {
  const c = cycleTo(asCycle(race), i, pages(race), now);
  return { ...race.card, page: c.index, since: c.since };
}

/** The page that has horse `no` on it. */
export const pageOfHorse = (race: Paged, no: number) => Math.max(0, Math.floor(race.runners.findIndex((h) => h.number === no) / CARD_ROWS));

/** Turn the page turning on or off, or change its speed, staying on the page on screen. */
export function setCardAuto(race: Paged, patch: Partial<Pick<CardView, "auto" | "seconds">>, now = Date.now()): CardView {
  const { index, auto, seconds, since } = cycleSet(asCycle(race), patch, pages(race), now);
  return { ...race.card, page: index, auto, seconds, since };
}

/** The page on screen, re-rendering when auto turns it. */
export function useCardPage(race: Paged) {
  const i = useCycle(asCycle(race), pages(race));
  return cardPage(race, Math.max(0, i));
}
