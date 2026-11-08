/**
 * Tab "ม้า": what the intro shows of each horse. Its name, the pedigree on the runner intro (SIRE × DAM (by BMS)) and the owner's silks
 * (upload, pattern or none) on the runner intro and the STARTING GATE. The rest of a horse's profile (facts, pictures, career) is kept in
 * the data for broadcast compact, which edits and shows it.
 */
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { exportHorse, newId, type AppData } from "../lib/model";
import { HorseSchema, SilksSchema, SILKS_BODY, SILKS_MODES, SILKS_SLEEVES, silksModeOf, type SilksMode, type Silks, type Horse } from "../lib/horses";
import { update, useData } from "../lib/store";
import { useImage } from "../lib/images";
import { dropUnused, storeImage } from "../lib/imageStore";
import { cx } from "../lib/cx";
import { Button, buttonClass } from "../components/Button";
import { Field, inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { SilksSvg } from "../components/SilksSvg";
import { ExportPanel } from "./ExportPanel";

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

export function HorsesTab() {
  const d = useData();
  const [sel, setSel] = useState<string | null>(d.horses[0]?.id ?? null);
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
            {x.name}
          </button>
        );
      })}
      <button type="button" onClick={add} className="border border-dashed border-line px-2.5 py-1 text-[13px] text-ink-muted">+ เพิ่มม้า</button>
    </div>
  );
  if (!h) return <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-horses">{list}<p className={hintClass}>ยังไม่มีม้า กด "+ เพิ่มม้า" หรือนำเข้า JSON ที่มี "horses" ได้ที่แท็บภาพรวม</p></div>;

  const set = (patch: Partial<Horse>) => updateHorse(h.id, (x) => ({ ...x, ...patch }));
  const text = (k: "name" | "sire" | "dam" | "bms", label: string) => (
    <Field id={`h-${k}`} label={label}>
      <input className={inputClass} id={`h-${k}`} value={h[k]} onChange={(e) => set({ [k]: e.target.value })} />
    </Field>
  );
  const remove = async () => {
    const keys = [...h.photos.keys, h.silksImage];
    update((x) => ({ ...x, horses: x.horses.filter((y) => y.id !== h.id) }));
    dropUnused(keys);
    setConfirmDel(false);
    setSel(null);
  };

  return (
    <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-horses" aria-labelledby="tab-horses">
      {list}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>ม้าจับคู่กับตารางม้าด้วยชื่อ</span>
        <span className="flex flex-wrap gap-1.5">
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
      <Section title="ม้า">
        {text("name", "ชื่อม้า")}
        <span className={hintClass}>ชื่อต้องตรงกับชื่อในตารางม้าของการแข่งขัน (ไม่สนตัวพิมพ์เล็กใหญ่)</span>
      </Section>
      <Section title="Pedigree">
        {text("sire", "พ่อพันธุ์ (Sire)")}
        {text("dam", "แม่พันธุ์ (Dam)")}
        {text("bms", "พ่อของแม่ (BMS)")}
        <span className={hintClass}>ขึ้นในฉากแนะนำตัวเป็น SIRE × DAM (by BMS)</span>
      </Section>
      <SilksSection h={h} />
    </div>
  );
}
