/**
 * The compact result scene (1920x1080): title on top, the finishing order full width below, at most
 * 10 rows a page. Locked horses stay on top of every page with the yellow bar; on a page change the other
 * rows slide out to the left one after another and the next ones slide in from the right. With auto on,
 * the pages take turns every few seconds.
 */
import { AnimatePresence, motion } from "motion/react";
import type { Race, Runner } from "../lib/model";
import { boxColors, drawOf } from "../lib/colors";
import { ordinal } from "../lib/labels";
import { resultMark, useResultPage } from "../lib/results";
import { cx } from "../lib/cx";
import { Flag } from "../components/Flag";
import { FitText } from "../components/FitText";
import { HighlightBar, NAVY } from "./Highlight";
import { band, BOX_W, headLeft, cell, EASE, GAP, headClass, NumberBox, ROW_H, rowMotion } from "./RacecardScene";
import { PageCount, RacePhoto, RaceTitle, SIDE, TABLE_TOP, TABLE_W } from "./RaceBackdrop";

/** Space between the locked rows and the rows that change with the page. */
const LOCK_GAP = 10;
const POS_W = 130, TIME_W = 190, MARGIN_W = 170;
const solid = cx(cell, "overflow-hidden whitespace-nowrap bg-band px-4 font-display text-[38px]");

/**
 * Text colour of a cell on a locked row: navy once the growing bar reaches it, white again as the
 * shrinking bar uncovers it. `at` = where the cell sits along the bar, 0 (left) to 1 (right).
 */
const ink = (locked: boolean, at: number) => ({
  initial: false as const,
  animate: { color: locked ? NAVY : "#FFFFFF" },
  transition: { color: locked ? { duration: 0.2, delay: 0.05 + at * 0.35 } : { duration: 0.2, delay: 0.05 + (1 - at) * 0.3 } },
});

export function ResultScene({ race }: { race: Race }) {
  const S = race.style, show = S.show, n = race.runners.length;
  // the page on screen (pages take turns by themselves when auto is on)
  const { rows, locked, page, pageCount } = useResultPage(race);
  const cols = [`${POS_W}px`, `${BOX_W}px`, show.draw ? `${BOX_W}px` : null, "minmax(0,1.3fr)", "minmax(0,1fr)", `${TIME_W}px`, `${MARGIN_W}px`].filter(Boolean).join(" ");
  // the bar covers POS, then (after the coloured boxes) HORSE to MARGIN
  const textL = POS_W + GAP + BOX_W + GAP + (show.draw ? BOX_W + GAP : 0);
  const textW = TABLE_W - textL;
  const lockedCount = rows.filter((h) => locked.has(h.number)).length;

  const row = (h: Runner, i: number) => {
    const on = locked.has(h.number);
    const mark = resultMark(h);
    const d = drawOf(S, h.number, h.draw, n);
    return (
      <motion.div key={h.number} data-no={h.number} data-locked={on ? "" : undefined} data-mark={mark ?? undefined} layout="position"
        {...rowMotion(i, !!mark)} transition={{ layout: { duration: 0.4, ease: EASE } }}
        className="relative grid items-center gap-2 py-1" style={{ height: ROW_H, gridTemplateColumns: cols, marginTop: i === lockedCount && lockedCount > 0 ? LOCK_GAP : 0 }}>
        <HighlightBar on={on} className="inset-y-1" style={{ left: 0, width: POS_W }} />
        <HighlightBar on={on} className="inset-y-1" style={{ left: textL, width: textW }} />
        <motion.span data-testid="pos" {...ink(on, 0)} className={cx(solid, "justify-center font-bold")}><span className="relative">{mark ?? ordinal(h.finish!)}</span></motion.span>
        <NumberBox colors={boxColors(S.numberScheme, h.number, h.number, n, S, true)} value={h.number} />
        {show.draw && <NumberBox colors={boxColors(S.drawScheme, d, h.number, n, S, false)} value={d} />}
        <motion.span data-testid="horse" {...ink(on, 0)} className={cx(band, "font-bold")}>
          {show.horseFlag && <Flag code={h.horseCountry} className="relative h-[26px] w-[39px]" />}
          <FitText className="relative" strike={mark === "SCR"}>{h.name.toUpperCase()}</FitText>
        </motion.span>
        <motion.span data-testid="jockey" {...ink(on, 0.5)} className={cx(band, "font-medium")}>
          {show.jockeyFlag && <Flag code={h.jockeyCountry} className="relative h-[26px] w-[39px]" />}
          <FitText className="relative">{h.jockey.toUpperCase()}</FitText>
        </motion.span>
        <motion.span data-testid="time" {...ink(on, 0.8)} className={cx(solid, "justify-center font-semibold")}><span className="relative">{mark ? "" : h.time}</span></motion.span>
        <motion.span data-testid="margin" {...ink(on, 0.92)} className={cx(solid, "justify-center font-semibold")}><span className="relative">{mark ? "" : h.margin}</span></motion.span>
      </motion.div>
    );
  };

  return (
    <div className="absolute inset-0 bg-scene" data-testid="result" data-race={race.id} data-page={page + 1}>
      <RacePhoto photos={race.photos.result} />
      <RaceTitle race={race}
        tag={<span data-testid="result-tag" className="w-fit bg-yellow px-4 py-1.5 font-display text-[34px] leading-none font-bold tracking-[.08em] text-navy [text-shadow:none]">RESULT</span>} />
      <div className="absolute grid content-start" style={{ left: SIDE, top: TABLE_TOP, width: TABLE_W }}>
        <div data-testid="table-head" className={headClass} style={{ gridTemplateColumns: cols }}>
          <span>POS</span><span>NO.</span>{show.draw && <span>DRAW</span>}<span className={headLeft}>HORSE</span><span className={headLeft}>JOCKEY</span><span>TIME</span><span>MARGIN</span>
        </div>
        <div className="relative grid content-start" data-testid="result-rows">
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map(row)}
          </AnimatePresence>
          {rows.length === 0 && <div className="py-6 text-center font-display text-[40px] font-semibold text-white/70 uppercase">Result to follow</div>}
        </div>
      </div>
      <PageCount page={page} count={pageCount} />
    </div>
  );
}
