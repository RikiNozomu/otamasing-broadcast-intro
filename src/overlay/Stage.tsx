/** A 1920x1080 stage scaled to the width of its parent box (the Browser Source, the landing preview, the dock preview). */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../lib/cx";

export function Stage({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1920);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx("absolute top-0 left-0 h-[1080px] w-[1920px] origin-top-left overflow-hidden", className)} style={{ transform: `scale(${scale})` }}>
      {children}
    </div>
  );
}
