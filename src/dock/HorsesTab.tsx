/**
 * Tab "ม้า": horse profiles. Pick a horse, put it on screen, edit its facts, pictures (a slideshow), owner's silks (upload, pattern or none)
 * and past races; the currency prize money is shown in applies to every horse.
 */
import { AnimatePresence } from "motion/react";
import { useState, type ReactNode } from "react";
import { exportHorse, horseOf, HOME, newId, parseActive, type AppData } from "../lib/model";
import {
  COATS, CURRENCIES, HorseSchema, careerNewestFirst, posText, rateOf, recordFromRaces, recordText, setHorseAuto, showHorsePage, useHorsePage, dotDate,
  CAREER_GRADES, CareerRaceSchema, SilksSchema, SILKS_BODY, SILKS_MODES, SILKS_SLEEVES, silksModeOf, type CareerRace, type SilksMode, type Silks, type Coat, type Currency, type Horse,
} from "../lib/horses";
import { update, useData } from "../lib/store";
import { useImage } from "../lib/images";
import { dropUnused, storeImage } from "../lib/imageStore";
import { cx } from "../lib/cx";
import { Button, buttonClass } from "../components/Button";
import { Field, inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { Switch } from "../components/Switch";
import { PageButtons } from "../components/PageButtons";
import { SilksSvg } from "../components/SilksSvg";
import { Stage } from "../overlay/Stage";
import { HorseScene } from "../overlay/HorseScene";
import { FlagPicker } from "./FlagPicker";
import { ExportPanel } from "./ExportPanel";
import { Thumb } from "./PhotoSetEditor";
import { setAuto, showPhoto, shownIndex, useShownIndex } from "../lib/photos";

const CODES = Object.keys(CURRENCIES) as Currency[];
const num = (v: string) => (v === "" ? null : Math.max(0, Math.round(+v)));

const updateHorse = (id: string, fn: (h: Horse) => Horse) => update((d) => ({ ...d, horses: d.horses.map((h) => (h.id === id ? fn(h) : h)) }));

/** One picture (the owner's silks): upload, replace, remove. `value` is the stored picture's name; `onChange` puts a new name (or null) in the data. */
function PictureField({ value, onChange, label, testId, contain, light }: { value: string | null; onChange: (x: AppData, name: string | null) => AppData; label: string; testId: string; contain?: boolean; light?: boolean }) {
  const d = useData();
  const url = useImage(value ?? "", value ? d.images[value] : undefined);
  const put = async (f: File | undefined) => {
    if (!f) return;
    const name = await storeImage(f);
    update((x) => onChange({ ...x, images: { ...x.images, [name]: Date.now() } }, name));
    await dropUnused([value]);
  };
  const remove = async () => {
    update((x) => onChange(x, null));
    await dropUnused([value]);
  };
  return (
    <div className="grid gap-1.5 text-[13px]">
      <span>{label}</span>
      <div className={cx("aspect-video border border-line bg-center bg-no-repeat", contain ? "bg-contain" : "bg-cover", light && url ? "bg-white" : "bg-panel")} data-testid={`${testId}-thumb`}
        style={{ backgroundImage: url ? `url("${url}")` : undefined }}>
        {!url && <span className="grid h-full place-items-center text-xs text-ink-muted">ยังไม่มีรูป</span>}
      </div>
      <span className="flex flex-wrap gap-1.5">
        <label className={buttonClass("primary")} htmlFor={testId}>{url ? "เปลี่ยนรูป…" : "เลือกรูป…"}</label>
        <input type="file" id={testId} data-testid={testId} accept="image/*,.svg" hidden onChange={(e) => { put(e.target.files?.[0]).finally(() => { e.target.value = ""; }); }} />
        {url && <Button onClick={remove}>ลบรูป</Button>}
      </span>
    </div>
  );
}

type PhotoSet = Horse["photos"];

/** The horse's pictures: add several, remove, pick the one on screen (or step with ◀ ▶), and the automatic slideshow. */
function HorsePhotosSection({ h }: { h: Horse }) {
  const d = useData();
  const set = h.photos;
  const shown = useShownIndex(set);
  const n = set.keys.length;
  const save = (fn: (s: PhotoSet) => PhotoSet) => updateHorse(h.id, (x) => ({ ...x, photos: fn(x.photos) }));
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const keys: string[] = [];
    for (const f of Array.from(files)) keys.push(await storeImage(f));
    const now = Date.now();
    update((x) => ({
      ...x,
      images: { ...x.images, ...Object.fromEntries(keys.map((k) => [k, now])) },
      horses: x.horses.map((y) => (y.id === h.id ? { ...y, photos: { ...y.photos, keys: [...y.photos.keys, ...keys] } } : y)),
    }));
  };
  const remove = async (k: string) => {
    update((x) => {
      return {
        ...x,
        horses: x.horses.map((y) => {
          if (y.id !== h.id) return y;
          const s = y.photos, at = s.keys.indexOf(k), cur = Math.max(0, shownIndex(s));
          const keys = s.keys.filter((z) => z !== k);
          return { ...y, photos: showPhoto({ ...s, keys }, cur > at ? cur - 1 : cur) };
        }),
      };
    });
    await dropUnused([k]);
  };
  return (
    <Section title="รูปม้า (ซ้ายจอ)">
      {n > 0 && (
        <div className="grid grid-cols-4 gap-1" data-testid="thumbs-horse">
          {set.keys.map((k, i) => <Thumb key={k} k={k} rev={d.images[k]} n={i + 1} on={i === shown} onShow={() => save((s) => showPhoto(s, i))} onRemove={() => remove(k)} />)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <label className={buttonClass("primary")} htmlFor="horse-photos">เพิ่มรูป…</label>
        <input type="file" id="horse-photos" data-testid="add-photos-horse" accept="image/*" multiple hidden onChange={(e) => { const f = e.target.files; add(f).finally(() => { e.target.value = ""; }); }} />
        {n > 1 && (
          <>
            <Button aria-label="รูปม้าก่อนหน้า" onClick={() => save((s) => showPhoto(s, shownIndex(s) - 1))}>◀</Button>
            <span className="text-xs text-ink-muted" data-testid="photo-pos-horse">{shown + 1} / {n}</span>
            <Button aria-label="รูปม้าถัดไป" onClick={() => save((s) => showPhoto(s, shownIndex(s) + 1))}>▶</Button>
          </>
        )}
      </div>
      {n > 1 && (
        <>
          <Switch on={set.auto} label="เปลี่ยนรูปอัตโนมัติ" testId="auto-horse-photos" onToggle={() => save((s) => setAuto(s, { auto: !s.auto }))} />
          <label className="flex items-center justify-between gap-3 text-[13px]" htmlFor="horse-photos-sec">
            <span className="whitespace-nowrap">ทุกกี่วินาที</span>
            <input id="horse-photos-sec" className={cx(inputClass, "w-20 text-center")} type="number" min={1} max={600} step={1} value={set.seconds}
              onChange={(e) => { const v = Math.round(+e.target.value); if (v >= 1 && v <= 600) save((s) => setAuto(s, { seconds: v })); }} />
          </label>
        </>
      )}
      <span className={hintClass}>เลือกได้หลายรูปพร้อมกัน · รูปแนวตั้งจะชัดที่สุด (ช่องรูปกว้าง 1/3 ของจอ) · กดรูปเล็กเพื่อขึ้นจอรูปนั้น · รูปเก็บในเครื่องนี้ ไม่อยู่ในไฟล์ JSON</span>
    </Section>
  );
}

function HorsePages({ h }: { h: Horse }) {
  const { page, count } = useHorsePage(h);
  const set = (patch: Parameters<typeof setHorseAuto>[1]) => updateHorse(h.id, (x) => ({ ...x, view: setHorseAuto(x, patch) }));
  return (
    <Section title="หน้าบนจอ">
      <PageButtons label="หน้า" count={count} page={page} testId="horse-pages" onPick={(i) => updateHorse(h.id, (x) => ({ ...x, view: showHorsePage(x, i) }))} />
      {count > 1 ? (
        <>
          <Switch on={h.view.auto} label="วนหน้าอัตโนมัติ" testId="horse-auto" onToggle={() => set({ auto: !h.view.auto })} />
          <label className="flex items-center justify-between gap-3 text-[13px]" htmlFor="horse-sec">
            <span className="whitespace-nowrap">เปลี่ยนหน้าทุกกี่วินาที</span>
            <input id="horse-sec" className={cx(inputClass, "w-20 text-center")} type="number" min={1} max={600} step={1} value={h.view.seconds}
              onChange={(e) => { const v = Math.round(+e.target.value); if (v >= 1 && v <= 600) set({ seconds: v }); }} />
          </label>
          <span className={hintClass}>หน้า 1 คือข้อมูลม้า หน้า 2 คือ Pedigree (ถ้าใส่พ่อแม่) หน้าต่อไปคือผลงาน 7 รายการต่อหน้า เรียงจากใหม่ไปเก่า</span>
        </>
      ) : <span className={hintClass}>ยังไม่มีผลงานและ Pedigree แสดงหน้าข้อมูลหน้าเดียว</span>}
    </Section>
  );
}

function CareerEditor({ h }: { h: Horse }) {
  const [open, setOpen] = useState<number | null>(null);
  const setRace = (i: number, patch: Partial<CareerRace>) => updateHorse(h.id, (x) => ({ ...x, races: x.races.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  // shown newest first, edited by their place in the stored list
  const order = careerNewestFirst({ races: h.races.map((r, i) => ({ ...r, i })) }) as (CareerRace & { i: number })[];
  const add = () => {
    const r = CareerRaceSchema.parse({ date: new Date().toISOString().slice(0, 10), name: "New Race" });
    updateHorse(h.id, (x) => ({ ...x, races: [...x.races, r] }));
    setOpen(h.races.length);
  };
  const cellIn = (i: number, k: keyof CareerRace, label: string, extra: Record<string, string> = {}) => (
    <label className="grid gap-0.5 text-[11px] text-ink-muted">
      {label}
      <input className={inputClass} aria-label={label} value={(h.races[i][k] as string | number | null) ?? ""} {...extra}
        onChange={(e) => setRace(i, { [k]: extra.type === "number" ? num(e.target.value) || null : e.target.value } as Partial<CareerRace>)} />
    </label>
  );
  return (
    <Section title={`ผลงาน ${h.races.length} รายการ`}>
      <div className="grid gap-1" data-testid="career-list">
        {order.map(({ i, ...r }) => (
          <div key={i} className="border border-line bg-panel">
            <button type="button" aria-expanded={open === i} onClick={() => setOpen((o) => (o === i ? null : i))}
              className="grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 text-left text-xs">
              <span className="text-ink-muted">{dotDate(r.date)}</span>
              <span className="truncate font-medium">{r.name}{r.grade && <span className="ml-1.5 bg-navy px-1 text-[10px]">{r.grade}</span>}</span>
              <span className="font-display text-sm font-bold">{posText(r)}</span>
            </button>
            {open === i && (
              <div className="grid gap-1.5 border-t border-line p-2" data-testid="career-edit">
                <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-1.5">
                  {cellIn(i, "date", "วันที่", { type: "date" })}
                  {cellIn(i, "name", "ชื่อรายการ")}
                </div>
                <div className="grid grid-cols-[76px_minmax(0,1fr)_76px_70px] gap-1.5">
                  <label className="grid gap-0.5 text-[11px] text-ink-muted">เกรด
                    <select className={inputClass} aria-label="เกรด" value={r.grade} onChange={(e) => setRace(i, { grade: e.target.value })}>
                      <option value="">–</option>
                      {/* a grade from an imported file that isn't in the list stays selectable */}
                      {[...CAREER_GRADES, ...(r.grade && !(CAREER_GRADES as readonly string[]).includes(r.grade) ? [r.grade] : [])].map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </label>
                  {cellIn(i, "course", "สนาม")}
                  <label className="grid gap-0.5 text-[11px] text-ink-muted">พื้น
                    <select className={inputClass} aria-label="พื้น" value={r.surface} onChange={(e) => setRace(i, { surface: e.target.value as CareerRace["surface"] })}>
                      {["Turf", "Dirt", "Jump"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                  {cellIn(i, "distanceM", "ระยะ (ม.)", { type: "number" })}
                </div>
                <div className="grid grid-cols-[50px_60px_70px_50px_minmax(0,1fr)] gap-1.5">
                  {cellIn(i, "fav", "เต็ง", { type: "number" })}
                  {cellIn(i, "finish", "อันดับ", { type: "number" })}
                  <label className="grid gap-0.5 text-[11px] text-ink-muted">ไม่จบ
                    <select className={inputClass} aria-label="ไม่จบ" value={r.outcome ?? ""} onChange={(e) => setRace(i, { outcome: (e.target.value || null) as CareerRace["outcome"], finish: e.target.value ? null : r.finish })}>
                      <option value="">–</option><option value="dnf">DNF</option><option value="dq">DQ</option>
                    </select>
                  </label>
                  {cellIn(i, "field", "จาก", { type: "number" })}
                  {cellIn(i, "time", "เวลา", { placeholder: "1:58.6" })}
                </div>
                {cellIn(i, "other", r.finish === 1 ? "ม้าที่ 2 (เราชนะ ขึ้นในวงเล็บ)" : "ม้าที่ชนะรายการ")}
                <Button variant="danger" className="justify-self-end" onClick={() => { setOpen(null); updateHorse(h.id, (x) => ({ ...x, races: x.races.filter((_, j) => j !== i) })); }}>ลบรายการนี้</Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button onClick={add}>+ เพิ่มผลงาน</Button>
      </div>
    </Section>
  );
}

const BODY_LABEL: Record<Silks["pattern"], string> = {
  plain: "Plain", hoop1: "Hoop", hoop2: "Two hoops", hoop3: "Three hoops", belt: "Belt", sash: "Sash", cross: "Crossbelts", stripes: "Stripes",
  seams: "Seams", braces: "Braces", halves: "Halves", quartered: "Quartered", check: "Check", harlequin: "Harlequin", diamondBand: "Diamonds",
  chevron: "Chevron", bigV: "Large V", sawtooth: "Zigzag", hash: "Hash", yoke: "Yoke", spots: "Spots", stars: "Stars", star: "Star", ring: "Ring", diamond: "Diamond",
  jaggedYoke: "Jagged yoke", zigzag2: "Double zigzag", zigzagBand: "Zigzag band", rings: "Rings", bigCheck: "Large check", bigHarlequin: "Large harlequin", bigDiamondBand: "Large diamonds",
  disc: "Disc (ball)", fleurDeLys: "Fleur-de-lys", spots3: "Three diagonal spots", triangle: "Triangle", sashReverse: "Sash (reversed)", blockGrid: "Block grid",
};
const SLEEVE_LABEL: Record<Silks["sleevePattern"], string> = {
  plain: "Plain", hoop1: "Armlet", hoop2: "Two armlets", hoop3: "Three armlets", stripes: "Stripes", chevrons: "Chevrons",
  diamonds: "Diamonds", check: "Check", spots: "Spots", stars: "Stars", cuffs: "Cuffs", halved: "Halved",
  hoop4: "Four armlets", hoop5: "Five armlets", stripesDense: "Fine stripes", zigzagBand: "Zigzag band", blocks: "Blocks", stripe1: "One stripe",
};

const MODE_LABEL: Record<SilksMode, string> = { upload: "Upload", pattern: "Pattern", none: "ไม่มี" };

/** The owner's silks: an uploaded picture (PNG or SVG), a pattern drawn as SVG (colours and patterns of the body and sleeves), or none. */
function SilksSection({ h }: { h: Horse }) {
  const mode = silksModeOf(h);
  const s = h.silks ?? SilksSchema.parse({});
  const set = (patch: Partial<Silks>) => updateHorse(h.id, (x) => ({ ...x, silks: { ...(x.silks ?? SilksSchema.parse({})), ...patch } }));
  const color = (k: "body" | "accent" | "sleeves" | "sleeveAccent", label: string) => (
    <label className="grid justify-items-center gap-0.5 text-[11px] text-ink-muted">{label}
      <input type="color" aria-label={`สีเสื้อ ${label}`} className="h-7 w-full cursor-pointer border border-line bg-transparent p-0" value={s[k]} onChange={(e) => set({ [k]: e.target.value.toUpperCase() })} />
    </label>
  );
  return (
    <Section title="สีเสื้อเจ้าของ">
      <div className="grid grid-cols-3 border border-line" role="radiogroup" aria-label="แบบสีเสื้อ">
        {SILKS_MODES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} data-testid={`silks-mode-${m}`}
            onClick={() => updateHorse(h.id, (x) => ({ ...x, silksMode: m, silks: m === "pattern" ? x.silks ?? SilksSchema.parse({}) : x.silks }))}
            className={cx("p-[7px] text-[13px]", mode === m ? "bg-yellow font-semibold text-navy" : "bg-studio text-ink-muted")}>{MODE_LABEL[m]}</button>
        ))}
      </div>
      {mode === "upload" && (
        <>
          <PictureField value={h.silksImage} onChange={(x, name) => ({ ...x, horses: x.horses.map((y: Horse) => (y.id === h.id ? { ...y, silksImage: name } : y)) })}
            label="รูปสีเสื้อ (PNG หรือ .svg ทรงเสื้อมีแขน)" testId="silks-file" contain light />
          <span className={hintClass}>บนจอจะอยู่ในกรอบสีขาว · รูปเก็บในเครื่องนี้ ไฟล์ JSON เก็บแค่ชื่อรูป{h.silksImage ? ` (${h.silksImage})` : ""}</span>
        </>
      )}
      {mode === "pattern" && (
        <>
          <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2">
            <span className="grid aspect-video place-items-center rounded-[6px] bg-white p-1"><SilksSvg silks={s} className="h-full w-full" /></span>
            <div className="grid gap-1.5">
              <select aria-label="ลายตัวเสื้อ" className={inputClass} value={s.pattern} onChange={(e) => set({ pattern: e.target.value as Silks["pattern"] })}>
                {SILKS_BODY.map((p) => <option key={p} value={p}>ตัว: {BODY_LABEL[p]}</option>)}
              </select>
              <select aria-label="ลายแขนเสื้อ" className={inputClass} value={s.sleevePattern} onChange={(e) => set({ sleevePattern: e.target.value as Silks["sleevePattern"] })}>
                {SILKS_SLEEVES.map((p) => <option key={p} value={p}>แขน: {SLEEVE_LABEL[p]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {color("body", "ตัว")}{color("accent", "ลายตัว")}{color("sleeves", "แขน")}{color("sleeveAccent", "ลายแขน")}
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <label className="flex items-center gap-1.5"><input type="checkbox" aria-label="บ่า (yoke) อีกสี" checked={s.yoke != null} onChange={(e) => set({ yoke: e.target.checked ? "#FFE600" : null })} />บ่า (yoke) อีกสี</label>
            {s.yoke != null && <input type="color" aria-label="สีเสื้อ บ่า" className="h-7 w-16 cursor-pointer border border-line bg-transparent p-0" value={s.yoke} onChange={(e) => set({ yoke: e.target.value.toUpperCase() })} />}
          </div>
          <span className={hintClass}>วาดเป็น SVG · สีและลายอยู่ในไฟล์ JSON ด้วย</span>
        </>
      )}
    </Section>
  );
}

function CurrencySection() {
  const d = useData();
  const s = d.horseSettings;
  const set = (patch: Partial<typeof s>) => update((x) => ({ ...x, horseSettings: { ...x.horseSettings, ...patch } }));
  return (
    <Section title="สกุลเงินรางวัล (ใช้กับม้าทุกตัว)">
      <select aria-label="สกุลเงินรางวัล" data-testid="horse-currency" className={inputClass} value={s.currency} onChange={(e) => set({ currency: e.target.value as typeof s.currency })}>
        <option value="own">ตามสกุลเงินของม้าแต่ละตัว</option>
        {CODES.map((c) => <option key={c} value={c}>{c} ({CURRENCIES[c].symbol.trim()})</option>)}
      </select>
      <details className="text-[13px]">
        <summary className="cursor-pointer text-ink-muted">อัตราแลกเปลี่ยน (ค่าของ 1 หน่วย เป็น USD)</summary>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {CODES.filter((c) => c !== "USD").map((c) => (
            <label key={c} className="grid gap-0.5 text-[11px] text-ink-muted">{c}
              <input className={inputClass} type="number" min={0} step="any" aria-label={`อัตรา ${c}`} value={rateOf(s, c)}
                onChange={(e) => { const v = +e.target.value; if (v > 0) set({ rates: { ...s.rates, [c]: v } }); }} />
            </label>
          ))}
        </div>
        <Button className="mt-1.5" onClick={() => set({ rates: {} })}>คืนค่าเริ่มต้น</Button>
      </details>
      <span className={hintClass}>ถ้าไม่ตรงกับสกุลเงินของม้า จะแปลงตามอัตราข้างบน และขึ้น ≈ หน้าตัวเลข</span>
    </Section>
  );
}

export function HorsesTab() {
  const d = useData();
  const a = parseActive(d.active);
  const [sel, setSel] = useState<string | null>(a.horseId ?? d.horses[0]?.id ?? null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [exporting, setExporting] = useState(false);
  const h = d.horses.find((x) => x.id === sel) ?? d.horses[0];

  const add = () => {
    const id = newId();
    update((x) => ({ ...x, horses: [...x.horses, { ...HorseSchema.parse({ name: "New Horse" }), id }] }));
    setSel(id);
  };
  const list = (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label="เลือกม้า">
      {d.horses.map((x) => {
        const on = x.id === h?.id;
        return (
          <button key={x.id} type="button" role="tab" data-horse={x.id} aria-selected={on} onClick={() => { setSel(x.id); setConfirmDel(false); setExporting(false); }}
            className={cx("inline-flex items-center gap-1.5 border px-2.5 py-1 font-display text-base leading-[normal] font-bold uppercase", on ? "border-yellow bg-yellow text-navy" : "border-line bg-studio text-ink-muted")}>
            {a.horseId === x.id && <span className="size-[7px] rounded-full bg-ok" title="Active" />}{x.name}
          </button>
        );
      })}
      <button type="button" onClick={add} className="border border-dashed border-line px-2.5 py-1 text-[13px] text-ink-muted">+ เพิ่มม้า</button>
    </div>
  );
  if (!h) return <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-horses">{list}<p className={hintClass}>ยังไม่มีม้า กด "+ เพิ่มม้า" หรือนำเข้า JSON ที่มี "horses" ได้ที่แท็บภาพรวม</p></div>;

  const isAct = a.horseId === h.id;
  const set = (patch: Partial<Horse>) => updateHorse(h.id, (x) => ({ ...x, ...patch }));
  const text = (k: "name" | "sire" | "dam" | "bms" | "sireSire" | "sireDam" | "damDam" | "owner" | "trainer", label: string, extra: Record<string, string> = {}) => (
    <Field id={`h-${k}`} label={label}>
      <input className={inputClass} id={`h-${k}`} value={h[k]} {...extra} onChange={(e) => set({ [k]: e.target.value })} />
    </Field>
  );
  const recIn = (k: keyof Horse["record"], label: string) => (
    <label className="grid gap-0.5 text-[11px] text-ink-muted">{label}
      <input className={inputClass} type="number" min={0} aria-label={`สถิติ ${label}`} value={h.record[k]} onChange={(e) => set({ record: { ...h.record, [k]: num(e.target.value) ?? 0 } })} />
    </label>
  );
  const flagRow = (k: "trainedIn" | "bornIn", label: string): ReactNode => (
    <Field id={`h-${k}`} label={label}>
      <span className="w-14"><FlagPicker label={label} value={h[k]} onChange={(c) => set({ [k]: c })} /></span>
    </Field>
  );
  const remove = async () => {
    const keys = [...h.photos.keys, h.silksImage];
    update((x) => ({ ...x, horses: x.horses.filter((y) => y.id !== h.id), active: x.active === horseOf(h.id) ? HOME : x.active }));
    dropUnused(keys);
    setConfirmDel(false);
    setSel(null);
  };

  return (
    <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-horses" aria-labelledby="tab-horses">
      {list}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>{isAct ? "ม้าตัวนี้ Active อยู่ แก้แล้วขึ้นจอทันที" : "ม้าตัวนี้ไม่ได้ Active (ดูพรีวิวด้านล่าง)"}</span>
        <span className="flex flex-wrap gap-1.5">
          {/* goes on screen from the profile page */}
          {!isAct && <Button variant="primary" onClick={() => update((x) => ({ ...x, active: horseOf(h.id), horses: x.horses.map((y) => (y.id === h.id ? { ...y, view: showHorsePage(y, 0) } : y)) }))}>ตั้งเป็น Active</Button>}
          <Button aria-expanded={exporting} onClick={() => setExporting((x) => !x)}>ส่งออกม้าตัวนี้</Button>
          <Button variant="danger" onClick={() => setConfirmDel(true)}>ลบ</Button>
        </span>
      </div>
      {confirmDel && (
        <div role="alertdialog" aria-label="ยืนยันลบม้า" className="flex flex-wrap items-center justify-between gap-2 border border-danger-ink bg-danger-bg px-2.5 py-2 text-[13px]">
          <span>ลบ {h.name} พร้อมรูปและผลงาน?</span>
          <span className="flex gap-1.5"><Button variant="danger" onClick={remove}>ลบเลย</Button><Button onClick={() => setConfirmDel(false)}>ยกเลิก</Button></span>
        </div>
      )}
      <AnimatePresence>
        {exporting && (
          <ExportPanel key="export" onClose={() => setExporting(false)}
            job={{ name: `horse-${h.name.replace(/\W+/g, "") || "horse"}.json`, text: JSON.stringify(exportHorse(d, h.id), null, 2), count: 1 }} />
        )}
      </AnimatePresence>
      {!isAct && <div className="relative aspect-video overflow-hidden border border-line" data-testid="horse-preview"><Stage className="pointer-events-none"><HorseScene horse={h} /></Stage></div>}

      <HorsePages h={h} />
      <CurrencySection />
      <HorsePhotosSection h={h} />
      <SilksSection h={h} />
      <Section title="ข้อมูลม้า">
        {text("name", "ชื่อม้า")}
        {flagRow("trainedIn", "ประเทศที่ฝึก")}
        {flagRow("bornIn", "ประเทศเกิด")}
        <Field id="h-foaled" label="วันเกิด">
          <input className={inputClass} id="h-foaled" type="date" value={h.foaled} onChange={(e) => set({ foaled: e.target.value })} />
        </Field>
        <Field id="h-sex" label="เพศ">
          <select id="h-sex" className={inputClass} value={h.sex ?? ""} onChange={(e) => set({ sex: (e.target.value || null) as Horse["sex"] })}>
            <option value="">ไม่ระบุ</option>
            <option value="M">ผู้ (Colt / Horse)</option>
            <option value="F">เมีย (Filly / Mare)</option>
            <option value="G">ตอน (Gelding)</option>
          </select>
        </Field>
        <Field id="h-coat" label="สีขน">
          <span className="flex items-center gap-1.5">
            <span className="size-5 flex-none border border-white" style={{ background: h.coat ? COATS[h.coat].color : "transparent" }} />
            <select id="h-coat" className={inputClass} value={h.coat ?? ""} onChange={(e) => set({ coat: (e.target.value || null) as Coat | null })}>
              <option value="">ไม่ระบุ</option>
              {(Object.keys(COATS) as Coat[]).map((c) => <option key={c} value={c}>{COATS[c].th}</option>)}
            </select>
          </span>
        </Field>
        {text("owner", "เจ้าของ")}
        {text("trainer", "เทรนเนอร์")}
      </Section>
      <Section title="Pedigree (3 รุ่น)">
        {text("sire", "พ่อพันธุ์ (Sire)")}
        {text("sireSire", "พ่อของพ่อ")}
        {text("sireDam", "แม่ของพ่อ")}
        {text("dam", "แม่พันธุ์ (Dam)")}
        {text("bms", "พ่อของแม่ (BMS)")}
        {text("damDam", "แม่ของแม่")}
        <span className={hintClass}>ใส่พ่อหรือแม่แล้วจะมีหน้า Pedigree ต่อจากหน้าข้อมูลม้า ฝั่งผู้พื้นฟ้าอ่อน ฝั่งเมียพื้นแดงอ่อน</span>
      </Section>
      <Section title={`สถิติ ${recordText(h.record)}`}>
        <div className="grid grid-cols-4 gap-1.5">
          {recIn("starts", "ลงแข่ง")}{recIn("first", "ที่ 1")}{recIn("second", "ที่ 2")}{recIn("third", "ที่ 3")}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button disabled={!h.races.length} onClick={() => set({ record: recordFromRaces(h) })}>นับจากผลงานด้านล่าง</Button>
          <span className={hintClass}>ไม่ติดอันดับ = ลงแข่ง − ที่ 1 − ที่ 2 − ที่ 3</span>
        </div>
        <Field id="h-earn" label="เงินรางวัล">
          <span className="grid grid-cols-[minmax(0,1fr)_76px] gap-1.5">
            <input className={inputClass} id="h-earn" type="number" min={0} value={h.earnings ?? ""} onChange={(e) => set({ earnings: e.target.value === "" ? null : Math.max(0, +e.target.value) })} />
            <select aria-label="สกุลเงินของม้า" className={inputClass} value={h.currency} onChange={(e) => set({ currency: e.target.value as Currency })}>
              {CODES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </span>
        </Field>
      </Section>
      <CareerEditor h={h} />
    </div>
  );
}
