/**
 * Tab "ม้า": what the intro shows of each horse. Its name, the pedigree on the runner intro (SIRE × DAM (by BMS)) and the owner's silks
 * (upload, pattern or none) on the runner intro and the STARTING GATE. The rest of a horse's profile (facts, pictures, career) is kept in
 * the data for broadcast compact, which edits and shows it.
 */
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { exportHorse, newId } from "../lib/model";
import { HorseSchema, type Horse } from "../lib/horses";
import { update, useData } from "../lib/store";
import { dropUnused } from "../lib/imageStore";
import { cx } from "@otamasing/broadcast-shared/lib/cx";
import { Button } from "@otamasing/broadcast-shared/components/Button";
import { Field, inputClass } from "../components/Field";
import { Section, hintClass } from "@otamasing/broadcast-shared/components/Section";
import { SilksPicker } from "@otamasing/broadcast-shared/components/SilksPicker";
import { ExportPanel } from "./ExportPanel";

const updateHorse = (id: string, fn: (h: Horse) => Horse) => update((d) => ({ ...d, horses: d.horses.map((h) => (h.id === id ? fn(h) : h)) }));

/** The owner's silks: one picture from the shared silks list (Figma "Silk"), or none. */
function SilksSection({ h }: { h: Horse }) {
  return (
    <Section title="ลายเสื้อเจ้าของ">
      <SilksPicker value={h.silks} onChange={(name: string) => updateHorse(h.id, (x) => ({ ...x, silks: name }))} selectClassName={inputClass} />
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
    const keys = h.photos.keys;
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
