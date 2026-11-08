/**
 * Starting gate (1920x1080): every runner top to bottom in gate order, one a row, all rows lined up straight.
 * Gate and number boxes, silks, horse, horse weight, jockey, weight;
 * each can be hidden. Rows come in one after another from the top; more than `perPage` runners make pages.
 */
import { AnimatePresence, motion } from "motion/react";
import type { Race, Runner } from "../../lib/model";
import { boxColors, drawOf } from "../../lib/colors";
import { gridPage, horseFor, stallOf } from "../../lib/intro";
import { useData } from "../../lib/store";
import { cx } from "../../lib/cx";
import { Flag } from "../../components/Flag";
import { FitText } from "../../components/FitText";
import { HorseSilks, hasSilks } from "../../components/HorseSilks";
import { PageCount, RacePhoto } from "../RaceBackdrop";
import { useLeaving } from "../leaving";
import { EASE, IntroHeader } from "./IntroHeader";

const TOP = 262, BOTTOM = 1040, LEFT = 60;
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function GridScene({ race }: { race: Race }) {
  const d = useData();
  const leaving = useLeaving();
  const g = race.intro.grid, show = g.show, S = race.style, n = race.runners.length;
  const { rows, page, pageCount } = gridPage(race);
  const pitch = Math.min(84, (BOTTOM - TOP) / g.perPage);
  const rowH = Math.round(pitch * 0.86);
  const font = Math.round(rowH * 0.66);
  const box = Math.round(rowH * 1.45);
  const width = 1920 - 2 * LEFT;
  const anyHorseWeight = show.horseWeight && race.runners.some((h) => h.horseWeight != null);
  const anyWeight = show.weight && race.runners.some((h) => h.weight != null);
  const cols = [show.draw ? `${box}px` : null, show.number ? `${box}px` : null, show.silks ? `${Math.round(rowH * 1.5)}px` : null, "minmax(0,1.25fr)",
    anyHorseWeight ? `${Math.round(font * 5.6)}px` : null, show.jockey ? "minmax(0,.9fr)" : null, anyWeight ? `${Math.round(font * 3.4)}px` : null].filter(Boolean).join(" ");

  const row = (h: Runner, i: number) => {
    const horse = horseFor(d, h.name);
    const dw = drawOf(S, h.number, h.draw, n);
    const gate = boxColors(S.drawScheme, dw, h.number, n, S, false);
    const num = boxColors(S.numberScheme, h.number, h.number, n, S, true);
    const boxCls = (c: readonly [string, string] | null) => cx("flex h-full items-center justify-center font-display font-bold", !c && "bg-scene text-white shadow-[inset_0_0_0_3px_#fff]");
    const band = "flex h-full min-w-0 items-center gap-3 overflow-hidden whitespace-nowrap px-4 font-display bg-[linear-gradient(90deg,var(--color-band)_80%,rgb(44_48_96/.35))]";
    return (
      <motion.div key={h.number} data-no={h.number} data-stall={stallOf(race, h)}
        className="relative grid items-center gap-2" style={{ height: rowH, width, gridTemplateColumns: cols, fontSize: font }}
        initial={{ opacity: 0, x: -140, clipPath: "inset(0 100% 0 0)" }}
        animate={leaving
          ? { opacity: 0, x: 120, transition: { duration: 0.25, ease: EASE, delay: i * 0.015 } }
          : { opacity: 1, x: 0, clipPath: "inset(0 0% 0 0)", transition: { duration: 0.42, ease: EASE, delay: 0.35 + i * 0.06 } }}
        exit={{ opacity: 0, x: 120, transition: { duration: 0.25, ease: EASE, delay: i * 0.03 } }}>
        {show.draw && <span data-testid="gate" className={boxCls(gate)} style={gate ? { background: gate[0], color: gate[1] } : undefined}>{dw}</span>}
        {show.number && <span data-testid="number" className={boxCls(num)} style={num ? { background: num[0], color: num[1] } : undefined}>{h.number}</span>}
        {show.silks && (hasSilks(horse, d.images)
          ? <span data-testid="silks" className="grid h-full place-items-center rounded-[6px] bg-white/95 p-[3px]"><HorseSilks horse={horse} className="h-full w-full" /></span>
          // no silks set for this horse yet: a quiet empty slot instead of a blank white card
          : <span data-testid="silks-empty" className="h-full rounded-[6px] bg-white/10" />)}
        <span data-testid="horse" className={cx(band, "font-bold")}>
          {S.show.horseFlag && <Flag code={h.horseCountry} className="h-[.7em] w-[1.05em]" />}
          <FitText>{h.name.toUpperCase()}</FitText>
        </span>
        {anyHorseWeight && (
          <span data-testid="horse-weight" className="flex h-full items-center justify-center gap-1.5 bg-band font-display font-bold whitespace-nowrap">
            {h.horseWeight != null && <>{h.horseWeight}<span className="text-[.62em] font-medium text-white/80">KG</span></>}
            {h.horseWeight != null && h.horseWeightChange != null && <span className="text-[.7em] font-medium">({signed(h.horseWeightChange)})</span>}
          </span>
        )}
        {show.jockey && (
          <span data-testid="jockey" className={cx(band, "font-medium")}>
            {S.show.jockeyFlag && <Flag code={h.jockeyCountry} className="h-[.7em] w-[1.05em]" />}
            <FitText>{h.jockey.toUpperCase()}</FitText>
          </span>
        )}
        {anyWeight && (
          <span data-testid="weight" className="flex h-full items-center justify-center gap-1 bg-yellow font-display font-bold whitespace-nowrap text-navy">
            {h.weight != null && <>{h.weight.toFixed(1)}<span className="text-[.62em]">KG</span></>}
          </span>
        )}
      </motion.div>
    );
  };
  return (
    <div className="absolute inset-0 bg-scene" data-testid="grid-scene" data-race={race.id} data-page={page + 1}>
      <RacePhoto photos={race.photos.card} logo={false} />
      {/* the left edge stripes of the grid, like the painted grid boxes */}
      <div className="absolute inset-y-0 left-0 w-[14px] bg-yellow" />
      <IntroHeader race={race} tag="STARTING GATE" />
      <div className="absolute grid content-start" data-testid="grid-rows" style={{ left: LEFT, top: TOP, rowGap: pitch - rowH }}>
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map(row)}
        </AnimatePresence>
      </div>
      <PageCount page={page} count={pageCount} />
    </div>
  );
}
