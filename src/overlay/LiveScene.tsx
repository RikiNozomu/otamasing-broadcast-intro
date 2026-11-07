/** The live scene: whatever is Active, and the transition when Active changes (the new scene animates in over the old one). */
import { animate, motion, useMotionValue, useTransform, type TargetAndTransition, type Transition as MotionTransition } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { BLANK, parseActive, type Transition } from "../lib/model";
import { useData } from "../lib/store";
import { RacecardScene } from "./RacecardScene";
import { RaceListScene } from "./RaceListScene";
import { ResultScene } from "./ResultScene";
import { HorseScene } from "./HorseScene";

/** What one Active value draws. A deleted race or horse falls back to the home page. */
export function Scene({ id }: { id: string }) {
  const d = useData();
  const a = parseActive(id);
  if (a.view === "blank") return <div className="absolute inset-0" data-testid="blank" />;
  if (a.view === "horse") {
    const horse = d.horses.find((h) => h.id === a.horseId);
    return horse ? <HorseScene horse={horse} /> : <RaceListScene />;
  }
  const race = a.view === "home" ? undefined : d.races.find((r) => r.id === a.raceId);
  if (!race) return <RaceListScene />;
  return a.view === "result" ? <ResultScene race={race} /> : <RacecardScene race={race} />;
}

const WIPE_EASE = [0.7, 0, 0.25, 1] as const;
const SLIDE_EASE = [0.65, 0, 0.25, 1] as const;

/**
 * Slide and fade: how the incoming scene enters and what the outgoing one does meanwhile (it stays put unless it slides away).
 * `out` is the outgoing scene's own exit, used when the new scene is the blank screen (nothing comes in to cover it).
 */
const MOTION: Record<"slide" | "fade", { from: TargetAndTransition; to: TargetAndTransition; leave: TargetAndTransition; out: TargetAndTransition; transition: MotionTransition }> = {
  slide: { from: { x: "100%" }, to: { x: "0%" }, leave: { x: "-35%", opacity: 0.2 }, out: { x: "-100%" }, transition: { duration: 0.7, ease: SLIDE_EASE } },
  fade: { from: { opacity: 0 }, to: { opacity: 1 }, leave: {}, out: { opacity: 0 }, transition: { duration: 0.5, ease: "easeOut" } },
};

/** `out`: this leaving layer animates itself away, because the scene after it is blank. */
interface Layer { id: string; n: number; transition: Transition | null; leaving?: boolean; out?: boolean }
let seq = 0;

export function LiveScene() {
  const d = useData();
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: d.active, n: seq++, transition: null }]);
  // Wipe: one progress value drives both the reveal edge of the new scene and the bar on that edge, so they never drift apart.
  const wipe = useMotionValue(1);
  const clipPath = useTransform(wipe, (v) => `inset(0 ${(1 - v) * 100}% 0 0)`);
  const clipPathOut = useTransform(wipe, (v) => `inset(0 0 0 ${v * 100}%)`);
  const barX = useTransform(wipe, (v) => v * 1920 - 22);
  const dropLeaving = () => setLayers((ls) => (ls.some((l) => l.leaving) ? ls.filter((l) => !l.leaving) : ls));

  const shown = useRef(d.active);
  const wipeAnim = useRef<ReturnType<typeof animate> | null>(null);
  useEffect(() => {
    if (shown.current === d.active) return;
    shown.current = d.active;
    const t = d.transition;
    wipeAnim.current?.stop();
    setLayers((ls) => {
      const top = ls[ls.length - 1];
      if (t === "none") return [{ id: d.active, n: seq++, transition: null }];
      if (d.active === BLANK) return [{ ...top, leaving: true, out: true, transition: t }, { id: BLANK, n: seq++, transition: null }];
      return [{ ...top, leaving: true, transition: t }, { id: d.active, n: seq++, transition: t }];
    });
    if (t === "wipe") {
      wipe.set(0);
      wipeAnim.current = animate(wipe, 1, { duration: 0.8, ease: WIPE_EASE, onComplete: dropLeaving });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a change of Active starts a transition
  }, [d.active]);
  useEffect(() => () => wipeAnim.current?.stop(), []);
  const top = layers[layers.length - 1];
  const wipingOut = layers.find((l) => l.out && l.transition === "wipe");
  const wiping = layers.length > 1 && (top.transition === "wipe" || !!wipingOut);

  return (
    <>
      {layers.map((l) => {
        const m = l.transition === "slide" || l.transition === "fade" ? MOTION[l.transition] : null;
        const revealing = wiping && l === top && top.transition === "wipe";
        return (
          <motion.div key={l.n} className="absolute inset-0" data-layer="" data-active={l.leaving ? undefined : l.id}
            style={revealing ? { clipPath } : l === wipingOut ? { clipPath: clipPathOut } : undefined}
            initial={m && !l.leaving ? m.from : false}
            animate={m ? (l.out ? m.out : l.leaving ? m.leave : m.to) : {}}
            transition={m?.transition}
            onAnimationComplete={() => { if (m && (!l.leaving || l.out)) dropLeaving(); }}>
            <Scene id={l.id} />
          </motion.div>
        );
      })}
      {wiping && (
        // the yellow + white bar that leads the wipe: yellow just inside the new scene, a thin white line ahead of it
        <motion.div key={`bar${top.n}`} aria-hidden="true" style={{ x: barX }}
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[70px] bg-[linear-gradient(90deg,var(--color-yellow)_0_22px,transparent_22px_40px,#fff_40px_48px,transparent_48px)]" />
      )}
    </>
  );
}
