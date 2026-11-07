/**
 * The home scene ("หน้าแรก"): the races in dock order, HOME_ROWS a page, title + subtitle, optional background,
 * one race highlighted. On a page change the rows slide out to the left one after another and the next ones slide in.
 */
import { AnimatePresence, motion } from "motion/react";
import { GRADE_COLOR } from "../lib/colors";
import { gradeLabel } from "../lib/labels";
import { useImage } from "../lib/images";
import { useData } from "../lib/store";
import { HOME_ROWS, paginate } from "../lib/paging";
import { cx } from "../lib/cx";
import { FitText } from "../components/FitText";
import { Logo } from "../components/Logo";
import { HighlightBar, useHighlight } from "./Highlight";

const box = "flex items-center gap-[18px] overflow-hidden whitespace-nowrap px-[22px] font-display text-[40px] font-bold text-white";
const cell = cx(box, "bg-[linear-gradient(90deg,var(--color-band)_85%,rgb(44_48_96/.5))]");
const EASE = [0.65, 0, 0.35, 1] as const;
const ROW_H = 78;

export function RaceListScene() {
  const d = useData();
  const bg = useImage(d.home.background ?? "", d.home.background ? d.images[d.home.background] : undefined);
  const { rows: races } = paginate(d.races, HOME_ROWS, d.home.page);
  // the round column fits the longest round of ALL races, so it doesn't change width between pages
  const roundW = Math.max(110, ...d.races.map((x) => 44 + 24 * x.round.length));
  const cur = d.home.highlight && d.races.some((r) => r.id === d.home.highlight) ? d.home.highlight : null;
  const highlightOf = useHighlight(cur);
  // the course column shows when it is switched on and some race has a course
  const showCourse = d.home.showCourse && d.races.some((x) => x.course.trim());
  const showDate = d.home.showDate && d.races.some((x) => x.date);
  const cols = [`${roundW}px`, showDate ? "230px" : null, "150px", showCourse ? "260px" : null, "minmax(0,1fr)", "330px"].filter(Boolean).join(" ");
  return (
    <div className="absolute inset-0 bg-scene" data-testid="race-list">
      {bg && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${bg}")` }}>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_21_125/.92)_0%,rgb(0_21_125/.75)_60%,rgb(0_21_125/.55)_100%)]" />
        </div>
      )}
      <Logo className="absolute top-[30px] right-10 w-40" />
      <div className="absolute top-[70px] left-20 text-white">
        <div data-testid="home-subtitle" className="font-display text-[34px] leading-[normal] font-semibold tracking-[.06em] text-home-date">{d.home.subtitle}</div>
        <div data-testid="home-title" className="font-display text-[110px] leading-none font-bold uppercase">{d.home.title}</div>
      </div>
      <div className="absolute inset-x-20 top-[290px] grid content-start gap-3.5" data-testid="race-list-rows">
        <AnimatePresence initial={false} mode="popLayout">
        {races.map((x, i) => {
          const hl = highlightOf(x.id);
          return (
            <motion.div key={x.id} data-testid="race-list-row" data-race={x.id} data-hl={hl.state} className="relative grid gap-2.5"
              initial={{ opacity: 0, x: 90 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.32, ease: EASE, delay: 0.25 + i * 0.05 } }}
              exit={{ opacity: 0, x: -90, transition: { duration: 0.25, ease: EASE, delay: i * 0.04 } }}
              style={{ height: ROW_H, gridTemplateColumns: cols }}>
              <HighlightBar on={hl.on} className="inset-y-0 right-0" style={{ left: roundW + 10 }} />
              <motion.span initial={false} {...hl.cell} className={cx(box, "justify-center bg-scene shadow-[inset_0_0_0_3px_#fff]")}>{x.round}</motion.span>
              {showDate && (
                <motion.span data-testid="race-date" initial={false} {...hl.ink(false)} className={cx(cell, "justify-center text-[34px] font-semibold tabular-nums")}>
                  <span className="relative">{x.date.replaceAll("-", ".")}</span>
                </motion.span>
              )}
              <motion.span initial={false} {...hl.ink(false)} className={cx(cell, "justify-center tabular-nums")}><span className="relative">{x.postTime}</span></motion.span>
              {showCourse && (
                <motion.span data-testid="race-course" initial={false} {...hl.ink(false)} className={cx(cell, "text-[34px] font-semibold uppercase")}>
                  <FitText className="relative" grow={false}>{x.course.toUpperCase()}</FitText>
                </motion.span>
              )}
              <motion.span initial={false} {...hl.ink(false)} className={cell}>
                <FitText className="relative" grow={false}>{x.name.toUpperCase()}</FitText>
                {x.grade && x.style.show.grade ? (
                  <span className="relative inline-flex h-9 items-center rounded-full px-4 text-[26px] leading-none text-white" style={{ background: GRADE_COLOR[x.grade] }}>{gradeLabel(x, x.style)}</span>
                ) : null}
              </motion.span>
              <motion.span initial={false} {...hl.ink(true)} className={cx(cell, "justify-end text-[34px] font-semibold uppercase")}>
                <span className="relative">{[x.surface, x.distanceM ? x.distanceM + "m" : ""].filter(Boolean).join(" ")}</span>
              </motion.span>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
    </div>
  );
}
