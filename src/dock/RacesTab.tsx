/** Tab "ภาพรวม": pick Active (home or a race), import/export, order, delete, home page settings, URL. */
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { BLANK, exportFile, HOME, mergeImport, newPhotos, newCard, newResult, parseActive, resultOf, newId, newStyle, parseFile, TRANSITIONS, type AppData, type ParseResult, type Race, type Transition } from "../lib/model";
import { getData, setData, update, updateRace, useData } from "../lib/store";
import { checkImportImages, clearAllImages, dropUnused, storeImage } from "../lib/imageStore";
import { isZip, readBundle } from "../lib/bundle";
import { imageRefs } from "../lib/imageRefs";
import { putImage } from "../lib/images";
import { sampleRunner } from "../lib/sample";
import { showPage, useResultPage } from "../lib/results";
import { HOME_ROWS, paginate } from "../lib/paging";
import { PageButtons } from "../components/PageButtons";
import { ExportPanel } from "./ExportPanel";
import { CardPageButtons } from "./CardPagesSection";
import { cx } from "../lib/cx";
import { Button, buttonClass } from "../components/Button";
import { Field, inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { Switch } from "../components/Switch";
import type { Toast } from "./Dock";

const TRANSITION_LABEL: Record<Transition, string> = { wipe: "Wipe (แถบเหลืองกวาดจากซ้าย)", slide: "Slide (เลื่อนเข้าจากขวา)", fade: "Fade (จางเข้า)", none: "ไม่มี (ตัดทันที)" };
const stamp = () => new Date().toISOString().slice(0, 10).replaceAll("-", "");
const rowGrid = "grid grid-cols-[22px_minmax(0,1fr)_30px] gap-1";
const sideBtn = "border border-line bg-studio";
/** The replace button says what it replaces: only what the file holds. */
const replaceLabel = (f: { races: unknown[]; horses: unknown[] }) =>
  f.races.length && f.horses.length ? "แทนที่ทั้งหมด" : f.horses.length ? "แทนที่ม้าทั้งหมด" : "แทนที่รายการแข่งทั้งหมด";
/** "3 รายการ", "1 ม้า" or "3 รายการ · 1 ม้า": what a file holds. */
const importCount = (f: { races: unknown[]; horses: unknown[] }) =>
  [f.races.length ? `${f.races.length} รายการ` : "", f.horses.length ? `ม้า ${f.horses.length} ตัว` : ""].filter(Boolean).join(" · ");

/** One clickable row: a round tag, title + facts, and on the right the ACTIVE badge (+ extra buttons). */
function ActiveRow({ id, on, round, title, facts, label, onPick, side, home, badge = "ACTIVE" }: {
  id: string; on: boolean; round: string; title: string; facts: string; label: string; onPick: () => void; side?: ReactNode; home?: boolean; badge?: string;
}) {
  return (
    <div data-id={id} className={cx("relative grid w-full grid-cols-[minmax(44px,auto)_minmax(0,1fr)_auto] items-center gap-2.5 border bg-studio px-2.5 py-2 text-left", on ? "border-yellow" : "border-line")}>
      <button type="button" className="absolute inset-0" aria-pressed={on} aria-label={label} onClick={onPick} />
      <span className={cx("max-w-[110px] truncate bg-navy px-1.5 py-0.5 text-center font-display font-bold", home ? "text-[15px] tracking-[.04em]" : "text-xl")}>{round}</span>
      <span className="pointer-events-none min-w-0">
        <b className="block truncate font-display text-lg font-bold uppercase">{title}</b>
        <small className="text-xs text-ink-muted">{facts}</small>
      </span>
      <span className="relative grid justify-items-end gap-1.5">
        <span className={cx("bg-yellow px-2 py-0.5 text-[11px] font-semibold text-navy", !on && "invisible")}>{badge}</span>
        {side}
      </span>
    </div>
  );
}

/** Page buttons under a race whose result is on screen; the page on screen follows auto page turning. */
function QuickResultPages({ race }: { race: Race }) {
  const p = useResultPage(race);
  return (
    <PageButtons label="หน้าผล" count={p.pageCount} page={p.page} className="mt-1 ml-[26px]" testId="quick-result-pages"
      onPick={(i) => updateRace(race.id, (r) => ({ ...r, result: showPage(r, i) }))} />
  );
}

export function RacesTab({ onEdit, toast }: { onEdit: (id: string) => void; toast: Toast }) {
  const d = useData();
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, setPending] = useState<{ name: string; data: Extract<ParseResult, { ok: true }>["data"]; images?: Record<string, Blob> } | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [exportName, setExportName] = useState<string | null>(null);
  const [paste, setPaste] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const overlayUrl = `${location.origin}${location.pathname}#/overlay`;

  const home = paginate(d.races, HOME_ROWS, d.home.page);
  const setHomePage = (i: number) => update((x) => ({ ...x, home: { ...x.home, page: i } }));
  const homePages = <PageButtons label="หน้า" count={home.pageCount} page={home.page} onPick={setHomePage} className="ml-[26px]" testId="quick-home-pages" />;
  const setActive = (id: string) => update((x) => ({ ...x, active: id }));
  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    const bytes = new Uint8Array(await f.arrayBuffer());
    // a .zip from "บันทึก .zip พร้อมรูป": the JSON plus its pictures
    if (isZip(bytes)) {
      const z = readBundle(bytes);
      if (!z.ok) return toast(`นำเข้าไม่ได้: ${z.error}`, true);
      const res = parseFile(z.text);
      if (!res.ok) return toast(`นำเข้าไม่ได้: ${res.error}`, true);
      return setPending({ name: f.name, data: res.data, images: z.images });
    }
    const res = parseFile(new TextDecoder().decode(bytes));
    if (!res.ok) return toast(`นำเข้าไม่ได้: ${res.error}`, true);
    setPending({ name: f.name, data: res.data });
  };
  const pickText = () => {
    const res = parseFile(paste ?? "");
    if (!res.ok) return toast(`นำเข้าไม่ได้: ${res.error}`, true);
    setPending({ name: "ข้อความที่วาง", data: res.data });
    setPaste(null);
  };
  const doImport = async (mode: "append" | "replace") => {
    if (!pending) return;
    setPending(null);
    // pictures that came in the .zip are stored first (only those the data names)
    const wanted = new Set(imageRefs(pending.data));
    for (const [k, b] of Object.entries(pending.images ?? {})) if (wanted.has(k)) await putImage(k, b);
    // pictures the file names but this browser doesn't have (or can't open) are taken out of it
    const { file, found, missing } = await checkImportImages(pending.data);
    const next = mergeImport(getData(), file, mode);
    const now = Date.now();
    setData({ ...next, images: { ...next.images, ...Object.fromEntries(found.filter((k) => !next.images[k]).map((k) => [k, now])) } });
    if (missing.length) toast(`นำเข้า ${importCount(file)}แล้ว แต่ไม่พบรูปในเครื่องนี้หรือไฟล์รูปเสีย ${missing.length} รูป จึงเอาออกจากข้อมูล: ${missing.join(", ")}`, true);
    else toast(`นำเข้า ${importCount(file)}แล้ว`);
  };
  const addRace = () => {
    const id = newId();
    update((x) => ({
      ...x,
      races: [...x.races, { id, date: new Date().toISOString().slice(0, 10), course: "", round: "", postTime: "", name: "New Race", jpName: "", subtitle: "", grade: null, jump: false, class: null, surface: "Turf", distanceM: null, highlight: null, style: newStyle(), result: newResult(), card: newCard(), photos: newPhotos(), runners: Array.from({ length: 8 }, (_, i) => ({ ...sampleRunner(i), name: `Horse ${i + 1}`, jockey: "", fav: null, horseWeight: null, horseWeightChange: null, weight: null })) }],
    }));
    onEdit(id);
  };
  const remove = (id: string) => {
    const race = d.races.find((r) => r.id === id);
    const keys = race ? [...race.photos.card.keys, ...race.photos.result.keys] : [];
    update((x): AppData => ({
      ...x,
      races: x.races.filter((r) => r.id !== id),
      active: parseActive(x.active).raceId === id ? HOME : x.active,
      home: { ...x.home, highlight: x.home.highlight === id ? null : x.home.highlight },
    }));
    dropUnused(keys);
    setConfirmDel(null);
  };
  const move = (from: number, to: number) => {
    if (from === to) return;
    update((x) => {
      const races = [...x.races];
      const [m] = races.splice(from, 1);
      races.splice(to, 0, m);
      return { ...x, races };
    });
  };
  const setBg = async (f: File | undefined) => {
    if (!f) return;
    const old = d.home.background, name = await storeImage(f);
    update((x) => ({ ...x, images: { ...x.images, [name]: Date.now() }, home: { ...x.home, background: name } }));
    await dropUnused([old]);
  };
  const clearBg = async () => {
    const old = d.home.background;
    update((x) => ({ ...x, home: { ...x.home, background: null } }));
    await dropUnused([old]);
  };
  const clearPictures = async () => {
    setConfirmClear(false);
    try { await clearAllImages(); toast("ลบรูปทั้งหมดในเครื่องนี้แล้ว"); }
    catch { toast("ลบรูปไม่สำเร็จ", true); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(overlayUrl); toast("คัดลอก URL แล้ว"); }
    catch { toast("คัดลอกไม่ได้ ให้เลือกข้อความ URL แล้วคัดลอกเอง", true); }
  };

  return (
    <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-races" aria-labelledby="tab-races">
      <div className="flex flex-wrap gap-1.5">
        <Button variant="primary" onClick={() => fileRef.current?.click()}>นำเข้า JSON / .zip</Button>
        <input ref={fileRef} type="file" accept="application/json,.json,application/zip,.zip" hidden data-testid="import-file" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
        <Button onClick={() => { setPending(null); setPaste((p) => (p == null ? "" : null)); }} aria-expanded={paste != null}>วาง JSON</Button>
        <Button onClick={() => setExportName((x) => (x ? null : `otamasing-broadcast-compact-${stamp()}.json`))} aria-expanded={!!exportName}>ส่งออก</Button>
        <Button onClick={addRace}>+ เพิ่มเอง</Button>
      </div>
      <AnimatePresence>
        {exportName && <ExportPanel key="export" job={{ name: exportName, text: JSON.stringify(exportFile(d), null, 2), count: d.races.length }} onClose={() => setExportName(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {paste != null && (
          <motion.div key="paste" role="dialog" aria-label="วาง JSON" className="grid gap-1.5 overflow-hidden border border-line px-2.5 py-2 text-[13px]"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <textarea aria-label="ข้อความ JSON ที่จะนำเข้า" data-testid="paste-text" rows={5} value={paste} placeholder='{ "races": [ ... ] }' autoFocus
              className="w-full min-w-0 resize-y border border-line bg-panel px-1.5 py-[5px] font-mono text-[11px] leading-snug text-ink" onChange={(e) => setPaste(e.target.value)} />
            <span className="flex flex-wrap gap-1.5">
              <Button variant="primary" disabled={!paste.trim()} onClick={pickText}>นำเข้าข้อความนี้</Button>
              <Button onClick={() => setPaste(null)}>ยกเลิก</Button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pending && (
          <motion.div role="alertdialog" aria-label="ยืนยันการนำเข้า" className="flex flex-wrap items-center justify-between gap-1.5 overflow-hidden border border-yellow px-2.5 py-2 text-[13px]"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <span>{pending.name}: {importCount(pending.data)}{pending.images ? ` · รูป ${Object.keys(pending.images).length} รูป` : ""}</span>
            <span className="flex flex-wrap gap-1.5">
              <Button variant="primary" onClick={() => doImport("append")}>เพิ่มต่อ</Button>
              <Button onClick={() => doImport("replace")}>{replaceLabel(pending.data)}</Button>
              <Button onClick={() => setPending(null)}>ยกเลิก</Button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-1.5" data-testid="race-list">
        <div className={rowGrid}>
          <span />
          <ActiveRow id={BLANK} home on={d.active === BLANK} round="BLANK" title="หน้าเปล่า" label="ตั้งหน้าเปล่าเป็น Active" onPick={() => setActive(BLANK)}
            facts="ไม่แสดงอะไรบนจอ (โปร่งใส)" />
          <span />
        </div>
        <div className={rowGrid}>
          <span />
          <ActiveRow id={HOME} home on={d.active === HOME} round="HOME" title={`หน้าแรก · ${d.home.title}`} label="ตั้งหน้าแรกเป็น Active" onPick={() => setActive(HOME)}
            facts={`รายการแข่งขันทั้งหมด ${d.races.length} รายการ${d.home.subtitle ? ` · ${d.home.subtitle}` : ""}`} />
          <span />
        </div>
        {d.active === HOME && homePages}
        {d.races.map((x, i) => {
          const name = `${x.round} ${x.name}`.trim();
          const a = parseActive(d.active);
          const on = a.raceId === x.id, resultOn = on && a.view === "result";
          return confirmDel === x.id ? (
            <motion.div layout key={x.id} className="flex items-center justify-between gap-1.5 border border-danger-ink px-2.5 py-2 text-[13px]">
              <span>ลบ {name}? ลบแล้วกู้คืนไม่ได้</span>
              <span className="flex flex-wrap gap-1.5">
                <Button variant="danger" onClick={() => remove(x.id)}>ลบ</Button>
                <Button onClick={() => setConfirmDel(null)}>ยกเลิก</Button>
              </span>
            </motion.div>
          ) : (
            // motion only animates the reorder; the drag and drop itself is native HTML5 on the inner div
            <motion.div layout="position" transition={{ duration: 0.2 }} key={x.id}>
            <div data-testid="race-row"
              className={cx(rowGrid, "items-stretch", dragFrom === i && "opacity-40", over === i && dragFrom !== null && dragFrom !== i && "shadow-[0_-3px_0_var(--color-yellow)]")}
              draggable
              onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
              onDragOver={(e) => { if (dragFrom === null) return; e.preventDefault(); setOver(i); }}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); setOver(null); }}
              onDragEnd={() => { setDragFrom(null); setOver(null); }}>
              <span className="grid cursor-grab place-items-center text-base text-ink-muted select-none" aria-hidden="true">⠿</span>
              <ActiveRow id={x.id} on={on} badge={resultOn ? "ACTIVE · ผล" : "ACTIVE"} round={x.round || "–"} title={x.name} label={`ตั้ง ${name} เป็น Active`} onPick={() => setActive(x.id)}
                facts={[x.date.replaceAll("-", "."), x.course, `${x.surface}${x.distanceM ? ` ${x.distanceM}m` : ""}`, `${x.runners.length} ตัว`].filter(Boolean).join(" · ")}
                side={
                  <span className="flex gap-1">
                    <Button variant={resultOn ? "primary" : "default"} className="px-2.5 py-[3px] text-xs" aria-pressed={resultOn} aria-label={`ตั้งผล ${name} เป็น Active`} onClick={() => setActive(resultOf(x.id))}>ผล</Button>
                    <Button className="px-3 py-[3px] text-xs" aria-label={`แก้ไข ${name}`} onClick={() => onEdit(x.id)}>แก้ไข</Button>
                  </span>
                } />
              <span className="grid grid-rows-[auto_1fr] gap-1">
                <button type="button" className={cx(sideBtn, "py-0.5 text-[11px] text-ink-muted disabled:opacity-30")} aria-label={`เลื่อน ${x.round} ขึ้น`} disabled={i === 0} onClick={() => move(i, i - 1)}>▲</button>
                <button type="button" className={cx(sideBtn, "text-danger-ink")} aria-label={`ลบ ${name}`} onClick={() => setConfirmDel(x.id)}>✕</button>
              </span>
            </div>
            {resultOn && <QuickResultPages race={x} />}
            {on && !resultOn && <CardPageButtons race={x} className="mt-1 ml-[26px]" testId="quick-card-pages" />}
            </motion.div>
          );
        })}
      </div>
      <p className={hintClass}>กดแถวไหนก็ได้เพื่อตั้งเป็น Active จอจะเปลี่ยนพร้อมทรานซิชัน · กดแถวรายการ = การ์ดรายชื่อม้า, ปุ่ม "ผล" = หน้าผลการแข่งขัน, "หน้าเปล่า" = เอากราฟิกออกจากจอ · ลาก ⠿ (หรือกด ▲) เพื่อเรียงลำดับ หน้าแรกเรียงตามนี้ · ข้อมูลเก็บในเครื่องนี้ ย้ายเครื่องใช้ส่งออก/นำเข้า JSON</p>

      <Section title={<label htmlFor="trans">ทรานซิชันตอนเปลี่ยน Active</label>}>
        <select id="trans" className={inputClass} value={d.transition} onChange={(e) => update((x) => ({ ...x, transition: e.target.value as Transition }))}>
          {TRANSITIONS.map((t) => <option key={t} value={t}>{TRANSITION_LABEL[t]}</option>)}
        </select>
      </Section>

      <Section title="หน้าแรก (รายการแข่งขัน)">
        <Field id="l-title" label="Title"><input className={inputClass} id="l-title" value={d.home.title} onChange={(e) => update((x) => ({ ...x, home: { ...x.home, title: e.target.value } }))} /></Field>
        <Field id="l-sub" label="Sub title (วันที่)"><input className={inputClass} id="l-sub" value={d.home.subtitle} onChange={(e) => update((x) => ({ ...x, home: { ...x.home, subtitle: e.target.value } }))} /></Field>
        <div className="flex flex-wrap gap-1.5">
          <label className={buttonClass("primary")} htmlFor="l-bg">เลือก BG…</label>
          <input type="file" id="l-bg" accept="image/*" hidden onChange={(e) => { setBg(e.target.files?.[0]); e.target.value = ""; }} />
          {d.home.background ? <Button onClick={clearBg}>ไม่ใช้รูป</Button> : null}
        </div>
        <Switch on={d.home.showDate} label="คอลัมน์วันที่" testId="home-show-date" onToggle={() => update((x) => ({ ...x, home: { ...x.home, showDate: !x.home.showDate } }))} />
        <Switch on={d.home.showCourse} label="คอลัมน์สนาม" testId="home-show-course" onToggle={() => update((x) => ({ ...x, home: { ...x.home, showCourse: !x.home.showCourse } }))} />
        <PageButtons label="หน้า" count={home.pageCount} page={home.page} onPick={setHomePage} testId="home-pages" />
        <span className={hintClass}>หน้าละ {HOME_ROWS} รายการ ตามลำดับในรายการด้านบน{home.pageCount > 1 ? ` · ทั้งหมด ${home.pageCount} หน้า` : ""}</span>
        <span className={hintClass}>ไฮไลต์รายการบนหน้าแรก (แยกจาก Active, กดซ้ำเพื่อเอาออก, ถ้าอยู่หน้าอื่นจะเปลี่ยนไปหน้านั้นให้)</span>
        <div className="flex flex-wrap gap-1">
          {d.races.map((x, i) => {
            const on = d.home.highlight === x.id;
            return (
              <button key={x.id} type="button" data-lh={x.id} aria-pressed={on} title={x.name}
                className={cx("max-w-[140px] truncate border-2 px-3 py-[3px] font-display text-[17px] font-bold", on ? "border-yellow bg-yellow text-navy" : "border-white bg-navy text-white")}
                // highlighting a race on another page also turns to that page
                onClick={() => update((y) => ({ ...y, home: y.home.highlight === x.id ? { ...y.home, highlight: null } : { ...y.home, highlight: x.id, page: Math.floor(i / HOME_ROWS) } }))}>{x.round || x.name}</button>
            );
          })}
        </div>
      </Section>

      <Section title="URL สำหรับ Browser Source ใน OBS">
        <div className="flex items-center gap-1.5">
          <code title={overlayUrl} className="min-w-0 flex-1 truncate border border-line bg-panel px-1.5 py-[5px] text-xs text-ink-muted">{overlayUrl}</code>
          <Button onClick={copy}>คัดลอก</Button>
        </div>
        <span className={hintClass}>ใส่ Browser Source ตัวเดียว ขนาด 1920×1080</span>
      </Section>

      <Section title="รูปที่เก็บในเครื่องนี้">
        <span className="text-[13px]" data-testid="stored-count">{Object.keys(d.images).length} รูป</span>
        {confirmClear ? (
          <div className="grid gap-1.5 border border-danger-ink p-2.5 text-[13px]" role="alertdialog" aria-label="ยืนยันลบรูปทั้งหมด">
            <span className="font-semibold text-danger-ink">⚠ ปุ่มอันตราย: รูปทุกรูปที่เก็บไว้ในเครื่องนี้จะหายไปหมด กู้คืนไม่ได้</span>
            <span>รูปฉากหลัง รูปม้า รูปสีเสื้อที่อัป และ BG หน้าแรกของทุกรายการจะถูกลบ ข้อมูลอื่นยังอยู่ ไฟล์ JSON ที่ส่งออกไว้ก่อนหน้าจะหารูปไม่เจอ</span>
            <span className="flex flex-wrap gap-1.5">
              <Button variant="danger" onClick={clearPictures}>ลบรูปทั้งหมดเลย</Button>
              <Button onClick={() => setConfirmClear(false)}>ยกเลิก</Button>
            </span>
          </div>
        ) : (
          <Button variant="danger" className="justify-self-start" onClick={() => setConfirmClear(true)}>ลบรูปทั้งหมดในเครื่อง…</Button>
        )}
        <span className={hintClass}>ปุ่มอันตราย ใช้เมื่ออยากคืนพื้นที่ รูปทุกรูปที่เก็บไว้จะหายไปหมด</span>
      </Section>
    </div>
  );
}
