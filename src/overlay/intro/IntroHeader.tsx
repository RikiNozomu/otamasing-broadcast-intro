/**
 * Top of the intro scenes: a slanted yellow tag naming the scene, the race name with its grade badge, then
 * date · round · course · surface distance; the logo top right. Slides away when the scene leaves.
 */
import { motion } from "motion/react";
import type { Race } from "../../lib/model";
import { GRADE_COLOR } from "../../lib/colors";
import { gradeLabel } from "../../lib/labels";
import { cx } from "../../lib/cx";
import { Logo } from "../../components/Logo";
import { FitText } from "../../components/FitText";
import { pill } from "../RaceBackdrop";
import { useLeaving } from "../leaving";

export const EASE = [0.65, 0, 0.35, 1] as const;
/** The slanted plate shape used across the intro (a parallelogram leaning right). */
export const slant = (k = 22) => ({ clipPath: `polygon(${k}px 0, 100% 0, calc(100% - ${k}px) 100%, 0 100%)` });

export function raceFacts(race: Race) {
  const distance = [race.surface, race.distanceM ? `${race.distanceM}m` : ""].filter(Boolean).join(" ");
  return [race.date.replaceAll("-", "."), race.round, race.course, distance].filter(Boolean);
}

export function IntroHeader({ race, tag, width = 1500 }: { race: Race; tag: string; width?: number }) {
  const leaving = useLeaving();
  const S = race.style;
  return (
    <>
      <motion.div className="absolute top-[40px] left-[60px] grid justify-items-start gap-2 text-white" style={{ width }}
        initial={{ opacity: 0, x: -60 }} animate={leaving ? { opacity: 0, y: -40, transition: { duration: 0.3, ease: EASE } } : { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE, delay: 0.15 } }}>
        <span data-testid="scene-tag" className="bg-yellow px-7 py-1 font-display text-[26px] leading-tight font-bold tracking-[.12em] text-navy" style={slant(14)}>{tag}</span>
        <div className="flex w-full items-center gap-4">
          <FitText grow={false} className="font-display text-[76px] leading-[.95] font-bold uppercase [text-shadow:0_2px_14px_rgb(0_0_0/.45)]"><span data-testid="race-name">{race.name}</span></FitText>
          {S.show.grade && race.grade && <span data-testid="grade" className={cx(pill, "h-[44px] flex-none px-5 text-[30px] text-white")} style={{ background: GRADE_COLOR[race.grade] }}>{gradeLabel(race, S)}</span>}
        </div>
        <div data-testid="race-facts" className="font-display text-[32px] leading-tight font-semibold tracking-[.03em] uppercase [text-shadow:0_2px_10px_rgb(0_0_0/.45)]">
          {raceFacts(race).map((f, i) => <span key={i}>{i > 0 && <span className="px-3 text-white/55">·</span>}{f}</span>)}
        </div>
      </motion.div>
      <motion.div className="absolute top-[40px] right-[60px] w-36" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: 0.4 }}>
        <Logo />
      </motion.div>
    </>
  );
}
