/**
 * The การแข่งขัน tab's "ประวัติ" part: the moments in the race's history (cards in the modal over the course
 * scene), each with an optional highlight video stored in this browser; open the modal, pick a card, play a video.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { introOf, newId, type Race } from "../../lib/model";
import type { HistoryItem } from "../../lib/introSchema";
import { playingItem } from "../../lib/intro";
import { dropUnused, storeVideo } from "../../lib/imageStore";
import { update, useData } from "../../lib/store";
import { cx } from "../../lib/cx";
import { Button, buttonClass } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";
import { Section, hintClass } from "../../components/Section";
import { Switch } from "../../components/Switch";
import { setIntro } from "./shared";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Re-render every second while something plays, so "กำลังเล่น" ends when the video does. */
function useTick(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => set((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [on]);
}

function ItemEditor({ race, item }: { race: Race; item: HistoryItem }) {
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<HistoryItem>) => setIntro(race.id, (x) => ({ ...x, history: { ...x.history, items: x.history.items.map((y) => (y.id === item.id ? { ...y, ...p } : y)) } }));
  const names = [...new Set(race.runners.map((h) => h.name).filter(Boolean))];
  const addVideo = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const old = item.video;
    const { name, duration } = await storeVideo(f);
    update((x) => ({ ...x, images: { ...x.images, [name]: Date.now() } }));
    set({ video: name, duration });
    setBusy(false);
    await dropUnused([old]);
  };
  const removeVideo = async () => {
    const old = item.video;
    set({ video: null, duration: null });
    await dropUnused([old]);
  };
  const id = `hi-${item.id}`;
  return (
    <motion.div className="grid gap-2 overflow-hidden border border-line bg-panel p-2.5" data-testid="history-edit"
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
      <Field id={`${id}-year`} label="ปี (ตัวใหญ่บนการ์ด)">
        <input id={`${id}-year`} className={inputClass} type="number" min={1800} max={2200} value={item.year ?? ""} onChange={(e) => set({ year: e.target.value ? Math.round(+e.target.value) : null })} />
      </Field>
      <Field id={`${id}-date`} label="วันที่ (ขึ้นตอนเล่นวิดีโอ)">
        <input id={`${id}-date`} className={inputClass} type="date" value={item.date} onChange={(e) => set({ date: e.target.value, year: item.year ?? (e.target.value ? +e.target.value.slice(0, 4) : null) })} />
      </Field>
      <Field id={`${id}-title`} label="หัวข้อ">
        <input id={`${id}-title`} className={inputClass} value={item.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <label className="grid gap-1 text-[13px]" htmlFor={`${id}-text`}>ข้อความ
        <textarea id={`${id}-text`} rows={3} className={cx(inputClass, "resize-y")} value={item.text} onChange={(e) => set({ text: e.target.value })} />
      </label>
      <Field id={`${id}-horses`} label="ม้าที่เกี่ยวข้อง">
        <input id={`${id}-horses`} className={inputClass} placeholder="คั่นด้วย , เช่น Equinox, Do Deuce" list={`${id}-names`} value={item.horses.join(", ")}
          onChange={(e) => set({ horses: e.target.value.split(",").map((x) => x.trim()).filter((x, i, a) => x || i === a.length - 1) })}
          onBlur={() => set({ horses: item.horses.filter(Boolean) })} />
      </Field>
      <datalist id={`${id}-names`}>{names.map((n) => <option key={n} value={n} />)}</datalist>
      <div className="flex flex-wrap items-center gap-1.5">
        <label className={buttonClass("primary")} htmlFor={`${id}-video`}>{busy ? "กำลังเก็บวิดีโอ…" : item.video ? "เปลี่ยนวิดีโอ…" : "เลือกวิดีโอไฮไลต์…"}</label>
        <input id={`${id}-video`} type="file" accept="video/*" hidden data-testid="history-video-file" onChange={(e) => { addVideo(e.target.files?.[0]); e.target.value = ""; }} />
        {item.video && <Button onClick={removeVideo}>ไม่ใช้วิดีโอ</Button>}
        {item.video && <span className="text-xs text-ink-muted" data-testid="history-video-name">{item.video}{item.duration ? ` · ${mmss(item.duration)}` : ""}</span>}
      </div>
      <span className={hintClass}>วิดีโอเก็บในเบราว์เซอร์เครื่องนี้ (ไฟล์ JSON มีแค่ชื่อ) ย้ายเครื่องใช้ .zip จาก Chrome · ใน OBS ติ๊ก "Control audio via OBS" ที่ Browser Source เพื่อให้เสียงเข้ามิกเซอร์</span>
    </motion.div>
  );
}

export function HistoryPanel({ race }: { race: Race }) {
  const d = useData();
  const h = race.intro.history;
  const [editing, setEditing] = useState<string | null>(null);
  const playing = playingItem(race);
  useTick(!!h.play);
  const setH = (fn: (x: Race["intro"]["history"]) => Race["intro"]["history"]) => setIntro(race.id, (x) => ({ ...x, history: fn(x.history) }));
  const courseOn = d.active === introOf("course", race.id);
  const add = () => {
    const id = newId();
    setH((x) => ({ ...x, items: [...x.items, { id, year: +race.date.slice(0, 4) - 1 || null, date: "", title: "", text: "", horses: [], video: null, duration: null }] }));
    setEditing(id);
  };
  const remove = async (item: HistoryItem) => {
    setH((x) => ({ ...x, items: x.items.filter((y) => y.id !== item.id), selected: x.selected === item.id ? null : x.selected, play: x.play?.id === item.id ? null : x.play }));
    await dropUnused([item.video]);
  };
  const move = (i: number, j: number) => setH((x) => {
    const items = [...x.items];
    const [m] = items.splice(i, 1);
    items.splice(j, 0, m);
    return { ...x, items };
  });
  const play = (item: HistoryItem) => setH((x) => ({ ...x, open: true, selected: item.id, play: { id: item.id, at: Date.now() } }));
  const stop = () => setH((x) => ({ ...x, play: null }));
  return (
    <div className="grid gap-3" role="tabpanel" aria-labelledby="sub-history">
      {!courseOn && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
          ประวัติขึ้นจอทับฉากสนาม
          <Button variant="primary" onClick={() => update((x) => ({ ...x, active: introOf("course", race.id) }))}>ตั้งฉากสนามเป็น Active</Button>
        </div>
      )}
      <Section title="Modal ประวัติ">
        <Switch on={h.open} label="เปิด modal ประวัติบนจอ" testId="history-open" onToggle={() => setH((x) => ({ ...x, open: !x.open, play: x.open ? null : x.play }))} />
        {playing && (
          <div className="flex items-center justify-between gap-2 border border-yellow px-2.5 py-1.5 text-[13px]" role="status" data-testid="history-playing">
            <span>▶ กำลังเล่น: {playing.year} {playing.title}</span>
            <Button variant="danger" onClick={stop}>หยุด</Button>
          </div>
        )}
        <span className={hintClass}>กด "เลือก" เพื่อเน้นการ์ดบนจอ · กด ▶ เพื่อเล่นวิดีโอ เสียงค่อยๆ ดังขึ้น จบแล้วเสียงค่อยๆ เบาลงและยุบกลับเข้าการ์ดเอง</span>
      </Section>
      <Section title={`เหตุการณ์ ${h.items.length} รายการ`}>
        <div className="grid gap-1.5" data-testid="history-list">
          {h.items.map((x, i) => {
            const sel = h.selected === x.id, isPlaying = playing?.id === x.id;
            return (
              <div key={x.id} className="grid gap-1.5">
                <div className={cx("grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2 border bg-studio px-2 py-1.5", sel ? "border-yellow" : "border-line")} data-testid="history-row">
                  <span className="bg-navy py-0.5 text-center font-display text-[17px] font-bold">{x.year ?? "–"}</span>
                  <button type="button" className="min-w-0 truncate text-left text-[13px]" aria-expanded={editing === x.id} onClick={() => setEditing((e) => (e === x.id ? null : x.id))}>
                    {x.title || <span className="text-ink-muted">(ไม่มีหัวข้อ)</span>}{x.video && <span className="ml-1 text-ink-muted">· 🎬</span>}
                  </button>
                  <span className="flex gap-1">
                    <Button className="px-2 py-[3px] text-xs" variant={sel ? "primary" : "default"} aria-pressed={sel} aria-label={`เลือก ${x.title}`}
                      onClick={() => setH((y) => ({ ...y, open: true, selected: y.selected === x.id ? null : x.id }))}>เลือก</Button>
                    {x.video && (isPlaying
                      ? <Button className="px-2 py-[3px] text-xs" variant="danger" aria-label={`หยุด ${x.title}`} onClick={stop}>■</Button>
                      : <Button className="px-2 py-[3px] text-xs" aria-label={`เล่น ${x.title}`} onClick={() => play(x)}>▶</Button>)}
                    <Button className="px-1.5 py-[3px] text-xs" aria-label={`เลื่อน ${x.title} ขึ้น`} disabled={i === 0} onClick={() => move(i, i - 1)}>▲</Button>
                    <Button className="px-1.5 py-[3px] text-xs text-danger-ink" aria-label={`ลบ ${x.title}`} onClick={() => remove(x)}>✕</Button>
                  </span>
                </div>
                <AnimatePresence>{editing === x.id && <ItemEditor key="edit" race={race} item={x} />}</AnimatePresence>
              </div>
            );
          })}
        </div>
        <Button className="justify-self-start" onClick={add}>+ เพิ่มเหตุการณ์</Button>
      </Section>
    </div>
  );
}
