/**
 * Runner intro (1920x1080), after Nopphorn's sketch: one runner at a time in gate order.
 * Left: the starting gate (the rail post beside stall 1 and the row of stalls; this runner's stall glows with its
 * number and the whole gate, post included, slides to it). Right: the jockey's cut-out photo. Bottom: the jockey's name and weight carried on a bar,
 * then the number box, the silks and the horse's name; bottom right SIRE × DAM (by BMS) and the horse's weight with its change, over "HORSE WEIGHT (KG)".
 */
import { AnimatePresence, motion } from "motion/react";
import type { Race, Runner } from "../../lib/model";
import type { Horse } from "../../lib/horses";
import { boxColors } from "../../lib/colors";
import { horseFor, jockeyFor, pedigreeLines, stallOf, useIntroRunner } from "../../lib/intro";
import { useImage } from "../../lib/images";
import { useData } from "../../lib/store";
import { cx } from "../../lib/cx";
import { Flag } from "../../components/Flag";
import { FitText } from "../../components/FitText";
import { HorseSilks, hasSilks } from "../../components/HorseSilks";
import { Logo } from "../../components/Logo";
import { useLeaving } from "../leaving";
import { EASE, slant } from "./IntroHeader";

/** Gate geometry: the post's right edge, the stalls' size and the band's top. */
const POST_X = 336, STALL_W = 118, BAND_TOP = 560, BAND_H = 160;
/** The bottom area: the jockey bar's top, the line under it. */
const BAR_TOP = 818, LINE_Y = 916;

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * The starting gate: the rail post beside stall 1, then the row of stalls. The whole gate, post included, slides
 * so that this runner's stall sits where stall 1 sits by the post: going up the field the post slides away left
 * with the stalls before this one, like a camera panning along the gate.
 */
function Gate({ stall, count }: { stall: number; count: number }) {
  const leaving = useLeaving();
  return (
    <motion.div data-testid="gate-band" data-stall={stall} className="absolute inset-y-0 left-0 w-[1920px]" initial={false}
      animate={{ x: -(stall - 1) * STALL_W }} transition={{ type: "spring", stiffness: 120, damping: 22 }}>
      {/* the post: two uprights and a crossbar */}
      <motion.div data-testid="gate-post" className="absolute top-0 h-[800px] w-[110px]" style={{ left: POST_X - 110 }}
        initial={{ y: -820 }} animate={{ y: leaving ? -820 : 0 }} transition={{ duration: 0.6, ease: EASE, delay: leaving ? 0.1 : 0.05 }}>
        <div className="absolute inset-y-0 left-0 w-[26px] bg-[linear-gradient(90deg,#d9dcef,#fff_45%,#aeb3d6)] shadow-[6px_0_18px_rgb(0_0_0/.35)]" />
        <div className="absolute inset-y-0 right-0 w-[30px] bg-[linear-gradient(90deg,#c9cde8,#fff_45%,#9ea4cc)] shadow-[6px_0_18px_rgb(0_0_0/.35)]" />
        <div className="absolute top-[520px] right-0 left-0 h-[16px] bg-white/90" />
        <div className="absolute top-[120px] right-0 left-0 h-[10px] bg-white/60" />
      </motion.div>
      {/* the stalls, from the post */}
      <motion.div className="absolute flex" style={{ left: POST_X, top: BAND_TOP, height: BAND_H }}
        initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: leaving ? "inset(0 100% 0 0)" : "inset(0 0% 0 0)" }} transition={{ duration: 0.7, ease: EASE, delay: leaving ? 0 : 0.25 }}>
        {Array.from({ length: Math.max(count, stall) + 14 }, (_, i) => {
          const no = i + 1, on = no === stall, real = no <= count;
          return (
            <div key={no} className="relative h-full flex-none border-r-[6px] border-yellow/70" style={{ width: STALL_W }}>
              <div className={cx("absolute inset-x-0 top-0 h-[14px]", real ? "bg-white/85" : "bg-white/25")} />
              <div className={cx("absolute inset-x-0 bottom-0 h-[10px]", real ? "bg-white/70" : "bg-white/20")} />
              {real && (
                <span className={cx("absolute inset-x-[10px] top-[22px] bottom-[18px] grid place-items-center font-display text-[64px] font-bold transition-[background-color,color,box-shadow] duration-500",
                  on ? "bg-yellow text-navy shadow-[0_0_40px_10px_rgb(255_237_13/.55)]" : "bg-navy/55 text-white/60")}>{no}</span>
              )}
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

/** The jockey's cut-out photo (from the jockey tab); without one, the owner's silks large instead. */
function JockeyPhoto({ name, horse }: { name: string; horse: Horse | undefined }) {
  const d = useData();
  const j = jockeyFor(d, name);
  const url = useImage(j?.photo ?? "", j?.photo ? d.images[j.photo] : undefined);
  if (url) return <img data-testid="jockey-photo" src={url} alt="" className="h-full w-full object-contain object-bottom drop-shadow-[0_18px_40px_rgb(0_0_0/.55)]" />;
  if (!hasSilks(horse, d.images)) return null;
  return (
    <div className="absolute inset-x-0 bottom-[70px] grid place-items-center" data-testid="jockey-silks">
      <HorseSilks horse={horse} className="h-[330px] w-[440px] drop-shadow-[0_18px_40px_rgb(0_0_0/.5)]" />
    </div>
  );
}

/** Everything that changes with the runner, animated in and out together. */
function RunnerInfo({ race, h, leaving }: { race: Race; h: Runner; leaving: boolean }) {
  const d = useData();
  const S = race.style, n = race.runners.length;
  const horse = horseFor(d, h.name);
  const num = boxColors(S.numberScheme === "plain" ? "jra" : S.numberScheme, h.number, h.number, n, S, true) ?? ["#fff", "#000"];
  const ped = pedigreeLines(horse);
  const out = { opacity: 0, transition: { duration: 0.25, ease: EASE } };
  return (
    <motion.div className="absolute inset-0" data-testid="runner" data-no={h.number} exit={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      {/* a giant outlined number behind everything */}
      <motion.span aria-hidden="true" className="absolute top-[-60px] right-[40px] font-display text-[760px] leading-none font-extrabold text-transparent [-webkit-text-stroke:4px_rgb(255_255_255/.12)]"
        initial={{ opacity: 0, x: 120 }} animate={leaving ? out : { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } }} exit={{ opacity: 0, x: -80, transition: { duration: 0.3 } }}>{h.number}</motion.span>
      {/* the jockey's photo on the right, standing on the bar */}
      <motion.div className="absolute right-[70px] w-[620px]" style={{ top: 150, height: LINE_Y - 150 }}
        initial={{ opacity: 0, x: 160 }} animate={leaving ? { opacity: 0, x: 160, transition: { duration: 0.3, ease: EASE } } : { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE, delay: 0.15 } }}
        exit={{ opacity: 0, x: 100, transition: { duration: 0.25, ease: EASE } }}>
        <JockeyPhoto name={h.jockey} horse={horse} />
      </motion.div>
      {/* jockey bar: name | weight carried */}
      <motion.div className="absolute left-0 flex h-[88px] w-[820px] items-stretch" style={{ top: BAR_TOP }}
        initial={{ x: -840 }} animate={leaving ? { x: -840, transition: { duration: 0.3, ease: EASE } } : { x: 0, transition: { duration: 0.5, ease: EASE, delay: 0.2 } }}
        exit={{ x: -840, transition: { duration: 0.28, ease: EASE } }}>
        <div className="flex min-w-0 flex-1 items-center gap-4 bg-white pr-6 pl-[60px] text-navy">
          {S.show.jockeyFlag && <Flag code={h.jockeyCountry} className="h-[30px] w-[45px]" style={{ boxShadow: "0 0 0 3px var(--color-navy)" }} testId="jockey-flag" />}
          <FitText className="font-display text-[54px] font-bold tracking-[.02em]"><span data-testid="jockey-name">{h.jockey.toUpperCase()}</span></FitText>
        </div>
        {h.weight != null && (
          <div data-testid="jockey-weight" className="grid w-[150px] place-items-center bg-yellow font-display leading-[.9] font-bold text-navy" style={slant(0)}>
            <span className="text-[46px]">{h.weight.toFixed(1)}</span>
            <span className="text-[22px] tracking-[.1em]">KG</span>
          </div>
        )}
      </motion.div>
      {/* bottom: number box, silks, horse name */}
      <div className="absolute right-[560px] bottom-0 left-0 flex items-center gap-6 pl-[50px] overflow-hidden" style={{ top: LINE_Y }}>
        <motion.span data-testid="number" className="grid h-[118px] w-[132px] flex-none place-items-center rounded-b-[34px] font-display text-[92px] leading-none font-bold"
          style={{ background: num[0], color: num[1], boxShadow: num[0].toUpperCase() === "#FFFFFF" ? "inset 0 0 0 4px #0A056B" : undefined }}
          initial={{ y: 170 }} animate={leaving ? { y: 170, transition: { duration: 0.25 } } : { y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.3 } }} exit={{ y: 170, transition: { duration: 0.25, ease: EASE } }}>{h.number}</motion.span>
        <motion.span className="h-[112px] w-[150px] flex-none" initial={{ y: 170 }} animate={leaving ? { y: 170 } : { y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.36 } }} exit={{ y: 170, transition: { duration: 0.25, ease: EASE } }}>
          <HorseSilks horse={horse} className="h-full w-full" />
        </motion.span>
        <motion.div className="flex min-w-0 flex-1 items-center gap-4" initial={{ y: 170 }} animate={leaving ? { y: 170 } : { y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.42 } }} exit={{ y: 170, transition: { duration: 0.25, ease: EASE } }}>
          {S.show.horseFlag && <Flag code={h.horseCountry} className="h-[44px] w-[66px]" />}
          <FitText className="font-display text-[128px] leading-none font-bold tracking-[-.005em] text-white"><span data-testid="horse-name">{h.name.toUpperCase()}</span></FitText>
        </motion.div>
      </div>
      {/* bottom right: pedigree | horse weight */}
      <motion.div className="absolute right-0 bottom-0 flex w-[540px] items-stretch text-white" style={{ top: LINE_Y }}
        initial={{ opacity: 0, y: 60 }} animate={leaving ? out : { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.5 } }} exit={{ opacity: 0, y: 40, transition: { duration: 0.2 } }}>
        <div data-testid="pedigree" className="grid min-w-0 flex-1 content-center justify-items-center gap-0.5 px-3 text-center font-display leading-none font-semibold uppercase">
          {ped.cross ? (
            <>
              <FitText grow={false} className="max-w-full text-[34px]">{horse?.sire}</FitText>
              <span className="text-[24px] text-yellow">×</span>
              <FitText grow={false} className="max-w-full text-[34px]">{horse?.dam}</FitText>
              {ped.bms && <FitText grow={false} className="max-w-full text-[22px] font-medium normal-case text-white/75">({ped.bms})</FitText>}
            </>
          ) : null}
        </div>
        {h.horseWeight != null && (
          <div data-testid="horse-weight" className="grid w-[230px] content-center justify-items-center gap-1 border-l-[3px] border-white/60 font-display leading-none font-bold">
            {/* the weight with its change right after it, e.g. 486 (+4) */}
            <span className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[86px]">{h.horseWeight}</span>
              {h.horseWeightChange != null && <span data-testid="horse-weight-change" className="text-[36px] font-semibold">({signed(h.horseWeightChange)})</span>}
            </span>
            <span className="text-[20px] tracking-[.08em] whitespace-nowrap">HORSE WEIGHT (KG)</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function RunnerScene({ race }: { race: Race }) {
  const leaving = useLeaving();
  const { runners, index } = useIntroRunner(race);
  const h = index >= 0 ? runners[index] : undefined;
  const count = Math.max(0, ...race.runners.map((x) => stallOf(race, x)));
  return (
    <div className="absolute inset-0 overflow-hidden bg-scene" data-testid="runner-scene" data-race={race.id}>
      <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_70%_30%,#1d2f9e_0%,#0b1a86_50%,#020b4d_100%)]" />
      {/* diagonal speed lines */}
      <div className="absolute inset-0 opacity-[.07] [background:repeating-linear-gradient(115deg,#fff_0_2px,transparent_2px_46px)]" />
      {h && <Gate stall={stallOf(race, h)} count={count} />}
      {/* the dark bottom area with a yellow line on top */}
      <motion.div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgb(4_10_70/.92),rgb(2_6_40/.98))]" style={{ top: LINE_Y }}
        initial={{ y: 200 }} animate={{ y: leaving ? 200 : 0 }} transition={{ duration: 0.5, ease: EASE, delay: leaving ? 0.15 : 0 }}>
        <div className="absolute inset-x-0 top-0 h-[5px] bg-yellow" />
      </motion.div>
      <AnimatePresence initial={true}>
        {h && <RunnerInfo key={h.number} race={race} h={h} leaving={leaving} />}
      </AnimatePresence>
      {/* top left: the race and where we are in the field */}
      <motion.div className="absolute top-[56px] left-[400px] grid justify-items-start gap-2 text-white" initial={{ opacity: 0, x: -40 }}
        animate={leaving ? { opacity: 0, y: -30 } : { opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}>
        <span data-testid="scene-tag" className="bg-yellow px-6 py-1 font-display text-[24px] font-bold tracking-[.12em] text-navy" style={slant(12)}>
          THE FIELD{h ? ` · ${index + 1} / ${runners.length}` : ""}
        </span>
        <span data-testid="race-name" className="font-display text-[48px] leading-none font-bold uppercase [text-shadow:0_2px_12px_rgb(0_0_0/.45)]">{race.name}</span>
      </motion.div>
      <motion.div className="absolute top-[40px] right-[60px] w-36" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 0 : 1 }}><Logo /></motion.div>
    </div>
  );
}
