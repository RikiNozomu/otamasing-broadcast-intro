/** A boxed group of dock settings with a heading. */
import type { ReactNode } from "react";

export function Section({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <section className="grid gap-2 border border-line bg-studio px-3 py-2.5">
      <h3 className="m-0 text-[15px] font-medium">{title}</h3>
      {children}
    </section>
  );
}

export const hintClass = "m-0 text-xs text-ink-muted";
