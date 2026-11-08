/** The live scene: whatever is Active, and the transition when Active changes (the new scene animates in over the old one). */
import { animate, motion, useMotionValue, useTransform, type TargetAndTransition, type Transition as MotionTransition } from "motion/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BLANK, parseActive, type Transition } from "../lib/model";
import { useData } from "../lib/store";
import { LeavingContext } from "./leaving";
// the course scene brings three.js: its own chunk, loaded as soon as the overlay starts (see Overlay)
export const loadCourseScene = () => import("./intro/CourseScene");
const CourseScene = lazy(() => loadCourseScene().then((m) => ({ default: m.CourseScene })));
import { RunnerScene } from "./intro/RunnerScene";
import { GridScene } from "./intro/GridScene";

/** What one Active value draws: one of a race's intro scenes, or nothing (also for a race that was deleted). */
export function Scene({ id }: { id: string }) {
  const d = useData();
  const a = parseActive(id);
  const race = a.view === "blank" ? undefined : d.races.find((r) => r.id === a.raceId);
  if (!race) return <div className="absolute inset-0" data-testid="blank" />;
  if (a.view === "course") return <Suspense fallback={null}><CourseScene race={race} /></Suspense>;
  return a.view === "runner" ? <RunnerScene race={race} /> : <GridScene race={race} />;
}

const WIPE_EASE = [0.7, 0, 0.25, 1] as const;
/** Stripes: the old scene plays its exit for this long, then the bands sweep across (and the new scene starts under them). */
export const EXIT_MS = 450;
const SWEEP_S = 1.05;
/** How far the bands lean (px across the screen's height). */
const SLANT = 360;
/** The bands, back to front: [width px, colour] — a navy block, then yellow, a gap, a thin white line at the leading edge. */
const BANDS: [number, string][] = [[260, "var(--color-navy)"], [90, "var(--color-yellow)"], [26, "transparent"], [14, "#fff"]];
const BANDS_W = BANDS.reduce((t, [w]) => t + w, 0);
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
  // Stripes: the bands' trailing edge goes from off the left (-SLANT) to off the right; the new scene shows behind it.
  const sweep = useMotionValue(1);
  const edge = useTransform(sweep, (v) => -SLANT - BANDS_W + v * (1920 + SLANT + BANDS_W));
  const slantIn = useTransform(edge, (x) => `polygon(0 0, ${x + SLANT}px 0, ${x}px 100%, 0 100%)`);
  const slantOut = useTransform(edge, (x) => `polygon(${x + SLANT}px 0, 1920px 0, 1920px 100%, ${x}px 100%)`);
  const dropLeaving = () => setLayers((ls) => (ls.some((l) => l.leaving) ? ls.filter((l) => !l.leaving) : ls));

  const shown = useRef(d.active);
  const wipeAnim = useRef<ReturnType<typeof animate> | null>(null);
  const exitTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (shown.current === d.active) return;
    shown.current = d.active;
    const t = d.transition;
    wipeAnim.current?.stop();
    window.clearTimeout(exitTimer.current);
    if (t === "stripes") {
      // the old scene plays its exit first, then the bands sweep and the new scene starts under them
      const next = d.active;
      setLayers((ls) => [{ ...ls[ls.length - 1], leaving: true, transition: "stripes" }]);
      exitTimer.current = window.setTimeout(() => {
        setLayers((ls) => {
          const old = ls.filter((l) => l.leaving).slice(-1).map((l) => ({ ...l, out: next === BLANK }));
          return [...old, { id: next, n: seq++, transition: "stripes" }];
        });
        sweep.set(0);
        wipeAnim.current = animate(sweep, 1, { duration: SWEEP_S, ease: WIPE_EASE, onComplete: dropLeaving });
      }, EXIT_MS);
      return;
    }
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
  useEffect(() => () => { wipeAnim.current?.stop(); window.clearTimeout(exitTimer.current); }, []);
  const top = layers[layers.length - 1];
  const wipingOut = layers.find((l) => l.out && l.transition === "wipe");
  const wiping = layers.length > 1 && (top.transition === "wipe" || !!wipingOut);
  // stripes: sweeping once the new layer is there (before that the old scene is only playing its exit)
  const sweeping = layers.length > 1 && top.transition === "stripes" && !top.leaving;

  return (
    <>
      {layers.map((l) => {
        const m = l.transition === "slide" || l.transition === "fade" ? MOTION[l.transition] : null;
        const revealing = wiping && l === top && top.transition === "wipe";
        const stripeIn = sweeping && l === top && l.id !== BLANK;
        const stripeOut = sweeping && l.leaving && l.out;
        return (
          <motion.div key={l.n} className="absolute inset-0" data-layer="" data-active={l.leaving ? undefined : l.id}
            style={revealing ? { clipPath } : l === wipingOut ? { clipPath: clipPathOut } : stripeIn ? { clipPath: slantIn } : stripeOut ? { clipPath: slantOut } : undefined}
            initial={m && !l.leaving ? m.from : false}
            animate={m ? (l.out ? m.out : l.leaving ? m.leave : m.to) : {}}
            transition={m?.transition}
            onAnimationComplete={() => { if (m && (!l.leaving || l.out)) dropLeaving(); }}>
            <LeavingContext.Provider value={!!l.leaving}><Scene id={l.id} /></LeavingContext.Provider>
          </motion.div>
        );
      })}
      {sweeping && (
        // the slanted bands leading the new scene: navy, yellow, then a thin white line ahead
        <motion.div key={`stripes${top.n}`} aria-hidden="true" data-testid="stripes" style={{ x: edge }}
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex">
          {BANDS.map(([w, c], i) => (
            <span key={i} className="h-full flex-none" style={{ width: w, background: c, transform: `skewX(${-Math.atan(SLANT / 1080) * 180 / Math.PI}deg)`, transformOrigin: "0 100%" }} />
          ))}
        </motion.div>
      )}
      {wiping && (
        // the yellow + white bar that leads the wipe: yellow just inside the new scene, a thin white line ahead of it
        <motion.div key={`bar${top.n}`} aria-hidden="true" style={{ x: barX }}
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[70px] bg-[linear-gradient(90deg,var(--color-yellow)_0_22px,transparent_22px_40px,#fff_40px_48px,transparent_48px)]" />
      )}
    </>
  );
}
