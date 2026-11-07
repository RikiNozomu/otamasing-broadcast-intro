/** A row of small page buttons (1, 2, …) with a label, for a list that is shown a page at a time. Hidden with one page. */
import { cx } from "../lib/cx";

export function PageButtons({ label, count, page, onPick, testId, className }: {
  label: string; count: number; page: number; onPick: (i: number) => void; testId?: string; className?: string;
}) {
  if (count < 2) return null;
  return (
    <div className={cx("flex flex-wrap items-center gap-1 text-xs text-ink-muted", className)} role="group" aria-label={label} data-testid={testId}>
      <span>{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" aria-pressed={page === i} aria-label={`${label} ${i + 1}`}
          className={cx("border-2 px-2.5 py-px font-display text-[15px] font-bold", page === i ? "border-yellow bg-yellow text-navy" : "border-white bg-navy text-white")}
          onClick={() => onPick(i)}>{i + 1}</button>
      ))}
    </div>
  );
}
