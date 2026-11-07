/** An on/off switch row: label on the left, toggle on the right. */
import { motion } from "motion/react";
import { cx } from "../lib/cx";

export function Switch({ on, label, onToggle, testId }: { on: boolean; label: string; onToggle: () => void; testId?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} data-testid={testId} onClick={onToggle}
        className={cx("relative h-6 w-[42px] flex-none rounded-full transition-colors", on ? "bg-ok" : "bg-track")}>
        <motion.span className="absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white" initial={false} animate={{ x: on ? 18 : 0 }} transition={{ type: "spring", stiffness: 600, damping: 35 }} />
      </button>
    </div>
  );
}
