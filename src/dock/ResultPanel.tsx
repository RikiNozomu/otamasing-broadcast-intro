/**
 * Sub-tab "ผล" of the edit tab: enter the finishing position (or DNF / DQ / SCR), time and margin of each horse,
 * lock horses to the top of every page, and pick the page shown on screen (or let the pages take turns).
 */
import { useRef, useState } from "react";
import { MAX_RUNNERS, type Race, type ResultView, type Runner } from "../lib/model";
import { MAX_LOCKS, RESULT_ROWS, resultEntries, resultMark, setPageAuto, showPage, useResultPage } from "../lib/results";
import { getData, updateRace } from "../lib/store";
import { cx } from "../lib/cx";
import { Button } from "../components/Button";
import { inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { Switch } from "../components/Switch";

/** Rows in result order (finishers, DNF, DQ, SCR), then the horses with no result yet by number. */
const byFinish = (race: Race) => {
  const shown = resultEntries(race).map((h) => h.number);
  return [...shown, ...race.runners.map((h) => h.number).filter((no) => !shown.includes(no))];
};
type Status = "" | "dnf" | "dq" | "scr";
/** Fractions for margins, put into the margin field being typed in. */
const FRACTIONS = ["½", "¼", "¾"] as const;
const STATUS: [Status, string][] = [["", "–"], ["dnf", "DNF"], ["dq", "DQ"], ["scr", "SCR"]];

export function ResultPanel({ race }: { race: Race }) {
  // The list is re-sorted when a position field loses focus, not while typing, so the row being edited stays put.
  const [order, setOrder] = useState<{ id: string; numbers: number[] }>(() => ({ id: race.id, numbers: byFinish(race) }));
  const numbers = order.id === race.id ? order.numbers : byFinish(race);
  const resort = () => {
    const fresh = getData().races.find((r) => r.id === race.id) ?? race;
    setOrder({ id: race.id, numbers: byFinish(fresh) });
  };
  const rows = [
    ...numbers.map((no) => race.runners.find((h) => h.number === no)).filter((h): h is Runner => !!h),
    ...race.runners.filter((h) => !numbers.includes(h.number)),
  ];

  const setRunner = (no: number, patch: Partial<Runner>) =>
    updateRace(race.id, (r) => ({
      ...r,
      runners: r.runners.map((h) => (h.number === no ? { ...h, ...patch } : h)),
      // a scratched horse can't stay highlighted on the racecard
      highlight: patch.scratched && r.highlight === no ? null : r.highlight,
    }));
  const setStatus = (no: number, st: Status) =>
    setRunner(no, st === "" ? { scratched: false, outcome: null } : st === "scr" ? { scratched: true, outcome: null, finish: null } : { scratched: false, outcome: st, finish: null });
  const setView = (fn: (v: ResultView) => ResultView) => updateRace(race.id, (r) => ({ ...r, result: fn(r.result) }));

  // the margin field last typed in, so the fraction buttons know where to put their character
  const marginRef = useRef<HTMLInputElement | null>(null);
  const [marginNo, setMarginNo] = useState<number | null>(null);
  const insertFraction = (ch: string) => {
    const el = marginRef.current;
    const h = race.runners.find((x) => x.number === marginNo);
    if (!el || !h || !el.isConnected) return;
    const start = el.selectionStart ?? h.margin.length, end = el.selectionEnd ?? start;
    setRunner(h.number, { margin: h.margin.slice(0, start) + ch + h.margin.slice(end) });
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + ch.length, start + ch.length); });
  };
  const page = useResultPage(race);
  const shown = resultEntries(race);
  const lockedCount = page.locked.size;
  const grid = "grid grid-cols-[36px_40px_58px_minmax(0,1fr)_58px_44px] items-center gap-1 text-xs";

  return (
    <div className="grid gap-3" role="tabpanel" aria-labelledby="sub-result">
      <Section title="หน้าที่แสดงบนจอ">
        <div className="flex flex-wrap gap-1" role="group" aria-label="เลือกหน้าผล">
          {Array.from({ length: page.pageCount }, (_, i) => (
            <button key={i} type="button" data-page={i + 1} aria-pressed={page.page === i}
              className={cx("border-2 px-3 py-[3px] font-display text-[17px] font-bold", page.page === i ? "border-yellow bg-yellow text-navy" : "border-white bg-navy text-white")}
              onClick={() => updateRace(race.id, (r) => ({ ...r, result: showPage(r, i) }))}>หน้า {i + 1}</button>
          ))}
        </div>
        <span className={hintClass}>
          {page.pageCount > 1 && race.result.auto ? `วนหน้าอัตโนมัติทุก ${race.result.seconds} วินาที กดเลขหน้าเพื่อข้ามไปหน้านั้นแล้ววนต่อจากตรงนั้น · ` : ""}หน้าละ {RESULT_ROWS} แถว · ขึ้นจอ {shown.length} ตัว · ล็อค {lockedCount} ตัว (อยู่บนสุดทุกหน้า แถบเหลือง) ที่เหลือเปลี่ยนตามหน้าทีละ {RESULT_ROWS - lockedCount} แถว
        </span>
        {page.pageCount > 1 && (
          <>
            <Switch on={race.result.auto} label="วนหน้าอัตโนมัติ" testId="result-auto" onToggle={() => updateRace(race.id, (r) => ({ ...r, result: setPageAuto(r, { auto: !r.result.auto }) }))} />
            <label className="flex items-center justify-between gap-3 text-[13px]" htmlFor="result-sec">
              <span className="whitespace-nowrap">เปลี่ยนหน้าทุกกี่วินาที</span>
              <input id="result-sec" className={cx(inputClass, "w-20 text-center")} type="number" min={1} max={600} step={1} value={race.result.seconds}
                onChange={(e) => { const v = Math.round(+e.target.value); if (v >= 1 && v <= 600) updateRace(race.id, (r) => ({ ...r, result: setPageAuto(r, { seconds: v }) })); }} />
            </label>
          </>
        )}
      </Section>

      <Section title="ผลการแข่งขัน">
        <div className={cx(grid, "text-[11px] text-ink-muted")} aria-hidden="true"><span>ล็อค</span><span>อันดับ</span><span>สถานะ</span><span>ม้า</span><span>เวลา</span><span>ระยะห่าง</span></div>
        <div className="flex flex-wrap items-center justify-end gap-1.5" role="group" aria-label="ใส่เศษในช่องระยะห่าง">
          <span className="text-xs text-ink-muted">{marginNo != null ? `ใส่ในระยะห่างเบอร์ ${marginNo}:` : "คลิกช่องระยะห่างก่อน แล้วกด:"}</span>
          {FRACTIONS.map((f) => (
            // mousedown is cancelled so the margin field keeps its caret
            <Button key={f} className="min-w-9 px-2 py-0.5 font-display text-[19px] font-bold" disabled={marginNo == null} aria-label={`ใส่ ${f}`}
              onMouseDown={(e) => e.preventDefault()} onClick={() => insertFraction(f)}>{f}</Button>
          ))}
        </div>
        <div className="grid gap-1" data-testid="result-rows-edit">
          {rows.map((h) => {
            const mark = resultMark(h);
            const onScreen = mark != null || h.finish != null;
            const locked = race.result.locked.includes(h.number) && onScreen;
            const full = lockedCount >= MAX_LOCKS && !locked;
            const status: Status = h.scratched ? "scr" : h.outcome ?? "";
            return (
              <div key={h.number} className={cx(grid, "border-b border-line pb-1")} data-result-no={h.number}>
                <button type="button" aria-pressed={locked} aria-label={`ล็อคเบอร์ ${h.number}`} disabled={!onScreen || full}
                  title={full ? `ล็อคได้สูงสุด ${MAX_LOCKS} ตัว` : !onScreen ? "ใส่อันดับหรือสถานะก่อน" : undefined}
                  className={cx("h-full border text-[11px] font-semibold disabled:opacity-30", locked ? "border-yellow bg-yellow text-navy" : "border-line bg-studio text-ink-muted")}
                  onClick={() => setView((v) => ({ ...v, locked: locked ? v.locked.filter((x) => x !== h.number) : [...v.locked.filter((x) => x !== h.number), h.number] }))}>
                  {locked ? "ล็อค" : "–"}
                </button>
                <input className={cx(inputClass, "px-0 text-center [appearance:textfield] disabled:opacity-30 [&::-webkit-inner-spin-button]:appearance-none")} type="number" min={1} max={MAX_RUNNERS} aria-label={`อันดับเบอร์ ${h.number}`}
                  value={mark ? "" : h.finish ?? ""} disabled={!!mark} onBlur={resort}
                  onChange={(e) => setRunner(h.number, { finish: e.target.value ? Math.min(MAX_RUNNERS, Math.max(1, Math.round(+e.target.value))) : null })} />
                <select className={cx(inputClass, "px-0.5", status && "border-yellow! text-yellow!")} aria-label={`สถานะเบอร์ ${h.number}`} value={status}
                  onChange={(e) => { setStatus(h.number, e.target.value as Status); resort(); }}>
                  {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="w-[26px] flex-none bg-navy py-[3px] text-center font-display text-[15px] font-bold">{h.number}</span>
                  <span className={cx("truncate font-display text-[15px] font-bold uppercase", h.scratched && "line-through")}>{h.name || "–"}</span>
                </span>
                <input className={cx(inputClass, "px-1 disabled:opacity-30")} disabled={!!mark} aria-label={`เวลาเบอร์ ${h.number}`} placeholder="1:56.7" value={h.time} onChange={(e) => setRunner(h.number, { time: e.target.value })} />
                <input className={cx(inputClass, "px-1 disabled:opacity-30", marginNo === h.number && "border-yellow!")} disabled={!!mark} aria-label={`ระยะห่างเบอร์ ${h.number}`} placeholder="1¼" value={h.margin}
                  onFocus={(e) => { marginRef.current = e.currentTarget; setMarginNo(h.number); }} onChange={(e) => setRunner(h.number, { margin: e.target.value })} />
              </div>
            );
          })}
        </div>
        <span className={hintClass}>สถานะ: DNF = วิ่งไม่จบ, DQ = ถูกตัดสิทธิ์, SCR = ถอนตัว (ตรงกับช่อง "ถอน" ในแท็บข้อมูล) ขึ้นต่อท้ายผู้เข้าเส้นชัยตามลำดับนี้ · ระยะห่างพิมพ์ได้อิสระ เช่น 1¼, ½, nk, hd, nse (ปุ่ม ½ ¼ ¾ ใส่เศษลงช่องที่คลิกไว้ล่าสุด) · ม้าที่ไม่มีอันดับและไม่มีสถานะจะไม่ขึ้นจอ · อันดับเท่ากัน (dead heat) ใส่เลขซ้ำได้</span>
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={resort}>เรียงตามอันดับ</Button>
          <Button disabled={!race.result.locked.length} onClick={() => setView((v) => ({ ...v, locked: [] }))}>ปลดล็อคทั้งหมด</Button>
        </div>
      </Section>
    </div>
  );
}
