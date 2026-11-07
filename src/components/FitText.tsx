/**
 * One line of text that never cuts off with "…": when it is wider than its box it is squeezed
 * sideways (scaleX) just enough to fit, keeping its height. Widths are layout widths, so it also
 * works inside the scaled-down preview.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../lib/cx";

/**
 * `strike` draws the line-through on the text itself (a decoration does not reach an inline-block from outside).
 * `grow` (default) fills the rest of the row; without it the box is as wide as the text and only shrinks.
 */
export function FitText({ className, strike, grow = true, children }: { className?: string; strike?: boolean; grow?: boolean; children: ReactNode }) {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const b = box.current, t = text.current;
    if (!b || !t) return;
    const fit = () => {
      const need = t.offsetWidth, room = b.clientWidth;
      setK(need > room && room > 0 ? room / need : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    ro.observe(t);
    // the display font may arrive after the first measure
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [children]);
  return (
    <span ref={box} className={cx("min-w-0 overflow-hidden whitespace-nowrap", grow ? "flex-1" : "flex-initial", className)}>
      <span ref={text} data-fit={k < 1 ? k.toFixed(3) : undefined} className={cx("inline-block origin-left whitespace-nowrap", strike && "line-through decoration-[3px]")} style={{ transform: k < 1 ? `scaleX(${k})` : undefined }}>{children}</span>
    </span>
  );
}
