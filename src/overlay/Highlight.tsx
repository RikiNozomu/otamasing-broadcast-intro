/**
 * The highlight shared by the racecard (one horse) and the race list (one race):
 * one yellow bar that grows left to right when it comes in and shrinks right to left when it leaves,
 * while the other rows fade to 60%. Nothing animates on the first draw of a scene, only on a change.
 */
import { AnimatePresence, motion, type Transition } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cx } from "../lib/cx";

const BAR_EASE = [0.65, 0, 0.35, 1] as const;
const BAR_MS = 500;
export const NAVY = "#0A056B";

export function HighlightBar({ on, className, style }: { on: boolean; className?: string; style?: CSSProperties }) {
  return (
    <AnimatePresence initial={false}>
      {on && (
        <motion.span key="bar" aria-hidden="true" data-testid="highlight-bar" className={cx("absolute origin-left bg-yellow", className)} style={style}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }} transition={{ duration: BAR_MS / 1000, ease: BAR_EASE }} />
      )}
    </AnimatePresence>
  );
}

export interface RowHighlight {
  on: boolean;
  /** "on" for the highlighted row, "out" for the row the bar just left (also a test hook). */
  state: "on" | "out" | undefined;
  /** Motion props for every cell of the row: fade when another row is highlighted. */
  cell: { animate: { opacity: number }; transition: { opacity: Transition } };
  /** Motion props for a text cell that turns navy on the yellow bar; `late` = a cell on the right (the bar reaches it later). */
  ink: (late: boolean) => { animate: { opacity: number; color: string }; transition: { opacity: Transition; color: Transition } };
}

/**
 * Tracks changes of the highlighted id: the one before the last change, and whether the old bar is
 * still shrinking (for BAR_MS after a change).
 */
function useHighlightChange<T>(cur: T | null) {
  const ref = useRef<{ cur: T | null; prev: T | null; n: number }>({ cur, prev: null, n: 0 });
  if (ref.current.cur !== cur) ref.current = { cur, prev: ref.current.cur, n: ref.current.n + 1 };
  const { prev, n } = ref.current;
  const [settled, setSettled] = useState(n);
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(n), BAR_MS);
    return () => window.clearTimeout(t);
  }, [n]);
  return { prev, barLeaving: settled !== n };
}

/**
 * Per-row highlight state for a list where `cur` is the highlighted id (or null).
 *
 * A row's cells never animate their opacity while that row's bar is on screen: during an opacity
 * animation a cell becomes its own stacking context and is painted OVER the absolutely positioned bar,
 * which hid the bar (seen in OBS when the highlight moved from 12 to 13). So the new row jumps to full
 * opacity at once, and the row the bar left fades only after its bar has shrunk away.
 */
export function useHighlight<T>(cur: T | null): (id: T) => RowHighlight {
  const { prev, barLeaving } = useHighlightChange(cur);
  return (id) => {
    const on = cur != null && id === cur;
    const out = !on && prev != null && id === prev;
    const opacity = cur != null && !on && !(out && barLeaving) ? 0.6 : 1;
    const fade: Transition = on ? { duration: 0 } : { duration: out ? 0.3 : 0.4 };
    return {
      on,
      state: on ? "on" : out ? "out" : undefined,
      cell: { animate: { opacity }, transition: { opacity: fade } },
      ink: (late) => ({
        animate: { opacity, color: on ? NAVY : "#FFFFFF" },
        // IN: the text turns navy as the bar (growing left to right) reaches it.
        // OUT: back to white as the bar (shrinking right to left) uncovers it, so the right-hand text goes first.
        transition: { opacity: fade, color: on ? { duration: 0.25, delay: late ? 0.25 : 0.1 } : { duration: 0.2, delay: late ? 0.1 : 0.3 } },
      }),
    };
  };
}
