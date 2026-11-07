/** Flag picker: a custom listbox with real flag images and a search box (a native <select> can't show pictures). */
import { motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NATIONS, nationCode, nationName } from "../lib/nations";
import { cx } from "../lib/cx";
import { Flag } from "../components/Flag";
import { inputClass } from "../components/Field";

export function FlagPicker({ value, onChange, label }: { value: string; onChange: (code: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); btn.current?.focus(); };
  return (
    <>
      <button ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${nationName(value)}`} title={nationName(value)} onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-0.5 border border-line bg-panel p-1 text-[10px] text-ink-muted">
        {value ? <Flag code={value} className="h-[18px] w-[27px]" /> : <span className="w-[27px] text-center text-[13px] text-ink">–</span>}
        <span aria-hidden="true">▾</span>
      </button>
      {open && <FlagPopover anchor={btn.current!} value={value} onPick={(c) => { onChange(c); close(); }} onClose={close} />}
    </>
  );
}

function FlagPopover({ anchor, value, onPick, onClose }: { anchor: HTMLElement; value: string; onPick: (c: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0, above: false });
  // Below the button, or above it when there is no room; recomputed when the dock scrolls so it follows the button.
  const place = useCallback(() => {
    const r = anchor.getBoundingClientRect(), h = pop.current?.offsetHeight ?? 300;
    const above = r.bottom + 4 + h > innerHeight;
    setPos({ left: Math.max(8, Math.min(r.left, innerWidth - 218)), top: Math.max(8, above ? r.top - 4 - h : r.bottom + 4), above });
  }, [anchor]);
  useLayoutEffect(place, [place]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!pop.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) closeRef.current(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    const scroll = (e: Event) => { if (!pop.current?.contains(e.target as Node)) place(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    addEventListener("scroll", scroll, true);
    addEventListener("resize", place);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); removeEventListener("scroll", scroll, true); removeEventListener("resize", place); };
  }, [anchor, place]);
  const s = q.trim().toLowerCase();
  const opts: (readonly [string, string, string])[] = [...NATIONS, ["", "", "ไม่ใส่ธง"] as const].filter(
    ([c, k, n]) => !s || c.toLowerCase().includes(s) || k.toLowerCase().includes(s) || n.toLowerCase().includes(s),
  );
  return createPortal(
    <motion.div ref={pop} style={{ left: pos.left, top: pos.top }}
      className="fixed z-50 grid w-[210px] gap-1.5 border border-yellow bg-panel p-1.5 shadow-[0_10px_28px_rgb(0_0_0/.55)]"
      initial={{ opacity: 0, y: pos.above ? 6 : -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
      <input className={inputClass} type="search" placeholder="ค้นหา เช่น ญี่ปุ่น, JPN" aria-label="ค้นหาประเทศ" value={q} autoFocus onChange={(e) => setQ(e.target.value)} />
      <div className="grid max-h-[230px] gap-0.5 overflow-auto" role="listbox" aria-label="ประเทศ">
        {opts.length ? opts.map(([c, , n]) => (
          <button key={c || "none"} type="button" role="option" aria-selected={c === value} data-c={c} onClick={() => onPick(c)}
            className={cx("flex items-center gap-2.5 px-1.5 py-[5px] text-left text-[13px] text-ink hover:bg-raised focus-visible:bg-raised", c === value && "bg-raised shadow-[inset_3px_0_0_var(--color-yellow)]")}>
            {c ? <Flag code={c} className="h-5 w-[30px]" /> : <span className="w-[30px] text-center">–</span>}
            <span>{n}</span>
            <small className="ml-auto text-[11px] text-ink-muted">{c ? nationCode(c) : ""}</small>
          </button>
        )) : <span className="text-xs text-ink-muted">ไม่พบประเทศ</span>}
      </div>
    </motion.div>,
    document.body,
  );
}
