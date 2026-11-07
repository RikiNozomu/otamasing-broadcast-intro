/**
 * The compact racecard scene (1920x1080): title on top, the runners full width below, at most 10 a page.
 * The pages take turns by themselves (or are picked in the dock); on a page change the rows slide out to
 * the left one after another and the next ones slide in from the right.
 */
import { AnimatePresence, motion } from "motion/react";
import type { Race, Runner } from "../lib/model";
import { boxColors, drawOf, favColor } from "../lib/colors";
import { ordinal } from "../lib/labels";
import { useCardPage } from "../lib/cardPages";
import { cx } from "../lib/cx";
import { Flag } from "../components/Flag";
import { FitText } from "../components/FitText";
import { HighlightBar, useHighlight, type RowHighlight } from "./Highlight";
import { PageCount, pill, RacePhoto, RaceTitle, SIDE, TABLE_TOP, TABLE_W } from "./RaceBackdrop";

export const cell = "flex h-full items-center";
/** A text cell of the table (horse, jockey): a dark band fading out on its right. */
export const band = cx(cell, "gap-3.5 overflow-hidden whitespace-nowrap px-5 font-display text-[38px] bg-[linear-gradient(90deg,var(--color-band)_80%,rgb(44_48_96/.35))]");
export const ROW_H = 70;
export const BOX_W = 90;
export const GAP = 8;
export const EASE = [0.65, 0, 0.35, 1] as const;
export const headClass = "grid h-[44px] items-center gap-2 text-center font-display text-[24px] font-bold tracking-[.05em] text-white [text-shadow:0_2px_8px_rgb(0_0_0/.4)]";
/** Opacity of a row that is out of the race (scratched, DNF, DQ). */
export const DIM = 0.5;
/** A header over a text column (horse, jockey): left-aligned with the text in the cells below. */
export const headLeft = "px-5 text-left";
/** Row motion on a page change: in from the right, out to the left, one after another. `dim` = out of the race. */
export const rowMotion = (i: number, dim = false) => ({
  initial: { opacity: 0, x: 90 },
  animate: { opacity: dim ? DIM : 1, x: 0, transition: { duration: 0.32, ease: EASE, delay: 0.25 + i * 0.045 } },
  exit: { opacity: 0, x: -90, transition: { duration: 0.25, ease: EASE, delay: i * 0.035 } },
});

/** A DRAW or NO. box: coloured, or plain (white frame on navy). `hl` fades it with its row. */
export function NumberBox({ colors, value, hl }: { colors: readonly [string, string] | null; value: number; hl?: RowHighlight }) {
  return (
    <motion.span initial={false} {...hl?.cell}
      className={cx(cell, "justify-center font-display text-[38px] font-bold", !colors && "bg-scene text-white shadow-[inset_0_0_0_3px_#fff]")}
      style={colors ? { background: colors[0], color: colors[1] } : undefined}>
      {value}
    </motion.span>
  );
}

/** A number cell (horse weight, weight carried): centred on the same dark band. */
const numCell = cx(cell, "justify-center gap-1.5 whitespace-nowrap bg-band px-2 font-display text-[36px] font-bold");
/** "+4", "0", "-2" */
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function RacecardScene({ race }: { race: Race }) {
  const S = race.style, show = S.show, n = race.runners.length;
  const { rows, page, pageCount } = useCardPage(race);
  // a weight column shows only when it is switched on and some horse of the race has the value
  const showHorseWeight = show.horseWeight && race.runners.some((h) => h.horseWeight != null);
  const showWeight = show.weight && race.runners.some((h) => h.weight != null);
  const cols = [show.draw ? `${BOX_W}px` : null, `${BOX_W}px`, "minmax(0,1.3fr)", showHorseWeight ? "200px" : null, "minmax(0,1fr)", showWeight ? "130px" : null].filter(Boolean).join(" ");
  // the bar covers HORSE to the end of the row
  const barLeft = (show.draw ? BOX_W + GAP : 0) + BOX_W + GAP, barWidth = TABLE_W - barLeft;
  const highlightOf = useHighlight(race.highlight);

  const row = (h: Runner, i: number) => {
    const d = drawOf(S, h.number, h.draw, n);
    const hl = highlightOf(h.number);
    // only a scratched horse is faded here; DNF / DQ are results and show on the result page
    const out = h.scratched;
    return (
      <motion.div key={h.number} data-no={h.number} data-hl={hl.state} data-out={out ? "" : undefined} {...rowMotion(i, out)}
        className="relative grid items-center gap-2 py-1" style={{ height: ROW_H, gridTemplateColumns: cols }}>
        <HighlightBar on={hl.on} className="inset-y-1" style={{ left: barLeft, width: barWidth }} />
        {show.draw && <NumberBox colors={boxColors(S.drawScheme, d, h.number, n, S, false)} value={d} hl={hl} />}
        <NumberBox colors={boxColors(S.numberScheme, h.number, h.number, n, S, true)} value={h.number} hl={hl} />
        <motion.span data-testid="horse" initial={false} {...hl.ink(false)} className={cx(band, "font-bold")}>
          {show.horseFlag && <Flag code={h.horseCountry} className="relative h-[26px] w-[39px]" />}
          <FitText className="relative" strike={h.scratched}>{h.name.toUpperCase()}</FitText>
          {show.fav && h.fav && !h.scratched ? <span className={cx(pill, "relative h-8 flex-none px-3 text-[24px] text-scene")} style={{ background: favColor(h.fav) }}>{ordinal(h.fav)}</span> : null}
        </motion.span>
        {showHorseWeight && (
          <motion.span data-testid="horse-weight" initial={false} {...hl.ink(true)} className={numCell}>
            {h.horseWeight != null && <span className="relative">{h.horseWeight}</span>}
            {h.horseWeight != null && h.horseWeightChange != null && <span className="relative text-[26px] font-medium">({signed(h.horseWeightChange)})</span>}
          </motion.span>
        )}
        <motion.span data-testid="jockey" initial={false} {...hl.ink(true)} className={cx(band, "font-medium")}>
          {show.jockeyFlag && <Flag code={h.jockeyCountry} className="relative h-[26px] w-[39px]" />}
          <FitText className="relative" strike={h.scratched}>{h.jockey.toUpperCase()}</FitText>
        </motion.span>
        {showWeight && (
          <motion.span data-testid="weight" initial={false} {...hl.ink(true)} className={numCell}>
            {h.weight != null && <span className="relative">{h.weight.toFixed(1)}</span>}
          </motion.span>
        )}
      </motion.div>
    );
  };
  return (
    <div className="absolute inset-0 bg-scene" data-testid="racecard" data-race={race.id} data-page={page + 1}>
      <RacePhoto photos={race.photos.card} />
      <RaceTitle race={race} />
      <div className="absolute grid content-start" style={{ left: SIDE, top: TABLE_TOP, width: TABLE_W }}>
        <div data-testid="table-head" className={headClass} style={{ gridTemplateColumns: cols }}>
          {show.draw && <span>DRAW</span>}<span>NO.</span><span className={headLeft}>HORSE</span>{showHorseWeight && <span>HORSE WT.</span>}<span className={headLeft}>JOCKEY</span>{showWeight && <span>WEIGHT</span>}
        </div>
        <div className="relative grid content-start" data-testid="runner-rows">
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map(row)}
          </AnimatePresence>
        </div>
      </div>
      <PageCount page={page} count={pageCount} />
    </div>
  );
}
