/**
 * Something that steps through `n` items on a timer: the pictures of a slideshow, the pages of a result.
 * `index` is the item shown at time `since`; with `auto` it moves on every `seconds` from there. Every page
 * (dock, overlay) works out the same item from the clock, so nothing has to be written while it runs.
 */
import { useEffect, useState } from "react";

export interface Cycle {
  index: number;
  auto: boolean;
  seconds: number;
  since: number;
}

const wrap = (i: number, n: number) => ((i % n) + n) % n;

/** Item shown at `now` out of `n` (-1 when there are none). */
export function cycleAt(c: Cycle, n: number, now = Date.now()): number {
  if (!n) return -1;
  let i = c.index;
  if (c.auto && n > 1) i += Math.floor(Math.max(0, now - c.since) / (c.seconds * 1000));
  return wrap(i, n);
}

/** Show item `i` from now on (auto carries on from it). */
export const cycleTo = <C extends Cycle>(c: C, i: number, n: number, now = Date.now()): C => ({ ...c, index: n ? wrap(i, n) : 0, since: now });

/** Turn auto on or off, or change its speed, without jumping to another item. */
export const cycleSet = <C extends Cycle>(c: C, patch: Partial<Pick<Cycle, "auto" | "seconds">>, n: number, now = Date.now()): C =>
  ({ ...c, ...patch, index: Math.max(0, cycleAt(c, n, now)), since: now });

/** The item on screen, re-rendering when auto moves on. */
export function useCycle(c: Cycle, n: number): number {
  const [now, setNow] = useState(Date.now);
  const i = cycleAt(c, n, now);
  useEffect(() => {
    if (!c.auto || n < 2) return;
    const ms = c.seconds * 1000;
    const wait = ms - ((Date.now() - c.since) % ms) + 5;
    const t = window.setTimeout(() => setNow(Date.now()), Math.max(50, wait));
    return () => window.clearTimeout(t);
  }, [c.auto, n, c.seconds, c.since, now]);
  // a change from the dock (new since) must be read straight away
  useEffect(() => setNow(Date.now()), [c.index, c.since]);
  return i;
}
